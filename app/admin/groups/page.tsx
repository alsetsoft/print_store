"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Plus, Search, Trash2, Check, X, FolderTree, Package,
  CheckSquare, ArrowLeft, Pencil, XCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { decodeLabel } from "@/app/admin/parameters/actions"
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog"

interface BaseCategory {
  id: number
  name: string
}

interface BaseSubcategory {
  id: number
  name: string
  base_category_id: number
  base_categories?: { name: string }
}

interface PrintSubcategory {
  id: number
  name: string
  print_category_id: number
  print_categories?: { name: string }
}

interface Group {
  id: number
  name: string
  description: string | null
  base_category_id: number | null
  base_subcategory_id: number | null
  print_subcategory_id: number | null
  base_categories?: { id: number; name: string }
  base_subcategories?: { id: number; name: string }
  print_subcategories?: { id: number; name: string }
  product_count?: number
}

interface Base {
  id: number
  name: string
  image_url: string | null
  base_subcategory_id: number | null
  base_subcategories?: { id: number; name: string }
}

interface PrintDesign {
  id: number
  name: string
  image_url: string | null
  print_subcategory_id: number | null
  print_subcategories?: { id: number; name: string }
}

interface CompositeZone {
  id: string
  x: number
  y: number
  width: number
  height: number
}

interface CompositeImage {
  url: string
  zones: CompositeZone[]
}

interface ProductPlacement {
  zone_id: string
  x: number
  y: number
  scale: number
  is_mirrored: boolean
}

interface Product {
  id: number
  name: string
  base_id: number
  print_id: number
  bases?: { id: number; name: string; image_url: string | null; base_subcategory_id: number | null }
  print_designs?: { id: number; name: string; image_url: string | null; print_subcategory_id: number | null }
  compositeImage?: CompositeImage | null
  placements?: Record<string, ProductPlacement>
}

// Mini composite canvas preview
function ProductPreview({ product }: { product: Product }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const baseUrl = product.compositeImage?.url
  const printUrl = product.print_designs?.image_url
  const zones = product.compositeImage?.zones || []
  const placements = product.placements || {}

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !baseUrl) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const SIZE = 300
    canvas.width = SIZE
    canvas.height = SIZE

    const baseImg = new Image()
    baseImg.crossOrigin = "anonymous"
    baseImg.src = baseUrl

    baseImg.onload = () => {
      const scale = Math.min(SIZE / baseImg.naturalWidth, SIZE / baseImg.naturalHeight)
      const w = baseImg.naturalWidth * scale
      const h = baseImg.naturalHeight * scale
      const ox = (SIZE - w) / 2
      const oy = (SIZE - h) / 2

      ctx.clearRect(0, 0, SIZE, SIZE)
      ctx.drawImage(baseImg, ox, oy, w, h)

      if (!printUrl || zones.length === 0) return

      const zone = zones[0]
      const zx = ox + (zone.x / 100) * w
      const zy = oy + (zone.y / 100) * h
      const zw = (zone.width / 100) * w
      const zh = (zone.height / 100) * h

      const printImg = new Image()
      printImg.crossOrigin = "anonymous"
      printImg.src = printUrl

      printImg.onload = () => {
        const placement = placements[zone.id]
        if (placement) {
          const px = placement.x / 100
          const py = placement.y / 100
          const ps = placement.scale / 100
          const printRatio = printImg.naturalWidth / printImg.naturalHeight
          const zoneRatio = zw / zh
          let basePw: number, basePh: number
          if (printRatio > zoneRatio) { basePw = zw; basePh = zw / printRatio }
          else { basePh = zh; basePw = zh * printRatio }
          const pw = basePw * ps
          const ph = basePh * ps
          const finalX = zx + px * zw - pw / 2
          const finalY = zy + py * zh - ph / 2

          ctx.save()
          if (placement.is_mirrored) {
            ctx.translate(finalX + pw / 2, 0)
            ctx.scale(-1, 1)
            ctx.drawImage(printImg, -pw / 2, finalY, pw, ph)
          } else {
            ctx.drawImage(printImg, finalX, finalY, pw, ph)
          }
          ctx.restore()
        } else {
          const printRatio = printImg.naturalWidth / printImg.naturalHeight
          const zoneRatio = zw / zh
          let pw: number, ph: number
          if (printRatio > zoneRatio) { pw = zw; ph = zw / printRatio }
          else { ph = zh; pw = zh * printRatio }
          ctx.drawImage(printImg, zx + (zw - pw) / 2, zy + (zh - ph) / 2, pw, ph)
        }
      }
    }
  }, [baseUrl, printUrl, zones, placements])

  if (!baseUrl) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg border border-border bg-muted">
        <Package className="h-8 w-8 text-muted-foreground/40" />
      </div>
    )
  }

  return (
    <canvas ref={canvasRef} className="aspect-square w-full rounded-lg" />
  )
}

