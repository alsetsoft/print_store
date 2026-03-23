"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Package, Check, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCart } from "@/lib/cart-context"

type ImageWithZones = {
  id: number
  url: string
  colorId: number | null
  zones: Array<{ id: string; x: number; y: number; width: number; height: number }>
}

type ColorOption = {
  id: number
  name: string
  hex_code: string | null
  images: ImageWithZones[]
}

type SizeOption = {
  id: number
  name: string
  sort_order: number
  price: number | null
}

interface ProductDetailClientProps {
  product: {
    id: number
    name: string
    description: string | null
    price: number | null
  }
  baseName: string
  printImageUrl: string | null
  colorOptions: ColorOption[]
  sizes: SizeOption[]
  placements: Record<string, { x: number; y: number; scale: number; is_mirrored: boolean }>
}

export function ProductDetailClient({
  product,
  baseName,
  printImageUrl,
  colorOptions,
  sizes,
  placements,
}: ProductDetailClientProps) {
  const [selectedColorId, setSelectedColorId] = useState<number>(colorOptions[0]?.id ?? 0)
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(sizes[0]?.id ?? null)

  const { addItem } = useCart()

  const selectedColor = colorOptions.find((c) => c.id === selectedColorId) ?? colorOptions[0]
  const images = selectedColor?.images ?? []

  // Determine price: size-specific price > product price
  const selectedSize = sizes.find((s) => s.id === selectedSizeId)
  const displayPrice = (selectedSize?.price && selectedSize.price > 0) ? selectedSize.price : product.price

  const handleAddToCart = () => {
    const firstImage = images[0]
    const firstZone = firstImage?.zones?.[0]
    addItem({
      id: String(product.id),
      type: "product",
      name: product.name,
      price: displayPrice,
      imageUrl: firstImage?.url ?? null,
      printImageUrl,
      zones: firstImage?.zones,
      placements: firstZone ? placements : undefined,
      colorName: selectedColor?.name ?? undefined,
      sizeName: selectedSize?.name ?? undefined,
    })
  }

  return (
    <>
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Image preview */}
        <div className="flex-1">
          <ProductPreview
            images={images}
            printImageUrl={printImageUrl}
            placements={placements}
          />
        </div>

        {/* Product info */}
        <div className="w-full lg:w-96 shrink-0">
          <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{baseName}</p>

          {displayPrice != null && displayPrice > 0 && (
            <p className="mt-4 text-3xl font-bold text-foreground">
              {displayPrice} <span className="text-lg font-normal text-muted-foreground">{"\u0433\u0440\u043d"}</span>
            </p>
          )}

          {product.description && (
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          )}

          {/* Color selector */}
          {colorOptions.length > 1 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-medium text-foreground">
                {"\u041a\u043e\u043b\u0456\u0440"}: <span className="text-muted-foreground font-normal">{selectedColor?.name}</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColorId(color.id)}
                    className={cn(
                      "relative size-10 rounded-full border-2 transition-all",
                      selectedColorId === color.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-foreground/40"
                    )}
                    style={{ backgroundColor: color.hex_code ?? "#e5e5e5" }}
                    title={color.name}
                  >
                    {selectedColorId === color.id && (
                      <Check className={cn(
                        "absolute inset-0 m-auto size-4",
                        isLightColor(color.hex_code) ? "text-foreground" : "text-white"
                      )} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size selector */}
          {sizes.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-medium text-foreground">
                {"\u0420\u043e\u0437\u043c\u0456\u0440"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSizeId(size.id)}
                    className={cn(
                      "rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                      selectedSizeId === size.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-foreground/40"
                    )}
                  >
                    {size.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add to cart */}
          <button
            onClick={handleAddToCart}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <ShoppingCart className="size-4" />
            {"\u0412 \u043a\u043e\u0448\u0438\u043a"}
          </button>
        </div>
      </div>
    </>
  )
}

function isLightColor(hex: string | null): boolean {
  if (!hex) return true
  const h = hex.replace("#", "")
  if (h.length < 6) return true
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}

function ProductPreview({
  images,
  printImageUrl,
  placements,
}: {
  images: ImageWithZones[]
  printImageUrl: string | null
  placements: Record<string, { x: number; y: number; scale: number; is_mirrored: boolean }>
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Reset index when images change
  useEffect(() => {
    setActiveIndex(0)
  }, [images])

  const activeImage = images[activeIndex] ?? images[0]

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !activeImage) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const SIZE = 600
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

      // Render print in each zone (use first zone if no placements exist)
      const zone = activeImage.zones[0]
      const zx = ox + (zone.x / 100) * w
      const zy = oy + (zone.y / 100) * h
      const zw = (zone.width / 100) * w
      const zh = (zone.height / 100) * h

      const printImg = new Image()
      printImg.crossOrigin = "anonymous"
      printImg.src = printImageUrl

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
  }, [activeImage, printImageUrl, placements])

  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])

  if (!activeImage) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border bg-muted">
        <Package className="size-16 text-muted-foreground/30" />
      </div>
    )
  }

  const goNext = () => setActiveIndex((i) => (i + 1) % images.length)
  const goPrev = () => setActiveIndex((i) => (i - 1 + images.length) % images.length)

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3">
      {/* Main preview with carousel arrows */}
      <div className="group relative overflow-hidden rounded-xl border bg-muted/30">
        <canvas
          ref={canvasRef}
          className="aspect-square w-full object-contain"
        />
        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-background/80 border shadow-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-background/80 border shadow-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background"
            >
              <ChevronRight className="size-5" />
            </button>
            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    "size-2 rounded-full transition-all",
                    activeIndex === i
                      ? "bg-primary w-4"
                      : "bg-foreground/30 hover:bg-foreground/50"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "relative size-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                activeIndex === i
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-foreground/40"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt=""
                className="size-full object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
