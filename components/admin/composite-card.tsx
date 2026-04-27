"use client"

import { useEffect, useState, useRef } from "react"
import { ChevronLeft, ChevronRight, X, Trash2, Eye, EyeOff } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { PrintConfig } from "@/components/admin/product-constructor-modal"

export interface Zone {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  is_max?: boolean
  price?: number
}

export interface BaseImage {
  id: string
  url: string
  label: string
  colorId: number | null
  zones: Zone[]
}

export interface CompositeBase {
  id: string
  name: string
  images: BaseImage[]
}

export interface CompositePrint {
  id: string
  name: string
  image_url: string | null
  price?: number | null
}

// zoneSelection: baseImageId → zoneId (first zone used as fallback)
export type ZoneSelection = Record<string, string>

export interface MultiZoneEntry {
  imageId: string
  zoneId: string
  printId?: string        // undefined for primary zone (index 0)
  printImageUrl?: string  // resolved URL for rendering
}
export type MultiZoneSelection = MultiZoneEntry[]

interface PrintPlacement {
  zone_id: string
  x: number
  y: number
  scale: number
  is_mirrored: boolean
}

export function CompositeCard({
  base,
  print,
  productName,
  zoneSelection,
  multiZoneSelection,
  printConfig,
  placements = {},
  onReject,
  onDelete,
  onClick,
  isActive,
  isPopular,
  onTogglePopular,
  isPreviewable,
  onTogglePreviewable,
}: {
  base: CompositeBase
  print: CompositePrint
  productName?: string
  zoneSelection?: ZoneSelection
  multiZoneSelection?: MultiZoneSelection
  printConfig?: PrintConfig | null
  placements?: Record<string, PrintPlacement>
  onReject?: () => void
  onDelete?: () => void
  onClick?: () => void
  isActive?: boolean
  isPopular?: boolean
  onTogglePopular?: () => void
  isPreviewable?: boolean
  onTogglePreviewable?: () => void
}) {
  // If printConfig has a saved imageIndex, start there
  const [imgIndex, setImgIndex] = useState(printConfig?.imageIndex ?? 0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const images = base.images

  const currentImage = images[imgIndex]

  // Resolve zone: printConfig.zoneId > zoneSelection > first zone
  const resolvedZoneId = currentImage
    ? (printConfig?.zoneId ?? zoneSelection?.[currentImage.id] ?? currentImage.zones[0]?.id)
    : undefined
  const selectedZone = currentImage?.zones.find((z) => z.id === resolvedZoneId)
    ?? currentImage?.zones[0]

  // Multi-zone entries for this image
  const multiZoneEntries = multiZoneSelection
    ? multiZoneSelection.filter((e) => currentImage && e.imageId === currentImage.id)
    : []

  // Flag: was multiZoneSelection explicitly provided (even if empty)?
  const hasMultiZoneSelection = multiZoneSelection !== undefined

  // Stable serialization for all object dependencies to avoid useEffect array size changes
  const placementsJson = JSON.stringify(placements || {})
  const printConfigJson = JSON.stringify(printConfig || null)
  const selectedZoneJson = JSON.stringify(selectedZone || null)
  const multiZoneEntriesJson = JSON.stringify(multiZoneEntries)
  const currentImageUrl = currentImage?.url || ""
  const allZonesJson = JSON.stringify(currentImage?.zones || [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !currentImageUrl) return

    // Parse serialized dependencies
    const parsedPrintConfig = printConfigJson ? JSON.parse(printConfigJson) as PrintConfig | null : null
    const parsedSelectedZone = selectedZoneJson ? JSON.parse(selectedZoneJson) as Zone | null : null
    const parsedMultiZoneEntries = JSON.parse(multiZoneEntriesJson) as MultiZoneEntry[]
    const parsedAllZones = JSON.parse(allZonesJson) as Zone[]
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const SIZE = 400
    canvas.width = SIZE
    canvas.height = SIZE

    const baseImg = new Image()
    baseImg.crossOrigin = "anonymous"
    baseImg.src = currentImageUrl

    baseImg.onload = () => {
      const scale = Math.min(SIZE / baseImg.naturalWidth, SIZE / baseImg.naturalHeight)
      const w = baseImg.naturalWidth * scale
      const h = baseImg.naturalHeight * scale
      const ox = (SIZE - w) / 2
      const oy = (SIZE - h) / 2

      ctx.clearRect(0, 0, SIZE, SIZE)
      ctx.drawImage(baseImg, ox, oy, w, h)

      // Helper to draw a print image into a zone with contain-fit
      const drawPrintInZone = (pImg: HTMLImageElement, zone: Zone) => {
        const zx = ox + (zone.x / 100) * w
        const zy = oy + (zone.y / 100) * h
        const zw = (zone.width / 100) * w
        const zh = (zone.height / 100) * h
        const printRatio = pImg.naturalWidth / pImg.naturalHeight
        const zoneRatio = zw / zh
        let pw: number, ph: number
        if (printRatio > zoneRatio) { pw = zw; ph = zw / printRatio }
        else { ph = zh; pw = zh * printRatio }
        const px = zx + (zw - pw) / 2
        const py = zy + (zh - ph) / 2
        ctx.drawImage(pImg, px, py, pw, ph)
      }

      // Helper to draw a print using placement data (x/y/scale/mirror)
      const drawPrintWithPlacement = (pImg: HTMLImageElement, zone: Zone, placement: PrintPlacement) => {
        const zx = ox + (zone.x / 100) * w
        const zy = oy + (zone.y / 100) * h
        const zw = (zone.width / 100) * w
        const zh = (zone.height / 100) * h
        const px = placement.x / 100
        const py = placement.y / 100
        const ps = placement.scale / 100
        const printRatio = pImg.naturalWidth / pImg.naturalHeight
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
          ctx.drawImage(pImg, -pw / 2, finalY, pw, ph)
        } else {
          ctx.drawImage(pImg, finalX, finalY, pw, ph)
        }
        ctx.restore()
      }

      // Multi-zone rendering path (when multiZoneSelection is provided, always use this path)
      if (hasMultiZoneSelection) {
        const parsedPlacements = JSON.parse(placementsJson) as Record<string, PrintPlacement>
        const printSources: { url: string; zone: Zone; zoneId: string }[] = []
        for (const entry of parsedMultiZoneEntries) {
          const zone = parsedAllZones.find((z) => z.id === entry.zoneId)
          if (!zone) continue
          // Primary zone (no printId) uses product print, additional zones use their own printImageUrl
          const url = entry.printId ? entry.printImageUrl : print.image_url
          if (url) printSources.push({ url, zone, zoneId: entry.zoneId })
        }
        if (printSources.length === 0) return
        for (const src of printSources) {
          const pImg = new Image()
          pImg.crossOrigin = "anonymous"
          pImg.src = src.url
          pImg.onload = () => {
            const placement = parsedPlacements[src.zoneId]
            if (placement) {
              drawPrintWithPlacement(pImg, src.zone, placement)
            } else {
              drawPrintInZone(pImg, src.zone)
            }
          }
        }
        return
      }

      // Single-zone rendering path (existing behavior)
      if (!parsedSelectedZone || !print.image_url) return

      const printImg = new Image()
      printImg.crossOrigin = "anonymous"
      printImg.src = print.image_url

      printImg.onload = () => {
        // Check for placement data first (from product_print_placements), then fall back to printConfig
        const parsedPlacements = JSON.parse(placementsJson) as Record<string, PrintPlacement>
        const placement = parsedSelectedZone && parsedPlacements[parsedSelectedZone.id]

        if (placement) {
          drawPrintWithPlacement(printImg, parsedSelectedZone, placement)
        } else if (parsedPrintConfig) {
          // Convert printConfig to placement format for rendering
          drawPrintWithPlacement(printImg, parsedSelectedZone, {
            zone_id: parsedSelectedZone.id,
            x: parsedPrintConfig.x,
            y: parsedPrintConfig.y,
            scale: parsedPrintConfig.scale,
            is_mirrored: !!parsedPrintConfig.flipped,
          })
        } else {
          drawPrintInZone(printImg, parsedSelectedZone)
        }
      }
    }
  }, [currentImageUrl, print.image_url, selectedZoneJson, printConfigJson, placementsJson, multiZoneEntriesJson, allZonesJson, hasMultiZoneSelection])

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md",
        isActive === false ? "opacity-60" : "",
        onClick ? "cursor-pointer" : ""
      )}
      onClick={onClick}
    >
      {onReject && (
        <button
          onClick={(e) => { e.stopPropagation(); onReject() }}
          className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow transition-opacity group-hover:opacity-100"
          title="Відхилити"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow transition-opacity group-hover:opacity-100"
          title={"Видалити"}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      {isPreviewable && (
        <span
          className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium text-primary-foreground shadow"
          title={"Превʼю каталогу"}
        >
          <Eye className="h-3 w-3" />
          {"Превʼю"}
        </span>
      )}

      <div className="relative aspect-square bg-muted">
        {currentImage ? (
          <canvas ref={canvasRef} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Немає зображень
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setImgIndex((i) => Math.max(0, i - 1)) }}
              disabled={imgIndex === 0}
              className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow disabled:opacity-30 hover:bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setImgIndex((i) => Math.min(images.length - 1, i + 1)) }}
              disabled={imgIndex === images.length - 1}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow disabled:opacity-30 hover:bg-background"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <div className="p-3">
        <p className="font-semibold text-foreground">{productName || `${base.name} + ${print.name}`}</p>
        {productName && <p className="text-xs text-muted-foreground">{base.name} + {print.name}</p>}
        {currentImage && (
          <p className="mt-0.5 text-xs text-muted-foreground">{currentImage.label}</p>
        )}
        {onTogglePopular && (
          <label
            onClick={(e) => e.stopPropagation()}
            className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-foreground"
          >
            <Checkbox
              checked={Boolean(isPopular)}
              onCheckedChange={() => onTogglePopular()}
              aria-label={"Позначити як популярне"}
            />
            <span>{"Популярний"}</span>
          </label>
        )}
        {onTogglePreviewable && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onTogglePreviewable() }}
            aria-label={isPreviewable ? "Не показувати в каталозі" : "Показувати в каталозі"}
            className={cn(
              "mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
              isPreviewable
                ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {isPreviewable ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>{isPreviewable ? "Показувати в каталозі" : "Показати в каталозі"}</span>
          </button>
        )}
      </div>
    </div>
  )
}
