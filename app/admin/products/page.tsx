// products page
"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Package, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ProductFormDialog } from "@/components/admin/products/product-form-dialog"
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog"
import { CompositeCard, type CompositeBase, type BaseImage, type Zone, type MultiZoneEntry } from "@/components/admin/composite-card"
import { ProductConstructorModal, type PrintConfig } from "@/components/admin/product-constructor-modal"
import { decodeLabel } from "@/app/admin/parameters/actions"

interface RawProduct {
  id: string
  name: string
  description: string | null
  price: number
  is_active: boolean
  is_popular: boolean
  is_previewable: boolean
  base_id: number
  print_id: number
  created_at: string
  base_image_id: number | null
  zone_id: number | null
  print_config: PrintConfig | null
  bases: { id: string; name: string; image_url: string | null } | null
  print_designs: { id: string; name: string; image_url: string | null } | null
}

interface PrintPlacement {
  zone_id: string
  print_id?: string
  x: number
  y: number
  scale: number
  is_mirrored: boolean
}

interface ProductWithImages {
  id: string
  name: string
  description: string | null
  price: number
  is_active: boolean
  is_popular: boolean
  is_previewable: boolean
  base_id: number
  print_id: number
  created_at: string
  base_image_id: number | null
  zone_id: number | null
  print_config: PrintConfig | null
  placements: Record<string, PrintPlacement>
  base: CompositeBase | null
  print: { id: string; name: string; image_url: string | null } | null
  multiZoneSelection?: MultiZoneEntry[]
  allowedPlacements: Array<{ imageId: string; zoneId: string }>
  initialPrimary: { imageId: string; zoneId: string } | null
  allBaseImages: BaseImage[]
  availableColors: Array<{ id: number; name: string; hex_code: string | null }>
  currentColorId: number | null
}

interface BaseForForm {
  id: string
  name: string
  description: string | null
  image_url: string | null
  price: number
}

interface PrintForForm {
  id: string
  name: string
  description: string | null
  image_url: string | null
  price: number | null
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithImages[]>([])
  const [bases, setBases] = useState<BaseForForm[]>([])
  const [prints, setPrints] = useState<PrintForForm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [constructorProduct, setConstructorProduct] = useState<ProductWithImages | null>(null)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const [{ data: productsData }, { data: basesData }, { data: printsData }] = await Promise.all([
      supabase
        .from("products")
        .select(`*, bases:base_id (id, name, image_url), print_designs:print_id (id, name, image_url)`)
        .order("created_at", { ascending: false }),
      supabase.from("bases").select("id, name, description, image_url, price").order("name"),
      supabase.from("print_designs").select("id, name, description, image_url, price").order("name"),
    ])

