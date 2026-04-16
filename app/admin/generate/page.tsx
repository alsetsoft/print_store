"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Wand2, Search, CheckSquare, Loader2, Layers, Package, Plus, Check, Square, X, ChevronDown
} from "lucide-react"
import { decodeLabel } from "@/app/admin/parameters/actions"
import { cn } from "@/lib/utils"
import { generateProductTexts, type ProductInput } from "@/app/admin/products/actions"
import {
  CompositeCard,
  type CompositeBase,
  type CompositePrint,
  type ZoneSelection,
  type BaseImage,
  type Zone,
  type MultiZoneEntry,
} from "@/components/admin/composite-card"

// ─── Local types (Base / Print extend shared types) ──────────────────────────

interface Base extends CompositeBase {
  description: string | null
  sku: string | null
  price: number | null
  image_url: string | null
  base_categories: { name: string } | null
  colors: { id: number; name: string; hex_code: string | null }[]
}

interface Print extends CompositePrint {
  description: string | null
  print_categories: { name: string } | null
}

// ─── Zone mapping helper ────────────────────────────────────────────────────

function mapEntriesToColor(
  base: Base,
  entries: MultiZoneEntry[],
  fromColorId: number,
  toColorId: number
): MultiZoneEntry[] {
  const fromImages = base.images.filter((img) => img.colorId === fromColorId)
  const toImages = base.images.filter((img) => img.colorId === toColorId)

  return entries.map((entry) => {
    const srcIdx = fromImages.findIndex((img) => img.id === entry.imageId)
    const targetImg = toImages[srcIdx] ?? toImages[0]
    if (!targetImg) return entry

    const srcImage = fromImages[srcIdx]
    const zoneIdx = srcImage?.zones.findIndex((z) => z.id === entry.zoneId) ?? 0
    const targetZone = targetImg.zones[zoneIdx] ?? targetImg.zones[0]
    if (!targetZone) return entry

    return { ...entry, imageId: targetImg.id, zoneId: targetZone.id }
  })
}

// ─── Print Selector Dropdown ─────────────────────────────────────────────────

