"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Package, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type BaseImage = {
  id: number
  url: string
  colorId: number | null
}

type ColorOption = {
  id: number
  name: string
  hex_code: string | null
  images: BaseImage[]
}

type SizeOption = {
  id: number
  name: string
  sort_order: number
  price: number | null
}

interface BaseDetailClientProps {
  base: {
    id: number
    name: string
    description: string | null
    price: number | null
  }
  colorOptions: ColorOption[]
  sizes: SizeOption[]
}

export function BaseDetailClient({
  base,
  colorOptions,
  sizes,
}: BaseDetailClientProps) {
  const [selectedColorId, setSelectedColorId] = useState<number>(colorOptions[0]?.id ?? 0)
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(sizes[0]?.id ?? null)

  const selectedColor = colorOptions.find((c) => c.id === selectedColorId) ?? colorOptions[0]
  const images = selectedColor?.images ?? []

  // Determine price: size-specific price > base price
  const selectedSize = sizes.find((s) => s.id === selectedSizeId)
  const displayPrice = selectedSize?.price ?? base.price

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      {/* Image preview */}
      <div className="flex-1">
        <BasePreview images={images} />
      </div>

      {/* Base info */}
      <div className="w-full lg:w-96 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">{base.name}</h1>

        {displayPrice != null && displayPrice > 0 && (
          <p className="mt-4 text-3xl font-bold text-foreground">
            {displayPrice} <span className="text-lg font-normal text-muted-foreground">{"\u0433\u0440\u043d"}</span>
          </p>
        )}

        {base.description && (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{base.description}</p>
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
      </div>
    </div>
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

function BasePreview({ images }: { images: BaseImage[] }) {
  const [activeIndex, setActiveIndex] = useState(0)

  // Reset index when images change
  useEffect(() => {
    setActiveIndex(0)
  }, [images])

  const activeImage = images[activeIndex] ?? images[0]

  if (!activeImage) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border bg-muted">
        <Package className="size-16 text-muted-foreground/30" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3">
      {/* Main preview */}
      <div className="relative overflow-hidden rounded-xl border bg-muted/30">
        <div className="relative aspect-square">
          <Image
            src={activeImage.url}
            alt=""
            fill
            className="object-contain p-4"
            sizes="(max-width: 768px) 100vw, 448px"
            priority
          />
        </div>
        {images.length > 1 && (
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
