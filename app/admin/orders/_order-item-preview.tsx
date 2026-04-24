"use client"

import { useEffect, useState } from "react"
import { Image as ImageIcon } from "lucide-react"
import { generateCompositePreview } from "@/lib/composite-preview"
import { getProductPreviewData } from "./actions"

interface OrderItemPreviewProps {
  itemType: string
  itemId: string
  imageUrl: string | null
  colorName: string | null
  previewDataUrl: string | null
  name: string
}

// Module-level cache so re-expanding an order doesn't re-fetch or re-composite.
const compositeCache = new Map<string, string>()

export function OrderItemPreview({
  itemType,
  itemId,
  imageUrl,
  colorName,
  previewDataUrl,
  name,
}: OrderItemPreviewProps) {
  const [src, setSrc] = useState<string | null>(previewDataUrl ?? imageUrl)

  useEffect(() => {
    if (previewDataUrl) {
      setSrc(previewDataUrl)
      return
    }
    if (itemType !== "product") {
      setSrc(imageUrl)
      return
    }

    const productId = parseInt(itemId)
    if (isNaN(productId)) {
      setSrc(imageUrl)
      return
    }

    const cacheKey = `${productId}:${colorName ?? ""}`
    const cached = compositeCache.get(cacheKey)
    if (cached) {
      setSrc(cached)
      return
    }

    let cancelled = false

    ;(async () => {
      const data = await getProductPreviewData(productId, colorName).catch(() => null)
      if (cancelled || !data) return

      if (!data.printImageUrl || data.zones.length === 0) {
        setSrc(data.baseImageUrl)
        return
      }

      const composited = await generateCompositePreview({
        baseImageUrl: data.baseImageUrl,
        printImageUrl: data.printImageUrl,
        zones: data.zones,
        placements: data.placements,
        size: 240,
      }).catch(() => null)

      if (cancelled) return
      if (composited) {
        compositeCache.set(cacheKey, composited)
        setSrc(composited)
      } else {
        setSrc(data.baseImageUrl)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [itemType, itemId, imageUrl, colorName, previewDataUrl])

  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
      </div>
    )
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} className="h-full w-full object-cover" />
}