type ViewMode = "list" | "form"

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [baseCategories, setBaseCategories] = useState<BaseCategory[]>([])
  const [baseSubcategories, setBaseSubcategories] = useState<BaseSubcategory[]>([])
  const [printSubcategories, setPrintSubcategories] = useState<PrintSubcategory[]>([])
  const [allBases, setAllBases] = useState<Base[]>([])
  const [allPrints, setAllPrints] = useState<PrintDesign[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [formData, setFormData] = useState({ name: "", description: "", baseCategoryId: "", baseSubcategoryId: "" })

  // Product selection state
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [productSearch, setProductSearch] = useState("")

  // Filter state
  const [filterBaseSubcategoryId, setFilterBaseSubcategoryId] = useState("")
  const [filterPrintSubcategoryId, setFilterPrintSubcategoryId] = useState("")
  const [productTab, setProductTab] = useState<"all" | "selected">("all")

  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)

    const [
      { data: baseCats },
      { data: baseSubs },
      { data: printSubs },
      { data: groupsData },
      { data: basesData },
      { data: printsData },
      { data: productsData }
    ] = await Promise.all([
      supabase.from("base_categories").select("id, name").order("name"),
      supabase.from("base_subcategories").select("id, name, base_category_id, base_categories:base_category_id(name)").order("name"),
      supabase.from("print_subcategories").select("id, name, print_category_id, print_categories:print_category_id(name)").order("name"),
      supabase.from("groups").select(`id, name, description, base_category_id, base_subcategory_id, print_subcategory_id, base_categories:base_category_id(id, name), base_subcategories:base_subcategory_id(id, name), print_subcategories:print_subcategory_id(id, name)`).order("created_at", { ascending: false }),
      supabase.from("bases").select("id, name, image_url, base_subcategory_id, base_subcategories:base_subcategory_id(id, name)").order("name"),
      supabase.from("print_designs").select("id, name, image_url, print_subcategory_id, print_subcategories:print_subcategory_id(id, name)").order("name"),
      supabase.from("products").select(`id, name, base_id, print_id, bases:base_id(id, name, image_url, base_subcategory_id), print_designs:print_id(id, name, image_url, print_subcategory_id)`).order("created_at", { ascending: false })
    ])

    if (baseCats) setBaseCategories(baseCats as BaseCategory[])
    if (baseSubs) setBaseSubcategories(baseSubs as BaseSubcategory[])
    if (printSubs) setPrintSubcategories(printSubs as PrintSubcategory[])
    if (basesData) setAllBases(basesData as Base[])
    if (printsData) setAllPrints(printsData as PrintDesign[])

    // Enrich products with composite preview data
    const enrichedProducts: Product[] = await Promise.all(
      ((productsData || []) as Product[]).map(async (p) => {
        // Fetch placements
        const { data: placementsData } = await supabase
          .from("product_print_placements")
          .select("zone_id, x, y, scale, is_mirrored")
          .eq("product_id", p.id)

        const placements: Record<string, ProductPlacement> = {}
        ;(placementsData || []).forEach((pl) => {
          placements[String(pl.zone_id)] = {
            zone_id: String(pl.zone_id),
            x: Number(pl.x),
            y: Number(pl.y),
            scale: Number(pl.scale),
            is_mirrored: pl.is_mirrored ?? false,
          }
        })

        // Fetch first base image + its zones
        let compositeImage: CompositeImage | null = null
        if (p.bases) {
          const { data: rawImages } = await supabase
            .from("base_images")
            .select("id, url")
            .eq("base_id", p.bases.id)
            .order("sort_order")
            .limit(1)

          if (rawImages && rawImages.length > 0) {
            const img = rawImages[0]
            const { data: zonesData } = await supabase
              .from("image_zones")
              .select("id, x, y, width, height")
              .eq("base_image_id", img.id)

            const decoded = decodeLabel(img.url)
            compositeImage = {
              url: decoded.url,
              zones: (zonesData || []).map((z) => ({
                id: String(z.id),
                x: Number(z.x),
                y: Number(z.y),
                width: Number(z.width),
                height: Number(z.height),
              })),
            }
          }
        }

        return { ...p, compositeImage, placements }
      })
    )
    setAllProducts(enrichedProducts)

    if (groupsData) {
      const groupsWithCounts = await Promise.all(
        groupsData.map(async (g) => {
          const { count } = await supabase
            .from("product_groups")
            .select("*", { count: "exact", head: true })
            .eq("group_id", g.id)
          return { ...g, product_count: count || 0 }
        })
      )
      setGroups(groupsWithCounts as Group[])
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Switch to create form
  const openCreateForm = () => {
    setEditingGroup(null)
    setFormData({ name: "", description: "", baseCategoryId: "", baseSubcategoryId: "" })
    setSelectedProductIds([])
    setFilterBaseSubcategoryId("")
    setFilterPrintSubcategoryId("")
    setProductSearch("")
    setProductTab("all")
    setViewMode("form")
  }

  // Switch to edit form
  const openEditForm = async (group: Group) => {
    setEditingGroup(group)
    setFormData({
      name: group.name,
      description: group.description || "",
      baseCategoryId: group.base_category_id?.toString() || "",
      baseSubcategoryId: group.base_subcategory_id?.toString() || "",
    })
    setFilterBaseSubcategoryId(group.base_subcategory_id?.toString() || "")
    setFilterPrintSubcategoryId(group.print_subcategory_id?.toString() || "")
    setProductSearch("")
    setProductTab("all")

    const { data: productGroupsData } = await supabase
      .from("product_groups")
      .select("product_id")
      .eq("group_id", group.id)

    setSelectedProductIds(productGroupsData?.map((pg) => pg.product_id) || [])
    setViewMode("form")
  }

  const goBackToList = () => {
    setViewMode("list")
    setEditingGroup(null)
  }

  // Get filtered products
  const getFilteredProducts = () => {
    let filtered = allProducts

    const baseSubcatId = formData.baseSubcategoryId || filterBaseSubcategoryId
    const printSubcatId = filterPrintSubcategoryId

    if (baseSubcatId) {
      filtered = filtered.filter(p => p.bases?.base_subcategory_id === parseInt(baseSubcatId))
    }
    if (printSubcatId) {
      filtered = filtered.filter(p => p.print_designs?.print_subcategory_id === parseInt(printSubcatId))
    }

    if (productSearch.trim()) {
      const search = productSearch.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.bases?.name.toLowerCase().includes(search) ||
        p.print_designs?.name.toLowerCase().includes(search)
      )
    }

    return filtered
  }

  const filteredProducts = getFilteredProducts()

  const isBaseFilterDisabled = !!formData.baseSubcategoryId

  const toggleProductSelection = (productId: number) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const selectAllFilteredProducts = () => {
    const filteredIds = filteredProducts.map(p => p.id)
    const allSelected = filteredIds.every(id => selectedProductIds.includes(id))

    if (allSelected) {
      setSelectedProductIds(prev => prev.filter(id => !filteredIds.includes(id)))
    } else {
      setSelectedProductIds(prev => [...new Set([...prev, ...filteredIds])])
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return

    setSaving(true)

    if (editingGroup) {
      await supabase
        .from("groups")
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          base_category_id: formData.baseCategoryId ? parseInt(formData.baseCategoryId) : null,
          base_subcategory_id: formData.baseSubcategoryId ? parseInt(formData.baseSubcategoryId) : null,
          print_subcategory_id: null,
        })
        .eq("id", editingGroup.id)

      await supabase.from("product_groups").delete().eq("group_id", editingGroup.id)

      if (selectedProductIds.length > 0) {
        await supabase.from("product_groups").insert(
          selectedProductIds.map(productId => ({
            product_id: productId,
            group_id: editingGroup.id,
          }))
        )
      }
    } else {
      const { data: createdGroup, error } = await supabase
        .from("groups")
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          base_category_id: formData.baseCategoryId ? parseInt(formData.baseCategoryId) : null,
          base_subcategory_id: formData.baseSubcategoryId ? parseInt(formData.baseSubcategoryId) : null,
          print_subcategory_id: null,
        })
        .select()
        .single()

      if (!error && createdGroup && selectedProductIds.length > 0) {
        await supabase.from("product_groups").insert(
          selectedProductIds.map(productId => ({
            product_id: productId,
            group_id: createdGroup.id,
          }))
        )
      }
    }

    setSaving(false)
    setViewMode("list")
    setEditingGroup(null)
    fetchData()
  }

  const handleDelete = async () => {
    if (!deletingId) return
    await supabase.from("groups").delete().eq("id", deletingId)
    setDeletingId(null)
    fetchData()
  }

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── LIST VIEW ──
  if (viewMode === "list") {
    return (
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <FolderTree className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{"\u0413\u0440\u0443\u043F\u0438"}</h1>
              <p className="text-sm text-muted-foreground">{"\u0423\u043F\u0440\u0430\u0432\u043B\u0456\u043D\u043D\u044F \u0433\u0440\u0443\u043F\u0430\u043C\u0438 \u0442\u043E\u0432\u0430\u0440\u0456\u0432"}</p>
            </div>
          </div>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {"\u0421\u0442\u0432\u043E\u0440\u0438\u0442\u0438 \u0433\u0440\u0443\u043F\u0443"}
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-border bg-card px-6 py-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={"\u041F\u043E\u0448\u0443\u043A \u0433\u0440\u0443\u043F..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-input bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderTree className="mb-4 h-12 w-12 text-primary/30" />
              <h3 className="mb-1 text-lg font-medium text-foreground">{"\u041D\u0435\u043C\u0430\u0454 \u0433\u0440\u0443\u043F"}</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {searchQuery ? "\u0413\u0440\u0443\u043F \u0437\u0430 \u0437\u0430\u043F\u0438\u0442\u043E\u043C \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E" : "\u0421\u0442\u0432\u043E\u0440\u0456\u0442\u044C \u043F\u0435\u0440\u0448\u0443 \u0433\u0440\u0443\u043F\u0443 \u0442\u043E\u0432\u0430\u0440\u0456\u0432"}
              </p>
              {!searchQuery && (
                <button
                  onClick={openCreateForm}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  <Plus className="h-4 w-4" />
                  {"\u0421\u0442\u0432\u043E\u0440\u0438\u0442\u0438 \u0433\u0440\u0443\u043F\u0443"}
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => openEditForm(group)}
                  className="cursor-pointer rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-lg hover:border-primary/40"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{group.name}</h3>
                      {group.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeletingId(group.id) }}
                      className="ml-2 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-sm">
                    {group.base_subcategories ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Package className="h-4 w-4 shrink-0" />
                        <span className="truncate">{"\u041E\u0441\u043D\u043E\u0432\u0430"}: {group.base_subcategories.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground/50">
                        <Package className="h-4 w-4 shrink-0" />
                        <span className="italic">{"\u0411\u0435\u0437 \u0444\u0456\u043B\u044C\u0442\u0440\u0443 \u043E\u0441\u043D\u043E\u0432\u0438"}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
                    <FolderTree className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">{group.product_count} {"\u0442\u043E\u0432\u0430\u0440\u0456\u0432"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DeleteConfirmDialog
          open={!!deletingId}
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={"\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0433\u0440\u0443\u043F\u0443?"}
          description={"\u0426\u044E \u0433\u0440\u0443\u043F\u0443 \u0431\u0443\u0434\u0435 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E \u043D\u0430\u0437\u0430\u0432\u0436\u0434\u0438. \u0426\u044E \u0434\u0456\u044E \u043D\u0435\u043C\u043E\u0436\u043B\u0438\u0432\u043E \u0441\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438."}
        />
      </div>
    )
  }

  // ── FORM VIEW (Create / Edit) — 2-panel layout ──

  // Product card renderer (shared between tabs)
  const renderProductCard = (product: Product, mode: "all" | "selected") => {
    const isSelected = selectedProductIds.includes(product.id)
    if (mode === "selected") {
      return (
        <div key={product.id} className="group relative rounded-xl border border-primary/30 bg-primary/5 p-2">
          <button
            onClick={() => toggleProductSelection(product.id)}
            className="absolute top-1.5 right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-background border border-border text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all shadow-sm"
          >
            <X className="h-3 w-3" />
          </button>
          <div className="mb-2 overflow-hidden rounded-lg border border-border bg-muted">
            <ProductPreview product={product} />
          </div>
          <div className="px-0.5">
            <p className="text-xs font-medium text-foreground leading-tight line-clamp-2">{product.name}</p>
          </div>
        </div>
      )
    }
    return (
      <div
        key={product.id}
        onClick={() => toggleProductSelection(product.id)}
        className={cn(
          "group relative cursor-pointer rounded-xl border p-2 transition-all",
          isSelected
            ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20"
            : "border-border hover:border-primary/40 hover:shadow-sm"
        )}
      >
        <div className={cn(
          "absolute top-1.5 left-1.5 z-10 flex h-5 w-5 items-center justify-center rounded border transition-all",
          isSelected
            ? "border-primary bg-primary shadow-sm"
            : "border-input bg-background opacity-0 group-hover:opacity-100"
        )}>
          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
        <div className="mb-2 overflow-hidden rounded-lg border border-border bg-muted">
          <ProductPreview product={product} />
        </div>
        <div className="px-0.5">
          <p className="text-xs font-medium text-foreground leading-tight line-clamp-2">{product.name}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-5 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={goBackToList}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            editingGroup ? "bg-amber-500" : "bg-primary"
          )}>
            {editingGroup
              ? <Pencil className="h-4 w-4 text-white" />
              : <Plus className="h-4 w-4 text-primary-foreground" />
            }
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground leading-tight">
              {editingGroup ? "\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 \u0433\u0440\u0443\u043F\u0443" : "\u0421\u0442\u0432\u043E\u0440\u0438\u0442\u0438 \u0433\u0440\u0443\u043F\u0443"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">
            {selectedProductIds.length} {"\u0442\u043E\u0432\u0430\u0440\u0456\u0432 \u043E\u0431\u0440\u0430\u043D\u043E"}
          </span>
          <button
            onClick={goBackToList}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            {"\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438"}
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.name.trim() || saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50 transition-colors hover:bg-primary/90"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                {"\u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043D\u044F..."}
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {editingGroup ? "\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438" : "\u0421\u0442\u0432\u043E\u0440\u0438\u0442\u0438"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2-panel layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar — form fields */}
        <div className="w-72 shrink-0 border-r border-border bg-card overflow-auto">
          <div className="p-4 space-y-4">
            {/* Name */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{"\u041D\u0430\u0437\u0432\u0430 \u0433\u0440\u0443\u043F\u0438"} *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={"\u0412\u0432\u0435\u0434\u0456\u0442\u044C \u043D\u0430\u0437\u0432\u0443..."}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{"\u041E\u043F\u0438\u0441"}</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={"\u0412\u0432\u0435\u0434\u0456\u0442\u044C \u043E\u043F\u0438\u0441..."}
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{"\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u044F"}</p>

              {/* Base category */}
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{"\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u044F \u043E\u0441\u043D\u043E\u0432\u0438"}</label>
                <select
                  value={formData.baseCategoryId}
                  onChange={(e) => {
                    setFormData({ ...formData, baseCategoryId: e.target.value, baseSubcategoryId: "" })
                    setFilterBaseSubcategoryId("")
                  }}
                  className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">{"\u0411\u0435\u0437 \u043E\u0431\u043C\u0435\u0436\u0435\u043D\u043D\u044F"}</option>
                  {baseCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Base subcategory — filtered by selected category */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{"\u041F\u0456\u0434\u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0456\u044F \u043E\u0441\u043D\u043E\u0432\u0438"}</label>
                <select
                  value={formData.baseSubcategoryId}
                  onChange={(e) => {
                    setFormData({ ...formData, baseSubcategoryId: e.target.value })
                    if (e.target.value) setFilterBaseSubcategoryId(e.target.value)
                  }}
                  disabled={!formData.baseCategoryId}
                  className={cn(
                    "w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                    !formData.baseCategoryId && "opacity-60 cursor-not-allowed bg-muted"
                  )}
                >
                  <option value="">{"\u0411\u0435\u0437 \u043E\u0431\u043C\u0435\u0436\u0435\u043D\u043D\u044F"}</option>
                  {baseSubcategories
                    .filter((sub) => formData.baseCategoryId ? sub.base_category_id === parseInt(formData.baseCategoryId) : true)
                    .map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                </select>
              </div>
            </div>

            {/* Selected summary */}
            {selectedProductIds.length > 0 && (
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{"\u041E\u0431\u0440\u0430\u043D\u0456"}</p>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {selectedProductIds.length}
                  </span>
                </div>
                <button
                  onClick={() => setProductTab("selected")}
                  className="w-full rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  {"\u041F\u0435\u0440\u0435\u0433\u043B\u044F\u043D\u0443\u0442\u0438 \u043E\u0431\u0440\u0430\u043D\u0456"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right panel — products */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-2 bg-card shrink-0">
            {/* Tabs */}
            <button
              onClick={() => setProductTab("all")}
              className={cn(
                "relative px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                productTab === "all"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {"\u0412\u0441\u0456"} ({allProducts.length})
            </button>
            <button
              onClick={() => setProductTab("selected")}
              className={cn(
                "relative px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                productTab === "selected"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {"\u041E\u0431\u0440\u0430\u043D\u0456"} ({selectedProductIds.length})
            </button>

            <div className="w-px h-5 bg-border mx-1" />

            {/* Filters — only for "all" tab */}
            {productTab === "all" && (
              <>
                <div className="relative">
                  <select
                    value={isBaseFilterDisabled ? formData.baseSubcategoryId : filterBaseSubcategoryId}
                    onChange={(e) => setFilterBaseSubcategoryId(e.target.value)}
                    disabled={isBaseFilterDisabled}
                    className={cn(
                      "rounded-lg border border-input bg-background px-2.5 py-1.5 pr-7 text-xs focus:border-primary focus:outline-none",
                      isBaseFilterDisabled && "opacity-60 cursor-not-allowed bg-muted"
                    )}
                  >
                    <option value="">{"\u0412\u0441\u0456 \u043E\u0441\u043D\u043E\u0432\u0438"}</option>
                    {baseSubcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.base_categories?.name ? `${sub.base_categories.name} / ` : ""}{sub.name}
                      </option>
                    ))}
                  </select>
                  {isBaseFilterDisabled && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>

                <div className="relative">
                  <select
                    value={filterPrintSubcategoryId}
                    onChange={(e) => setFilterPrintSubcategoryId(e.target.value)}
                    className="rounded-lg border border-input bg-background px-2.5 py-1.5 pr-7 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="">{"\u0412\u0441\u0456 \u043F\u0440\u0438\u043D\u0442\u0438"}</option>
                    {printSubcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.print_categories?.name ? `${sub.print_categories.name} / ` : ""}{sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="flex-1" />

            {/* Actions */}
            {productTab === "all" && filteredProducts.length > 0 && (
              <button
                onClick={selectAllFilteredProducts}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                {filteredProducts.every(p => selectedProductIds.includes(p.id)) ? "\u0417\u043D\u044F\u0442\u0438 \u0432\u0441\u0435" : "\u041E\u0431\u0440\u0430\u0442\u0438 \u0432\u0441\u0435"}
              </button>
            )}
            {productTab === "selected" && selectedProductIds.length > 0 && (
              <button
                onClick={() => setSelectedProductIds([])}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                {"\u0417\u043D\u044F\u0442\u0438 \u0432\u0441\u0456"}
              </button>
            )}

            {/* Search */}
            {productTab === "all" && (
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={"\u041F\u043E\u0448\u0443\u043A..."}
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-44 rounded-lg border border-input bg-background py-1.5 pl-7 pr-3 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {productSearch && (
                  <button
                    onClick={() => setProductSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Product grid — fills remaining space */}
          <div className="flex-1 overflow-auto p-4">
            {productTab === "all" && (
              <>
                {filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Package className="mb-3 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      {allProducts.length === 0
                        ? "\u041D\u0435\u043C\u0430\u0454 \u0442\u043E\u0432\u0430\u0440\u0456\u0432 \u0443 \u0431\u0430\u0437\u0456"
                        : "\u041D\u0435\u043C\u0430\u0454 \u0442\u043E\u0432\u0430\u0440\u0456\u0432 \u0437\u0430 \u043E\u0431\u0440\u0430\u043D\u0438\u043C\u0438 \u0444\u0456\u043B\u044C\u0442\u0440\u0430\u043C\u0438"
                      }
                    </p>
                    {allProducts.length > 0 && (
                      <button
                        onClick={() => { setFilterBaseSubcategoryId(""); setFilterPrintSubcategoryId(""); setProductSearch("") }}
                        className="mt-3 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                        {"\u0421\u043A\u0438\u043D\u0443\u0442\u0438 \u0444\u0456\u043B\u044C\u0442\u0440\u0438"}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-3 grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                    {filteredProducts.map((product) => renderProductCard(product, "all"))}
                  </div>
                )}
              </>
            )}

            {productTab === "selected" && (
              <>
                {selectedProductIds.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <CheckSquare className="mb-3 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">{"\u0416\u043E\u0434\u043D\u043E\u0433\u043E \u0442\u043E\u0432\u0430\u0440\u0443 \u043D\u0435 \u043E\u0431\u0440\u0430\u043D\u043E"}</p>
                    <button
                      onClick={() => setProductTab("all")}
                      className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {"\u041E\u0431\u0440\u0430\u0442\u0438 \u0442\u043E\u0432\u0430\u0440\u0438"}
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3 grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                    {allProducts
                      .filter(p => selectedProductIds.includes(p.id))
                      .map((product) => renderProductCard(product, "selected"))
                    }
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