    const enriched: ProductWithImages[] = await Promise.all(
      ((productsData || []) as RawProduct[]).map(async (p) => {
        // Fetch placements for this product
        const { data: placementsData } = await supabase
          .from("product_print_placements")
          .select("zone_id, print_id, x, y, scale, is_mirrored")
          .eq("product_id", p.id)
        
        const placements: Record<string, PrintPlacement> = {}
        ;(placementsData || []).forEach((pl) => {
          placements[String(pl.zone_id)] = {
            zone_id: String(pl.zone_id),
            print_id: pl.print_id ? String(pl.print_id) : undefined,
            x: Number(pl.x),
            y: Number(pl.y),
            scale: Number(pl.scale),
            is_mirrored: pl.is_mirrored ?? false,
          }
        })

        if (!p.bases) return {
          ...p,
          base: null,
          print: p.print_designs,
          placements,
          allowedPlacements: [],
          initialPrimary: null,
          allBaseImages: [],
          availableColors: [],
          currentColorId: null,
        }

        const { data: rawImages } = await supabase
          .from("base_images")
          .select("id, url, color_id, sort_order")
          .eq("base_id", p.bases.id)
          .order("sort_order")

        const images: BaseImage[] = await Promise.all(
          (rawImages || []).map(async (img) => {
            const { data: zonesData } = await supabase
              .from("image_zones")
              .select("id, name, x, y, width, height, is_max")
              .eq("base_image_id", img.id)

            const decoded = decodeLabel(img.url)
            return {
              id: String(img.id),
              url: decoded.url,
              label: decoded.label || "Зображення",
              colorId: img.color_id ?? null,
              zones: (zonesData || []).map((z): Zone => ({
                id: String(z.id),
                name: z.name,
                x: Number(z.x),
                y: Number(z.y),
                width: Number(z.width),
                height: Number(z.height),
                is_max: z.is_max ?? false,
              })),
            }
          })
        )

        // Determine product color from base_image_id
        const productColorId = p.base_image_id
          ? images.find(img => img.id === String(p.base_image_id))?.colorId ?? null
          : null

        // Filter to only images of that color (or all if no color)
        const filteredImages = productColorId != null
          ? images.filter(img => img.colorId === productColorId)
          : images

        const base: CompositeBase = { id: String(p.bases.id), name: p.bases.name, images: filteredImages }

        // Fetch palette for the base so the modal can offer a color switch.
        const { data: baseColorsData } = await supabase
          .from("base_colors")
          .select("color_id, colors:color_id(id, name, hex_code)")
          .eq("base_id", p.bases.id)

        const availableColors = ((baseColorsData ?? []) as unknown as Array<{
          color_id: number
          colors: { id: number; name: string; hex_code: string | null } | null
        }>)
          .map((bc) => bc.colors)
          .filter((c): c is { id: number; name: string; hex_code: string | null } => c != null)

        // Determine the primary (image, zone) pair initially chosen in the generator.
        const primaryImageId = p.base_image_id != null ? String(p.base_image_id) : null
        const primaryZoneId = p.zone_id != null ? String(p.zone_id) : null
        const initialPrimary = primaryImageId && primaryZoneId
          ? { imageId: primaryImageId, zoneId: primaryZoneId }
          : null

        return {
          ...p,
          base_image_id: p.base_image_id ?? null,
          zone_id: p.zone_id ?? null,
          base,
          print: p.print_designs,
          placements,
          allowedPlacements: [],
          initialPrimary,
          allBaseImages: images,
          availableColors,
          currentColorId: productColorId,
        }
      })
    )

    // Build print image lookup for multi-zone rendering
    const printImageMap: Record<string, string> = {}
    for (const p of (printsData || [])) {
      if (p.image_url) printImageMap[String(p.id)] = p.image_url
    }

    // Construct multiZoneSelection + allowedPlacements per product
    for (const product of enriched) {
      if (!product.base || !product.placements) continue
      const entries: MultiZoneEntry[] = []
      const allowed: Array<{ imageId: string; zoneId: string }> = []
      for (const img of product.base.images) {
        for (const zone of img.zones) {
          const placement = product.placements[zone.id]
          if (!placement) continue
          const entry: MultiZoneEntry = { imageId: img.id, zoneId: zone.id }
          if (placement.print_id && placement.print_id !== product.print?.id) {
            entry.printId = placement.print_id
            entry.printImageUrl = printImageMap[placement.print_id]
          }
          entries.push(entry)
          allowed.push({ imageId: img.id, zoneId: zone.id })
        }
      }
      if (entries.length > 0) {
        product.multiZoneSelection = entries
      }
      // Fallback for legacy products without placements rows: use the primary pair.
      if (allowed.length === 0 && product.initialPrimary) {
        allowed.push(product.initialPrimary)
      }
      product.allowedPlacements = allowed
    }

    setProducts(enriched)
    setBases((basesData || []) as BaseForForm[])
    setPrints((printsData || []) as PrintForForm[])
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async () => {
    if (!deletingId) return
    await supabase.from("products").delete().eq("id", deletingId)
    setDeletingId(null)
    fetchData()
  }

