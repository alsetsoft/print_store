"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { Package } from "lucide-react"

interface ProductCardProps {
  product: {
    id: number
    name: string
    price: number | null
    baseImageUrl: string | null
    printImageUrl: string | null
    zones: { id: string; x: number; y: number; width: number; height: number }[]
    placements: Record<string, { x: number; y: number; scale: number; is_mirrored: boolean }>
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const baseUrl = product.baseImageUrl
  const printUrl = product.printImageUrl
  const zones = product.zones
  const placements = product.placements

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !baseUrl) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const SIZE = 400
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

  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-all hover:border-primary/30 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {baseUrl ? (
          <canvas
            ref={canvasRef}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="size-10 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-medium text-card-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        {product.price != null && product.price > 0 && (
          <p className="mt-auto pt-2 text-sm font-bold text-foreground">
            {product.price} {"\u0433\u0440\u043d"}
          </p>
        )}
      </div>
    </Link>
  )
}
