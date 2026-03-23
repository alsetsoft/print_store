"use client"

import { useEffect, useRef } from "react"
import { ShoppingBag } from "lucide-react"
import type { CartItem } from "@/lib/cart-context"

interface CartItemPreviewProps {
  item: CartItem
  size?: number
  className?: string
}

export function CartItemPreview({ item, size = 200, className = "" }: CartItemPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hasComposite = item.printImageUrl && item.zones && item.zones.length > 0

  useEffect(() => {
    if (!hasComposite) return
    const canvas = canvasRef.current
    if (!canvas || !item.imageUrl) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = size
    canvas.height = size

    const baseImg = new Image()
    baseImg.crossOrigin = "anonymous"
    baseImg.src = item.imageUrl

    baseImg.onload = () => {
      const scale = Math.min(size / baseImg.naturalWidth, size / baseImg.naturalHeight)
      const w = baseImg.naturalWidth * scale
      const h = baseImg.naturalHeight * scale
      const ox = (size - w) / 2
      const oy = (size - h) / 2

      ctx.clearRect(0, 0, size, size)
      ctx.drawImage(baseImg, ox, oy, w, h)

      if (!item.printImageUrl || !item.zones || item.zones.length === 0) return

      const zone = item.zones[0]
      const zx = ox + (zone.x / 100) * w
      const zy = oy + (zone.y / 100) * h
      const zw = (zone.width / 100) * w
      const zh = (zone.height / 100) * h

      const printImg = new Image()
      printImg.crossOrigin = "anonymous"
      printImg.src = item.printImageUrl

      printImg.onload = () => {
        const placement = item.placements?.[zone.id]
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
  }, [item.imageUrl, item.printImageUrl, item.zones, item.placements, hasComposite, size])

  // Custom design with saved preview
  if (item.previewDataUrl) {
    return (
      <img
        src={item.previewDataUrl}
        alt={item.name}
        className={`object-contain ${className}`}
      />
    )
  }

  if (!item.imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted/30 ${className}`}>
        <ShoppingBag className="size-8 text-muted-foreground/20" />
      </div>
    )
  }

  if (hasComposite) {
    return (
      <canvas
        ref={canvasRef}
        className={`object-contain ${className}`}
        style={{ width: "100%", height: "100%" }}
      />
    )
  }

  return (
    <img
      src={item.imageUrl}
      alt={item.name}
      className={`object-contain p-2 ${className}`}
    />
  )
}
