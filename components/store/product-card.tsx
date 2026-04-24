"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Package } from "lucide-react"
import { cn } from "@/lib/utils"

type CardImage = {
  id: number
  url: string
  zones: { id: string; x: number; y: number; width: number; height: number }[]
}

type SiblingSwatch = {
  productId: number
  colorId: number | null
  hex: string | null
  name: string | null
}

interface ProductCardProps {
  product: {
    id: number
    name: string
    price: number | null
    printImageUrl: string | null
    images: CardImage[]
    initialImageIndex: number
    placements: Record<string, { x: number; y: number; scale: number; is_mirrored: boolean; printImageUrl?: string }>
    colorId?: number | null
    siblingColors?: SiblingSwatch[]
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const { images, printImageUrl, placements, initialImageIndex } = product
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activeIndex, setActiveIndex] = useState(Math.max(0, Math.min(initialImageIndex, images.length - 1)))

  const activeImage = images[activeIndex]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !activeImage) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const SIZE = 400
    canvas.width = SIZE
    canvas.height = SIZE

    const baseImg = new Image()
    baseImg.crossOrigin = "anonymous"
    baseImg.src = activeImage.url

    baseImg.onload = () => {
      const scale = Math.min(SIZE / baseImg.naturalWidth, SIZE / baseImg.naturalHeight)
      const w = baseImg.naturalWidth * scale
      const h = baseImg.naturalHeight * scale
      const ox = (SIZE - w) / 2
      const oy = (SIZE - h) / 2

      ctx.clearRect(0, 0, SIZE, SIZE)
      ctx.drawImage(baseImg, ox, oy, w, h)

      if (!printImageUrl || activeImage.zones.length === 0) return

      // Render only zones that have explicit placements. If the product has
      // no placements at all (legacy products created before multi-zone
      // support), fall back to centering on the first zone.
      const matchingZones = activeImage.zones.filter((z) => placements[z.id])
      const hasAnyPlacements = Object.keys(placements).length > 0
      const zonesToRender = matchingZones.length > 0
        ? matchingZones
        : hasAnyPlacements
          ? []
          : [activeImage.zones[0]]

      if (zonesToRender.length === 0) return

      for (const zone of zonesToRender) {
        const placement = placements[zone.id]
        const url = placement?.printImageUrl ?? printImageUrl

        const zx = ox + (zone.x / 100) * w
        const zy = oy + (zone.y / 100) * h
        const zw = (zone.width / 100) * w
        const zh = (zone.height / 100) * h

        const printImg = new Image()
        printImg.crossOrigin = "anonymous"
        printImg.src = url

        printImg.onload = () => {
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
    }
  }, [activeImage, printImageUrl, placements])

  const hasBase = !!activeImage
  const hasMultiple = images.length > 1

  const go = (dir: 1 | -1) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!hasMultiple) return
    setActiveIndex((i) => (i + dir + images.length) % images.length)
  }

  const jumpTo = (i: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveIndex(i)
  }

  const productHref = product.colorId
    ? `/product/${product.id}?color=${product.colorId}`
    : `/product/${product.id}`

  const swatches = product.siblingColors ?? []
  const showSwatches = swatches.length > 1

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-all hover:border-primary/30 hover:shadow-md">
      <Link href={productHref} className="flex flex-col">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {hasBase ? (
            <canvas
              ref={canvasRef}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="size-10 text-muted-foreground/30" />
            </div>
          )}

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={go(-1)}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-background/85 border shadow-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background"
                aria-label={"Попередня"}
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={go(1)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-background/85 border shadow-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background"
                aria-label={"Наступна"}
              >
                <ChevronRight className="size-4" />
              </button>
              <div className="pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={jumpTo(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      activeIndex === i
                        ? "w-3.5 bg-primary"
                        : "w-1.5 bg-foreground/25 hover:bg-foreground/50"
                    )}
                    aria-label={`Фото ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3">
          <h3 className="text-sm font-medium text-card-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          {product.price != null && product.price > 0 && (
            <p className="mt-auto pt-2 text-sm font-bold text-foreground">
              {product.price} {"грн"}
            </p>
          )}
        </div>
      </Link>
      {showSwatches && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
          {swatches.map((s) => {
            const isSelected = s.colorId === (product.colorId ?? null)
            const href = s.colorId
              ? `/product/${s.productId}?color=${s.colorId}`
              : `/product/${s.productId}`
            return (
              <Link
                key={`${s.productId}-${s.colorId ?? "none"}`}
                href={href}
                aria-label={s.name ?? "колір"}
                title={s.name ?? undefined}
                className={cn(
                  "size-5 rounded-full border transition-all",
                  isSelected
                    ? "border-primary ring-2 ring-primary ring-offset-1 ring-offset-card"
                    : "border-border hover:border-primary/60"
                )}
                style={{ backgroundColor: s.hex ?? "transparent" }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