function PrintSelectorDropdown({
  prints,
  selectedPrintId,
  onSelect,
}: {
  prints: Print[]
  selectedPrintId?: string
  onSelect: (printId: string, printImageUrl: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setSelectedCategory(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const categories = Array.from(
    new Set(prints.map((p) => p.print_categories?.name).filter(Boolean))
  ) as string[]

  const filtered = prints.filter((p) => {
    const q = search.toLowerCase()
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.print_categories?.name?.toLowerCase().includes(q) ?? false)
    const matchesCategory = !selectedCategory || p.print_categories?.name === selectedCategory
    return matchesSearch && matchesCategory
  })
  const selected = prints.find((p) => p.id === selectedPrintId)

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const panelW = 384 // w-96
      const panelH = 400
      let left = rect.left
      let top = rect.bottom + 4
      // Keep panel within viewport
      if (left + panelW > window.innerWidth) left = window.innerWidth - panelW - 8
      if (left < 8) left = 8
      if (top + panelH > window.innerHeight) top = rect.top - panelH - 4
      setPos({ top, left })
    }
    setOpen(!open)
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition-all",
          selectedPrintId
            ? "border-primary bg-primary/5 text-foreground"
            : "border-amber-300 bg-amber-50 text-amber-700"
        )}
      >
        {selected ? (
          <>
            {selected.image_url && (
              <img src={selected.image_url} alt="" className="h-5 w-5 rounded object-cover" />
            )}
            <span className="max-w-[100px] truncate">{selected.name}</span>
          </>
        ) : (
          "\u041E\u0431\u0440\u0430\u0442\u0438 \u043F\u0440\u0438\u043D\u0442"
        )}
        <ChevronDown className="h-3 w-3 shrink-0" />
      </button>
      {open && (
        <div
          ref={panelRef}
          className="fixed z-[100] w-96 rounded-lg border border-border bg-card shadow-xl"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={"\u041F\u043E\u0448\u0443\u043A..."}
                className="w-full rounded border border-input bg-background py-1.5 pl-8 pr-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                autoFocus
              />
            </div>
          </div>
          {categories.length > 0 && (
            <div className="flex gap-1 overflow-x-auto px-2 pb-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-xs transition-colors",
                  !selectedCategory
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {"\u0412\u0441\u0456"}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs transition-colors",
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
          <div className="max-h-72 overflow-y-auto px-1 pb-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">{"\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E"}</p>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelect(p.id, p.image_url || "")
                      setOpen(false)
                      setSearch("")
                      setSelectedCategory(null)
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted",
                      p.id === selectedPrintId && "bg-primary/10"
                    )}
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                      {p.image_url
                        ? <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                        : <Layers className="m-auto mt-3 h-5 w-5 text-muted-foreground" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate">{p.name}</span>
                      {p.print_categories?.name && (
                        <span className="block truncate text-xs text-muted-foreground">{p.print_categories.name}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Zone Picker Modal ────────────────────────────────────────────────────────

function ZonePickerModal({
  base,
  entries,
  prints,
  initialColorIds,
  onSave,
  onClose,
}: {
  base: Base
  entries: MultiZoneEntry[]
  prints: Print[]
  initialColorIds: number[]
  onSave: (entries: MultiZoneEntry[], colorIds: number[]) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState<MultiZoneEntry[]>([...entries])
  const [selectedColorIds, setSelectedColorIds] = useState<number[]>(
    initialColorIds.length > 0
      ? initialColorIds
      : base.colors.length > 0
        ? [base.colors[0].id]
        : []
  )

  const prevDisplayColorIdRef = useRef<number | null>(selectedColorIds[0] ?? null)

  // Display color = first selected color (used for filtering images)
  const displayColorId = selectedColorIds[0] ?? null

  // Filter images by display color
  const visibleImages = displayColorId != null
    ? base.images.filter((img) => img.colorId === displayColorId)
    : base.images.filter((img) => img.colorId == null)

  // Auto-map zones when display color changes
  useEffect(() => {
    const prevColorId = prevDisplayColorIdRef.current
    if (prevColorId !== displayColorId && prevColorId != null && displayColorId != null && local.length > 0) {
      setLocal((prev) => mapEntriesToColor(base, prev, prevColorId, displayColorId))
    }
    prevDisplayColorIdRef.current = displayColorId
  }, [displayColorId, base])

  // Build a lookup: zoneId → entry index
  const selectedZoneIds = new Set(local.map((e) => e.zoneId))

  // Find zone+image info by zoneId
  const findZoneInfo = (zoneId: string) => {
    for (const img of visibleImages) {
      const zone = img.zones.find((z) => z.id === zoneId)
      if (zone) return { image: img, zone }
    }
    // Also check all images as fallback
    for (const img of base.images) {
      const zone = img.zones.find((z) => z.id === zoneId)
      if (zone) return { image: img, zone }
    }
    return null
  }

  const toggleColor = (colorId: number) => {
    setSelectedColorIds((prev) => {
      if (prev.includes(colorId)) {
        return prev.length > 1 ? prev.filter((id) => id !== colorId) : prev
      }
      return [...prev, colorId]
    })
  }

  const toggleZone = (imageId: string, zoneId: string) => {
    setLocal((prev) => {
      const idx = prev.findIndex((e) => e.zoneId === zoneId)
      if (idx >= 0) {
        // Remove this zone
        const next = prev.filter((_, i) => i !== idx)
        // If we removed index 0, make the new first entry primary (clear its printId)
        if (idx === 0 && next.length > 0) {
          next[0] = { ...next[0], printId: undefined, printImageUrl: undefined }
        }
        return next
      } else {
        // Add zone
        const isPrimary = prev.length === 0
        return [...prev, {
          imageId,
          zoneId,
          printId: isPrimary ? undefined : undefined,
          printImageUrl: isPrimary ? undefined : undefined,
        }]
      }
    })
  }

  const updateEntryPrint = (zoneId: string, printId: string, printImageUrl: string) => {
    setLocal((prev) => prev.map((e) =>
      e.zoneId === zoneId ? { ...e, printId, printImageUrl } : e
    ))
  }

  const removeEntry = (zoneId: string) => {
    setLocal((prev) => {
      const idx = prev.findIndex((e) => e.zoneId === zoneId)
      if (idx < 0) return prev
      const next = prev.filter((_, i) => i !== idx)
      if (idx === 0 && next.length > 0) {
        next[0] = { ...next[0], printId: undefined, printImageUrl: undefined }
      }
      return next
    })
  }

  // Validation: additional zones (index 1+) must have printId
  const isValid = local.every((e, i) => i === 0 || !!e.printId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-semibold text-foreground">{base.name}</h2>
            <p className="text-sm text-muted-foreground">{"\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u0437\u043E\u043D\u0438 \u0434\u043B\u044F \u0440\u043E\u0437\u043C\u0456\u0449\u0435\u043D\u043D\u044F \u043F\u0440\u0438\u043D\u0442\u0456\u0432 (\u043C\u043E\u0436\u043D\u0430 \u043A\u0456\u043B\u044C\u043A\u0430)"}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
          >
            {"\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438"}
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">
          {/* Color selector */}
          {base.colors.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 text-sm font-medium text-foreground">{"\u041A\u043E\u043B\u044C\u043E\u0440\u0438"}</p>
              <div className="flex flex-wrap gap-2">
                {base.colors.map((color) => {
                  const isActive = selectedColorIds.includes(color.id)
                  return (
                    <button
                      key={color.id}
                      onClick={() => toggleColor(color.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm transition-all",
                        isActive
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border text-foreground hover:border-primary/50"
                      )}
                    >
                      {color.hex_code && (
                        <span
                          className="h-4 w-4 rounded-full border border-border"
                          style={{ backgroundColor: color.hex_code }}
                        />
                      )}
                      {color.name}
                      {isActive && <Check className="h-3.5 w-3.5" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {visibleImages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {"\u041D\u0435\u043C\u0430\u0454 \u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u044C \u0434\u043B\u044F \u0446\u0456\u0454\u0457 \u043E\u0441\u043D\u043E\u0432\u0438"}
            </p>
          ) : (
            <div className="space-y-6">
              {visibleImages.map((img) => (
                <div key={img.id}>
                  <p className="mb-2 text-sm font-medium text-foreground">{img.label}</p>
                  <div className="flex gap-4">
                    <div className="relative h-52 w-52 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                      <img src={img.url} alt={img.label} className="h-full w-full object-cover" />
                      {img.zones.map((z) => (
                        <div
                          key={z.id}
                          onClick={() => toggleZone(img.id, z.id)}
                          className={cn(
                            "absolute cursor-pointer border-2 transition-all",
                            selectedZoneIds.has(z.id)
                              ? "border-primary bg-primary/30"
                              : "border-primary/50 bg-primary/10 hover:bg-primary/20"
                          )}
                          style={{
                            left: `${z.x}%`,
                            top: `${z.y}%`,
                            width: `${z.width}%`,
                            height: `${z.height}%`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex flex-col gap-2">
                      {img.zones.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{"\u0417\u043E\u043D\u0438 \u043D\u0435 \u0434\u043E\u0434\u0430\u043D\u0456"}</p>
                      ) : (
                        img.zones.map((z) => {
                          const entryIdx = local.findIndex((e) => e.zoneId === z.id)
                          const isSelected = entryIdx >= 0
                          return (
                            <button
                              key={z.id}
                              onClick={() => toggleZone(img.id, z.id)}
                              className={cn(
                                "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-left text-sm transition-all",
                                isSelected
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-foreground hover:border-primary/50"
                              )}
                            >
                              {isSelected
                                ? <CheckSquare className="h-4 w-4 shrink-0" />
                                : <Square className="h-4 w-4 shrink-0" />
                              }
                              {z.name || `\u0417\u043E\u043D\u0430 ${z.id}`}
                              {isSelected && (
                                <span className="ml-auto rounded bg-primary/20 px-1.5 py-0.5 text-xs font-medium">
                                  #{local.findIndex((e) => e.zoneId === z.id) + 1}
                                </span>
                              )}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected zones summary */}
          {local.length > 0 && (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
              <h3 className="mb-2 text-sm font-semibold text-foreground">{"\u041E\u0431\u0440\u0430\u043D\u0456 \u0437\u043E\u043D\u0438"}</h3>
              <div className={cn("gap-2", local.length > 2 ? "grid grid-cols-2" : "space-y-2")}>
                {local.map((entry, i) => {
                  const info = findZoneInfo(entry.zoneId)
                  if (!info) return null
                  return (
                    <div key={entry.zoneId} className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      <span className="shrink truncate text-sm font-medium text-foreground">
                        {info.zone.name || `\u0417\u043E\u043D\u0430 ${info.zone.id}`}
                      </span>
                      {i === 0 ? (
                        <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {"\u041E\u0441\u043D\u043E\u0432\u043D\u0438\u0439 \u043F\u0440\u0438\u043D\u0442"}
                        </span>
                      ) : (
                        <PrintSelectorDropdown
                          prints={prints}
                          selectedPrintId={entry.printId}
                          onSelect={(printId, printImageUrl) =>
                            updateEntryPrint(entry.zoneId, printId, printImageUrl)
                          }
                        />
                      )}
                      <button
                        onClick={() => removeEntry(entry.zoneId)}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {local.length === 0
              ? "\u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \u043D\u0430 \u0437\u043E\u043D\u0443 \u0449\u043E\u0431 \u0434\u043E\u0434\u0430\u0442\u0438"
              : `${local.length} \u0437\u043E\u043D${local.length === 1 ? "\u0430" : local.length < 5 ? "\u0438" : ""} \u043E\u0431\u0440\u0430\u043D\u043E`}
            {selectedColorIds.length > 0 && ` \u2022 ${selectedColorIds.length} \u043A\u043E\u043B\u044C\u043E\u0440${selectedColorIds.length === 1 ? "" : selectedColorIds.length < 5 ? "\u0438" : "\u0456\u0432"}`}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
            >
              {"\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438"}
            </button>
            <button
              onClick={() => { onSave(local, selectedColorIds); onClose() }}
              disabled={!isValid}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {"\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GeneratePage() {
  const [bases, setBases] = useState<Base[]>([])
  const [prints, setPrints] = useState<Print[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState<number | null>(null)

  const [selectedBaseIds, setSelectedBaseIds] = useState<Set<string>>(new Set())
  const [selectedPrintIds, setSelectedPrintIds] = useState<Set<string>>(new Set())

  const [zoneSelections, setZoneSelections] = useState<Record<string, MultiZoneEntry[]>>({})
  const [colorSelections, setColorSelections] = useState<Record<string, number[]>>({})
  const [zonePickerBase, setZonePickerBase] = useState<Base | null>(null)
  const [rejectedKeys, setRejectedKeys] = useState<Set<string>>(new Set())

  const [baseSearch, setBaseSearch] = useState("")
  const [printSearch, setPrintSearch] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const [{ data: basesData }, { data: printsData }] = await Promise.all([
      supabase
        .from("bases")
        .select(`id, name, description, sku, price, image_url, base_categories:base_category_id(name), base_colors(color_id, colors:color_id(id, name, hex_code)), base_images(id, url, color_id, sort_order)`)
        .order("name"),
      supabase
        .from("print_designs")
        .select("id, name, description, image_url, price, print_categories:print_category_id(name)")
        .order("name"),
    ])

    const basesWithImages: Base[] = await Promise.all(
      (basesData || []).map(async (b) => {
        const rawImages = ((b.base_images as { id: number; url: string; color_id: number | null; sort_order: number | null }[]) || [])
          .sort((a, c) => (a.sort_order ?? 0) - (c.sort_order ?? 0))

        const images: BaseImage[] = await Promise.all(
          rawImages.map(async (img) => {
            const { data: zonesData } = await supabase
              .from("image_zones")
              .select("id, name, x, y, width, height, is_max, price")
              .eq("base_image_id", img.id)

            const decoded = decodeLabel(img.url)
            return {
              id: String(img.id),
              url: decoded.url,
              label: decoded.label || "Зображення",
              colorId: img.color_id,
              zones: (zonesData || []).map((z) => ({
                id: String(z.id),
                name: z.name,
                x: Number(z.x),
                y: Number(z.y),
                width: Number(z.width),
                height: Number(z.height),
                is_max: z.is_max ?? false,
                price: Number(z.price) || 0,
              })),
            }
          })
        )

        // Parse base_colors
        const rawColors = (b.base_colors as unknown as { color_id: number; colors: { id: number; name: string; hex_code: string | null } | null }[]) || []
        const colors = rawColors
          .filter((bc) => bc.colors != null)
          .map((bc) => bc.colors!)

        return {
          id: String(b.id),
          name: b.name,
          description: (b as Record<string, unknown>).description as string | null ?? null,
          sku: b.sku,
          price: b.price as number | null,
          image_url: b.image_url,
          images,
          colors,
          base_categories: b.base_categories as unknown as { name: string } | null,
        }
      })
    )

    setBases(basesWithImages)
    setPrints(
      (printsData || []).map((p) => ({
        id: String(p.id),
        name: p.name,
        description: (p as Record<string, unknown>).description as string | null ?? null,
        image_url: p.image_url,
        price: p.price as number | null,
        print_categories: p.print_categories as unknown as { name: string } | null,
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleBase = (id: string) => setSelectedBaseIds((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const togglePrint = (id: string) => setSelectedPrintIds((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const filteredBases = bases.filter((b) =>
    b.name.toLowerCase().includes(baseSearch.toLowerCase()) ||
    (b.sku ?? "").toLowerCase().includes(baseSearch.toLowerCase())
  )

  const filteredPrints = prints.filter((p) =>
    p.name.toLowerCase().includes(printSearch.toLowerCase()) ||
    (p.print_categories?.name ?? "").toLowerCase().includes(printSearch.toLowerCase())
  )

  const toggleAllBases = () => {
    const ids = filteredBases.map((b) => b.id)
    const allSelected = ids.every((id) => selectedBaseIds.has(id))
    setSelectedBaseIds((prev) => {
      const next = new Set(prev)
      if (allSelected) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  const toggleAllPrints = () => {
    const ids = filteredPrints.map((p) => p.id)
    const allSelected = ids.every((id) => selectedPrintIds.has(id))
    setSelectedPrintIds((prev) => {
      const next = new Set(prev)
      if (allSelected) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  const selectedBases = bases.filter((b) => selectedBaseIds.has(b.id))
  const selectedPrints = prints.filter((p) => selectedPrintIds.has(p.id))

  // Build combinations with color dimension
  type Combination = { base: Base; print: Print; colorId: number | null; key: string }
  const allCombinations: Combination[] = []
  for (const base of selectedBases) {
    const colors = colorSelections[base.id]
    const colorVariants: (number | null)[] = colors?.length > 0 ? colors : [null]
    for (const print of selectedPrints) {
      for (const colorId of colorVariants) {
        allCombinations.push({ base, print, colorId, key: `${base.id}-${print.id}-${colorId ?? 'def'}` })
      }
    }
  }
  const activeCombinations = allCombinations.filter((c) => !rejectedKeys.has(c.key))

  const rejectCombo = (key: string) => setRejectedKeys((prev) => new Set([...prev, key]))

  const handleSave = async () => {
    if (activeCombinations.length === 0) return
    setSaving(true)
    setSavedCount(null)
    try {
      // Generate AI names and descriptions for all combinations
      const aiInputs: ProductInput[] = activeCombinations.map(({ base, print }) => ({
        baseName: base.name,
        baseDescription: base.description,
        printName: print.name,
        printDescription: print.description,
      }))
      const generatedTexts = await generateProductTexts(aiInputs)

      const supabase = createClient()
      let savedTotal = 0

      for (let comboIdx = 0; comboIdx < activeCombinations.length; comboIdx++) {
        const { base, print, colorId } = activeCombinations[comboIdx]
        const rawEntries = zoneSelections[base.id] || []
        const colors = colorSelections[base.id] || []
        const primaryColorId = colors[0] ?? null

        // Map entries to this color if needed
        let entries = rawEntries
        if (colorId != null && primaryColorId != null && colorId !== primaryColorId) {
          entries = mapEntriesToColor(base, rawEntries, primaryColorId, colorId)
        }

        // Determine primary zone (first entry or fallback to is_max/first zone)
        let primaryImageId: number | null = null
        let primaryZoneId: number | null = null

        if (entries.length > 0) {
          primaryImageId = parseInt(entries[0].imageId)
          primaryZoneId = parseInt(entries[0].zoneId)
        } else {
          // Fallback: first image of this color with zones, prefer is_max
          const candidateImages = colorId != null
            ? base.images.filter((img) => img.colorId === colorId)
            : base.images
          for (const img of candidateImages) {
            if (img.zones.length > 0) {
              primaryImageId = parseInt(img.id)
              const maxZone = img.zones.find((z: Zone & { is_max?: boolean }) => z.is_max)
              primaryZoneId = parseInt(maxZone ? maxZone.id : img.zones[0].id)
              break
            }
          }
        }

        // Product name with color
        const colorName = colorId != null ? base.colors.find((c) => c.id === colorId)?.name : null
        const aiText = generatedTexts[comboIdx]
        const fallbackName = colors.length > 1 && colorName
          ? `${base.name} + ${print.name} (${colorName})`
          : `${base.name} + ${print.name}`
        const productName = aiText?.name
          ? (colors.length > 1 && colorName ? `${aiText.name} (${colorName})` : aiText.name)
          : fallbackName

        // Insert product and get back the id
        const { data: inserted, error: insertErr } = await supabase
          .from("products")
          .insert({
            name: productName,
            description: aiText?.description || null,
            base_id: parseInt(base.id),
            print_id: parseInt(print.id),
            base_image_id: primaryImageId,
            zone_id: primaryZoneId,
            price: (Number(base.price) || 0) + (Number(print.price) || 0),
            is_active: true,
          })
          .select("id")
          .single()

        if (insertErr) throw insertErr

        // Insert all zone placements
        if (entries.length > 0 && inserted) {
          const placements = entries.map((e) => ({
            product_id: inserted.id,
            zone_id: parseInt(e.zoneId),
            print_id: e.printId ? parseInt(e.printId) : parseInt(print.id),
            x: 50,
            y: 50,
            scale: 100,
            is_mirrored: false,
          }))
          const { error: placementErr } = await supabase
            .from("product_print_placements")
            .insert(placements)
          if (placementErr) throw placementErr
        }

        savedTotal++
      }

      setSavedCount(savedTotal)
      setSelectedBaseIds(new Set())
      setSelectedPrintIds(new Set())
      setRejectedKeys(new Set())
      setZoneSelections({})
      setColorSelections({})
    } catch (err) {
      console.error("[v0] Failed to save products:", err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Wand2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Генерувати товар</h1>
            <p className="text-sm text-muted-foreground">
              Оберіть основи та принти, налаштуйте зони — отримайте готові комбінації товарів
            </p>
          </div>
        </div>
        {activeCombinations.length > 0 && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Додати товари ({activeCombinations.length})
          </button>
        )}
      </div>

      {/* Success banner */}
      {savedCount !== null && (
        <div className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-accent/20 px-4 py-3 text-sm font-medium text-primary">
          <Check className="h-4 w-4" />
          {savedCount} товар{savedCount === 1 ? "" : savedCount < 5 ? "и" : "ів"} успішно додано до каталогу
        </div>
      )}

      {/* Selection panels */}
      <div className="grid grid-cols-2 gap-4">

        {/* Bases */}
        <div className="flex flex-col rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-foreground" />
              <span className="font-semibold text-foreground">Основи</span>
            </div>
            <button onClick={toggleAllBases} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <CheckSquare className="h-4 w-4" /> Обрати всі
            </button>
          </div>
          <p className="px-5 py-2 text-sm text-muted-foreground">Обрано: {selectedBaseIds.size}</p>
          <div className="px-5 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={baseSearch}
                onChange={(e) => setBaseSearch(e.target.value)}
                placeholder="Пошук основ..."
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="overflow-y-auto px-3 pb-3" style={{ maxHeight: 400 }}>
            {filteredBases.map((base) => {
              const isSelected = selectedBaseIds.has(base.id)
              const hasZones = base.images.some((img) => img.zones.length > 0)
              const hasSelection = (zoneSelections[base.id] || []).length > 0
              const totalZones = base.images.reduce((acc, img) => acc + img.zones.length, 0)
              const selectedColors = colorSelections[base.id] || []
              return (
                <div
                  key={base.id}
                  onClick={() => toggleBase(base.id)}
                  className={cn(
                    "mb-2 flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all",
                    isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                    isSelected ? "border-primary bg-primary" : "border-border"
                  )}>
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                    {base.image_url
                      ? <img src={base.image_url} alt={base.name} className="h-full w-full object-cover" />
                      : <Package className="m-auto mt-2.5 h-5 w-5 text-muted-foreground" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{base.name}</p>
                    <p className="text-xs text-muted-foreground">{base.sku || base.base_categories?.name || "\u2014"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium",
                      totalZones > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {totalZones}
                    </span>
                    {isSelected && hasZones && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setZonePickerBase(base) }}
                        className={cn(
                          "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                          hasSelection ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        )}
                      >
                        {hasSelection ? `\u0417\u043E\u043D\u0438 (${zoneSelections[base.id].length}) \u2713` : "\u0417\u043E\u043D\u0438"}
                      </button>
                    )}
                    {isSelected && base.colors.length > 0 && (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                        {selectedColors.length > 0
                          ? `${selectedColors.length}/${base.colors.length} \u043A\u043E\u043B\u044C\u043E\u0440\u0456\u0432`
                          : `${base.colors.length} \u043A\u043E\u043B\u044C\u043E\u0440\u0456\u0432`
                        }
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Prints */}
        <div className="flex flex-col rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-foreground" />
              <span className="font-semibold text-foreground">Принти</span>
            </div>
            <button onClick={toggleAllPrints} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <CheckSquare className="h-4 w-4" /> Обрати всі
            </button>
          </div>
          <p className="px-5 py-2 text-sm text-muted-foreground">Обрано: {selectedPrintIds.size}</p>
          <div className="px-5 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={printSearch}
                onChange={(e) => setPrintSearch(e.target.value)}
                placeholder="Пошук принтів..."
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="overflow-y-auto px-3 pb-3" style={{ maxHeight: 400 }}>
            <div className="grid grid-cols-3 gap-2">
              {filteredPrints.map((print) => {
                const isSelected = selectedPrintIds.has(print.id)
                return (
                  <div
                    key={print.id}
                    onClick={() => togglePrint(print.id)}
                    className={cn(
                      "relative cursor-pointer rounded-xl border-2 p-2 transition-all",
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className={cn(
                      "absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded border bg-background",
                      isSelected ? "border-primary" : "border-border"
                    )}>
                      {isSelected && <Check className="h-3 w-3 text-primary" />}
                    </div>
                    <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-muted">
                      {print.image_url
                        ? <img src={print.image_url} alt={print.name} className="h-full w-full object-cover" />
                        : <div className="flex h-full items-center justify-center"><Layers className="h-6 w-6 text-muted-foreground" /></div>
                      }
                    </div>
                    <p className="truncate text-center text-sm font-medium text-foreground">{print.name}</p>
                    {print.print_categories?.name && (
                      <p className="truncate text-center text-xs text-muted-foreground">{print.print_categories.name}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Preview grid */}
      {activeCombinations.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-foreground" />
                <h2 className="font-semibold text-foreground">Згенеровані товари ({activeCombinations.length})</h2>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Наведіть на картку та натисніть X, щоб відхилити комбінацію
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Додати товари ({activeCombinations.length})
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {activeCombinations.map(({ base, print, colorId, key }) => {
                const colorBase = colorId != null
                  ? { ...base, images: base.images.filter((img) => img.colorId === colorId) }
                  : base
                const colorName = colorId != null ? base.colors.find((c) => c.id === colorId)?.name : null
                const colors = colorSelections[base.id] || []
                const rawEntries = zoneSelections[base.id] || []
                const primaryColorId = colors[0] ?? null

                // Map entries to this color for preview
                let entries = rawEntries
                if (colorId != null && primaryColorId != null && colorId !== primaryColorId) {
                  entries = mapEntriesToColor(base, rawEntries, primaryColorId, colorId)
                }

                return (
                  <div key={key} className="relative">
                    <CompositeCard
                      base={colorBase}
                      print={print}
                      multiZoneSelection={entries}
                      onReject={() => rejectCombo(key)}
                    />
                    {colorName && colors.length > 1 && (
                      <span className="absolute left-2 top-2 z-10 rounded-full bg-card/90 px-2 py-0.5 text-xs font-medium text-foreground shadow-sm border border-border">
                        {colorName}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Zone picker modal */}
      {zonePickerBase && (
        <ZonePickerModal
          base={zonePickerBase}
          entries={zoneSelections[zonePickerBase.id] || []}
          prints={prints}
          initialColorIds={colorSelections[zonePickerBase.id] || []}
          onSave={(entries, colorIds) => {
            setZoneSelections((prev) => ({ ...prev, [zonePickerBase.id]: entries }))
            setColorSelections((prev) => ({ ...prev, [zonePickerBase.id]: colorIds }))
          }}
          onClose={() => setZonePickerBase(null)}
        />
      )}
    </div>
  )
}
