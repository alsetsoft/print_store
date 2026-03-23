"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Wand2, Search, CheckSquare, Loader2, Layers, Package, Plus, Check, Square
} from "lucide-react"
import { decodeLabel } from "@/app/admin/parameters/actions"
import { cn } from "@/lib/utils"
import {
  CompositeCard,
  type CompositeBase,
  type CompositePrint,
  type ZoneSelection,
  type BaseImage,
  type Zone,
} from "@/components/admin/composite-card"

// ─── Local types (Base / Print extend shared types) ──────────────────────────

interface Base extends CompositeBase {
  sku: string | null
  price: number | null
  image_url: string | null
  base_categories: { name: string } | null
}

interface Print extends CompositePrint {
  print_categories: { name: string } | null
}

// ─── Zone Picker Modal ────────────────────────────────────────────────────────

function ZonePickerModal({
  base,
  zoneSelection,
  onSave,
  onClose,
}: {
  base: Base
  zoneSelection: ZoneSelection
  onSave: (sel: ZoneSelection) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState<ZoneSelection>({ ...zoneSelection })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-semibold text-foreground">{base.name}</h2>
            <p className="text-sm text-muted-foreground">Оберіть зону для кожного зображення</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
          >
            Скасувати
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          {base.images.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Немає зображень для цієї основи
            </p>
          ) : (
            <div className="space-y-6">
              {base.images.map((img) => (
                <div key={img.id}>
                  <p className="mb-2 text-sm font-medium text-foreground">{img.label}</p>
                  <div className="flex gap-4">
                    <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                      <img src={img.url} alt={img.label} className="h-full w-full object-cover" />
                      {img.zones.map((z) => (
                        <div
                          key={z.id}
                          onClick={() => setLocal((prev) => ({ ...prev, [img.id]: z.id }))}
                          className={cn(
                            "absolute cursor-pointer border-2 transition-all",
                            local[img.id] === z.id
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
                        <p className="text-xs text-muted-foreground">Зони не додані</p>
                      ) : (
                        img.zones.map((z) => (
                          <button
                            key={z.id}
                            onClick={() => setLocal((prev) => ({ ...prev, [img.id]: z.id }))}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all",
                              local[img.id] === z.id
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-foreground hover:border-primary/50"
                            )}
                          >
                            {local[img.id] === z.id
                              ? <CheckSquare className="h-4 w-4 shrink-0" />
                              : <Square className="h-4 w-4 shrink-0" />
                            }
                            {z.name || `Зона ${z.id}`}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
          >
            Скасувати
          </button>
          <button
            onClick={() => { onSave(local); onClose() }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Зберегти
          </button>
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

  const [zoneSelections, setZoneSelections] = useState<Record<string, ZoneSelection>>({})
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
        .select(`id, name, sku, price, image_url, base_categories:base_category_id(name), base_images(id, url, sort_order)`)
        .order("name"),
      supabase
        .from("print_designs")
        .select("id, name, image_url, price, print_categories:print_category_id(name)")
        .order("name"),
    ])

    const basesWithImages: Base[] = await Promise.all(
      (basesData || []).map(async (b) => {
        const rawImages = ((b.base_images as { id: number; url: string; sort_order: number | null }[]) || [])
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

        return {
          id: String(b.id),
          name: b.name,
          sku: b.sku,
          price: b.price as number | null,
          image_url: b.image_url,
          images,
          base_categories: b.base_categories as { name: string } | null,
        }
      })
    )

    setBases(basesWithImages)
    setPrints(
      (printsData || []).map((p) => ({
        id: String(p.id),
        name: p.name,
        image_url: p.image_url,
        price: p.price as number | null,
        print_categories: p.print_categories as { name: string } | null,
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

  const allCombinations: { base: Base; print: Print; key: string }[] = []
  for (const base of selectedBases) {
    for (const print of selectedPrints) {
      allCombinations.push({ base, print, key: `${base.id}-${print.id}` })
    }
  }
  const activeCombinations = allCombinations.filter((c) => !rejectedKeys.has(c.key))

  const rejectCombo = (key: string) => setRejectedKeys((prev) => new Set([...prev, key]))

  const handleSave = async () => {
    if (activeCombinations.length === 0) return
    setSaving(true)
    setSavedCount(null)
    try {
      const supabase = createClient()
      
      // Build products with zone information
      const productsToInsert = activeCombinations.map(({ base, print }) => {
        // Get zone selection for this base
        const baseZoneSelection = zoneSelections[base.id] || {}
        
        // Find the first image with a selected zone (or the first image with zones)
        let selectedImageId: number | null = null
        let selectedZoneId: number | null = null

        // First try to use explicit zone selection
        for (const img of base.images) {
          const zoneIdStr = baseZoneSelection[img.id]
          if (zoneIdStr) {
            selectedImageId = parseInt(img.id)
            selectedZoneId = parseInt(zoneIdStr)
            break
          }
        }

        // If no explicit selection, use the first image with zones (preferring is_max zone)
        if (!selectedImageId && !selectedZoneId) {
          for (const img of base.images) {
            if (img.zones.length > 0) {
              selectedImageId = parseInt(img.id)
              const maxZone = img.zones.find((z: Zone & { is_max?: boolean }) => z.is_max)
              selectedZoneId = parseInt(maxZone ? maxZone.id : img.zones[0].id)
              break
            }
          }
        }

        return {
          name: `${base.name} + ${print.name}`,
          base_id: parseInt(base.id),
          print_id: parseInt(print.id),
          base_image_id: selectedImageId,
          zone_id: selectedZoneId,
          price: (Number(base.price) || 0) + (Number(print.price) || 0),
          is_active: true,
        }
      })
      
      const { error } = await supabase.from("products").insert(productsToInsert)
      if (error) throw error
      setSavedCount(activeCombinations.length)
      setSelectedBaseIds(new Set())
      setSelectedPrintIds(new Set())
      setRejectedKeys(new Set())
      setZoneSelections({})
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
    <div className="flex flex-col gap-6 p-8">
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
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Додати товари ({activeCombinations.length})
          </button>
        )}
      </div>

      {/* Success banner */}
      {savedCount !== null && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
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
              const hasSelection = !!zoneSelections[base.id]
              const totalZones = base.images.reduce((acc, img) => acc + img.zones.length, 0)
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
                    <p className="text-xs text-muted-foreground">{base.sku || base.base_categories?.name || "—"}</p>
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
                        {hasSelection ? "Зони ✓" : "Зони"}
                      </button>
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
              {activeCombinations.map(({ base, print, key }) => (
                <CompositeCard
                  key={key}
                  base={base}
                  print={print}
                  zoneSelection={zoneSelections[base.id] || {}}
                  onReject={() => rejectCombo(key)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Zone picker modal */}
      {zonePickerBase && (
        <ZonePickerModal
          base={zonePickerBase}
          zoneSelection={zoneSelections[zonePickerBase.id] || {}}
          onSave={(sel) => setZoneSelections((prev) => ({ ...prev, [zonePickerBase.id]: sel }))}
          onClose={() => setZonePickerBase(null)}
        />
      )}
    </div>
  )
}
