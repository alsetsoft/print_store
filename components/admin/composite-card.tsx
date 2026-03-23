"use client"

import { useEffect, useState, useRef } from "react"
import { ChevronLeft, ChevronRight, X, Trash2 } from "lucide-react"
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
  zoneSelection,
  printConfig,
  placements = {},
  onReject,
  onDelete,
  onClick,
  isActive,
}: {
  base: CompositeBase
  print: CompositePrint
  zoneSelection?: ZoneSelection
  printConfig?: PrintConfig | null
  placements?: Record<string, PrintPlacement>
  onReject?: () => void
  onDelete?: () => void
  onClick?: () => void
  isActive?: boolean
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

  // Stable serialization for all object dependencies to avoid useEffect array size changes
  const placementsJson = JSON.stringify(placements || {})
  const printConfigJson = JSON.stringify(printConfig || null)
  const selectedZoneJson = JSON.stringify(selectedZone || null)
  const currentImageUrl = currentImage?.url || ""

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !currentImageUrl) return
    
    // Parse serialized dependencies
    const parsedPrintConfig = printConfigJson ? JSON.parse(printConfigJson) as PrintConfig | null : null
    const parsedSelectedZone = selectedZoneJson ? JSON.parse(selectedZoneJson) as Zone | null : null
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

      if (!parsedSelectedZone || !print.image_url) return

      const zx = ox + (parsedSelectedZone.x / 100) * w
      const zy = oy + (parsedSelectedZone.y / 100) * h
      const zw = (parsedSelectedZone.width / 100) * w
      const zh = (parsedSelectedZone.height / 100) * h

      const printImg = new Image()
      printImg.crossOrigin = "anonymous"
      printImg.src = print.image_url

      printImg.onload = () => {
        // Check for placement data first (from product_print_placements), then fall back to printConfig
        const parsedPlacements = JSON.parse(placementsJson) as Record<string, PrintPlacement>
        const placement = parsedSelectedZone && parsedPlacements[parsedSelectedZone.id]
        
        if (placement) {
          // Use placement from database
          const px = placement.x / 100
          const py = placement.y / 100
          const ps = placement.scale / 100
          // Fit print inside zone preserving aspect ratio, then apply scale
          const printRatio = printImg.naturalWidth / printImg.naturalHeight
          const zoneRatio = zw / zh
          let basePw: number, basePh: number
          if (printRatio > zoneRatio) {
            basePw = zw
            basePh = zw / printRatio
          } else {
            basePh = zh
            basePw = zh * printRatio
          }
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
        } else if (parsedPrintConfig) {
          // Use saved position + scale within the zone (legacy)
          const px = parsedPrintConfig.x / 100
          const py = parsedPrintConfig.y / 100
          const ps = parsedPrintConfig.scale / 100
          // Fit print inside zone preserving aspect ratio, then apply scale
          const printRatio = printImg.naturalWidth / printImg.naturalHeight
          const zoneRatio = zw / zh
          let basePw: number, basePh: number
          if (printRatio > zoneRatio) {
            basePw = zw
            basePh = zw / printRatio
          } else {
            basePh = zh
            basePw = zh * printRatio
          }
          const pw = basePw * ps
          const ph = basePh * ps
          const finalX = zx + px * zw - pw / 2
          const finalY = zy + py * zh - ph / 2

          ctx.save()
          if (parsedPrintConfig.flipped) {
            ctx.translate(finalX + pw / 2, 0)
            ctx.scale(-1, 1)
            ctx.drawImage(printImg, -pw / 2, finalY, pw, ph)
          } else {
            ctx.drawImage(printImg, finalX, finalY, pw, ph)
          }
          ctx.restore()
        } else {
          // Default: fit print inside zone preserving aspect ratio (contain)
          const printRatio = printImg.naturalWidth / printImg.naturalHeight
          const zoneRatio = zw / zh
          let pw: number, ph: number
          if (printRatio > zoneRatio) {
            pw = zw
            ph = zw / printRatio
          } else {
            ph = zh
            pw = zh * printRatio
          }
          const px = zx + (zw - pw) / 2
          const py = zy + (zh - ph) / 2
          ctx.drawImage(printImg, px, py, pw, ph)
        }
      }
    }
  }, [currentImageUrl, print.image_url, selectedZoneJson, printConfigJson, placementsJson])

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
          title="Видалити"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
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
        <p className="font-semibold text-foreground">{base.name}</p>
        <p className="text-sm text-muted-foreground">+ {print.name}</p>
        {currentImage && (
          <p className="mt-0.5 text-xs text-muted-foreground">{currentImage.label}</p>
        )}
      </div>
    </div>
  )
}