  const handleTogglePopular = async (productId: string, current: boolean) => {
    const next = !current
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, is_popular: next } : p)))
    const { error } = await supabase
      .from("products")
      .update({ is_popular: next })
      .eq("id", productId)
    if (error) {
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, is_popular: current } : p)))
    }
  }

  const handleTogglePreviewable = async (
    productId: string,
    baseId: number,
    printId: number,
    current: boolean
  ) => {
    const next = !current
    const snapshot = products
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) return { ...p, is_previewable: next }
        if (next && p.base_id === baseId && p.print_id === printId) {
          return { ...p, is_previewable: false }
        }
        return p
      })
    )
    try {
      if (next) {
        // Turn siblings off first so the partial unique index stays happy.
        const { error: offErr } = await supabase
          .from("products")
          .update({ is_previewable: false })
          .eq("base_id", baseId)
          .eq("print_id", printId)
          .neq("id", productId)
        if (offErr) throw offErr
      }
      const { error: selfErr } = await supabase
        .from("products")
        .update({ is_previewable: next })
        .eq("id", productId)
      if (selfErr) throw selfErr
    } catch {
      setProducts(snapshot)
    }
  }

  // Update print_config in local state without full refetch
  const handleSaved = (productId: string, config: PrintConfig) => {
    setProducts((prev) =>
      prev.map((p) => p.id === productId ? { ...p, print_config: config } : p)
    )
    // Update the open constructor product too so it reflects the saved config
    setConstructorProduct((prev) =>
      prev && prev.id === productId ? { ...prev, print_config: config } : prev
    )
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.base?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.print?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Товари</h1>
          <p className="text-sm text-muted-foreground">Створюйте товари з основ та принтів</p>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-border bg-card px-6 py-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Пошук товарів..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-input bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-background p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="mb-4 h-12 w-12 text-primary/30" />
            <h3 className="mb-1 text-lg font-medium text-foreground">
              {searchQuery ? "Товарів не знайдено" : "Товари ще не створені"}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery
                ? "Спробуйте змінити пошуковий запит"
                : "Створіть перший товар або згенеруйте його у вкладці «Генерувати товар»"}
            </p>

          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              if (!product.base || !product.print) {
                return (
                  <div
                    key={product.id}
                    className="flex flex-col overflow-hidden rounded-xl border border-border bg-card"
                  >
                    <div className="flex aspect-square items-center justify-center bg-muted">
                      <Package className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-foreground">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.price} ₴</p>
                    </div>
                  </div>
                )
              }
              // Mirror storefront: all color-scoped images are navigable via
              // arrows/dots; each view renders its own zone placements with
              // per-zone prints. Start at the product's primary image.
              const primary = product.initialPrimary
              const primaryImageIndex = primary
                ? Math.max(0, product.base.images.findIndex((img) => img.id === primary.imageId))
                : 0
              const cardPrintConfig: PrintConfig = product.print_config ?? {
                x: 50,
                y: 50,
                scale: 50,
                flipped: false,
                zoneId: primary?.zoneId ?? null,
                imageIndex: primaryImageIndex,
              }
              const cardZoneSelection = primary
                ? { [primary.imageId]: primary.zoneId }
                : undefined
              return (
                <CompositeCard
                  key={product.id}
                  base={product.base}
                  print={product.print}
                  productName={product.name}
                  isActive={product.is_active}
                  isPopular={product.is_popular}
                  onTogglePopular={() => handleTogglePopular(product.id, product.is_popular)}
                  isPreviewable={product.is_previewable}
                  onTogglePreviewable={() =>
                    handleTogglePreviewable(product.id, product.base_id, product.print_id, product.is_previewable)
                  }
                  printConfig={cardPrintConfig}
                  placements={product.placements}
                  multiZoneSelection={product.multiZoneSelection}
                  zoneSelection={cardZoneSelection}
                  onClick={() => setConstructorProduct(product)}
                  onDelete={() => setDeletingId(product.id)}
                />
              )
            })}
          </div>
        )}
      </div>

      <ProductFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        bases={bases}
        prints={prints}
        onSuccess={fetchData}
      />

      <DeleteConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        title="Видалити товар?"
        description="Цей товар буде видалено назавжди. Цю дію неможливо скасувати."
      />

      {constructorProduct?.base && constructorProduct.print && (
        <ProductConstructorModal
          base={constructorProduct.base}
          print={constructorProduct.print}
          productId={constructorProduct.id}
          productName={constructorProduct.name}
          productDescription={constructorProduct.description}
          initialConfig={constructorProduct.print_config}
          allowedPlacements={constructorProduct.allowedPlacements}
          initialPrimary={constructorProduct.initialPrimary}
          allBaseImages={constructorProduct.allBaseImages}
          availableColors={constructorProduct.availableColors}
          initialColorId={constructorProduct.currentColorId}
          onClose={() => {
            setConstructorProduct(null)
            fetchData()
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
