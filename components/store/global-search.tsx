"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2, Package, Shirt, Paintbrush } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface BaseSearchResult {
  id: number
  name: string
  image_url: string | null
  type: "base"
}

interface PrintSearchResult {
  id: number
  name: string
  image_url: string | null
  type: "print"
}

interface ProductSearchResult {
  id: number
  name: string
  type: "product"
  baseImageUrl: string | null
  printImageUrl: string | null
  zones: { id: string; x: number; y: number; width: number; height: number }[]
  placements: Record<string, { x: number; y: number; scale: number; is_mirrored: boolean }>
}

type SearchResult = BaseSearchResult | PrintSearchResult | ProductSearchResult

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  product: "\u0422\u043e\u0432\u0430\u0440\u0438",
  base: "\u041e\u0441\u043d\u043e\u0432\u0438",
  print: "\u041f\u0440\u0438\u043d\u0442\u0438",
}

const TYPE_ICONS: Record<SearchResult["type"], typeof Package> = {
  product: Package,
  base: Shirt,
  print: Paintbrush,
}

const TYPE_HREF: Record<SearchResult["type"], string> = {
  product: "/product",
  base: "/base",
  print: "/print",
}

function ProductThumb({ item }: { item: ProductSearchResult }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !item.baseImageUrl) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const SIZE = 64
    canvas.width = SIZE
    canvas.height = SIZE

    const baseImg = new Image()
    baseImg.crossOrigin = "anonymous"
    baseImg.src = item.baseImageUrl

    baseImg.onload = () => {
      const scale = Math.min(SIZE / baseImg.naturalWidth, SIZE / baseImg.naturalHeight)
      const w = baseImg.naturalWidth * scale
      const h = baseImg.naturalHeight * scale
      const ox = (SIZE - w) / 2
      const oy = (SIZE - h) / 2

      ctx.clearRect(0, 0, SIZE, SIZE)
      ctx.drawImage(baseImg, ox, oy, w, h)

      if (!item.printImageUrl || item.zones.length === 0) return

      const hasAnyPlacement = Object.keys(item.placements).length > 0
      const zonesToRender = hasAnyPlacement
        ? item.zones.filter((z) => item.placements[z.id])
        : [item.zones[0]]

      for (const zone of zonesToRender) {
        const placement = item.placements[zone.id]
        const zx = ox + (zone.x / 100) * w
        const zy = oy + (zone.y / 100) * h
        const zw = (zone.width / 100) * w
        const zh = (zone.height / 100) * h

        const printImg = new Image()
        printImg.crossOrigin = "anonymous"
        printImg.src = item.printImageUrl!

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
  }, [item.baseImageUrl, item.printImageUrl, item.zones, item.placements])

  if (!item.baseImageUrl) {
    return (
      <div className="flex size-8 items-center justify-center rounded bg-muted">
        <Package className="size-4 text-muted-foreground" />
      </div>
    )
  }

  return <canvas ref={canvasRef} className="size-8 rounded object-cover" />
}

function ResultThumb({ item }: { item: SearchResult }) {
  if (item.type === "product") {
    return <ProductThumb item={item} />
  }

  const Icon = TYPE_ICONS[item.type]
  if (item.image_url) {
    return <img src={item.image_url} alt={item.name} className="size-8 rounded object-cover" />
  }
  return (
    <div className="flex size-8 items-center justify-center rounded bg-muted">
      <Icon className="size-4 text-muted-foreground" />
    </div>
  )
}

export function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    setLoading(true)
    const supabase = createClient()
    const pattern = `%${q}%`

    const [productsRes, basesRes, printsRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, base_id, print_id, base_image_id, print_designs:print_id(image_url)")
        .eq("is_active", true)
        .ilike("name", pattern)
        .limit(5),
      supabase
        .from("bases")
        .select("id, name, image_url")
        .ilike("name", pattern)
        .limit(5),
      supabase
        .from("print_designs")
        .select("id, name, image_url")
        .ilike("name", pattern)
        .limit(5),
    ])

    const rawProducts = (productsRes.data ?? []) as any[]

    // Enrich products with base images, zones, placements
    let enrichedProducts: ProductSearchResult[] = []

    if (rawProducts.length > 0) {
      const productIds = rawProducts.map((p) => p.id)
      const uniqueBaseIds = [...new Set(rawProducts.map((p) => p.base_id))]

      const [imagesRes, placementsRes] = await Promise.all([
        supabase
          .from("base_images")
          .select("id, base_id, url, sort_order")
          .in("base_id", uniqueBaseIds)
          .order("sort_order"),
        supabase
          .from("product_print_placements")
          .select("product_id, zone_id, x, y, scale, is_mirrored")
          .in("product_id", productIds),
      ])

      const allImages = (imagesRes.data ?? []) as Array<{
        id: number; base_id: number; url: string; sort_order: number
      }>

      // Build lookup: image id -> image data
      const imageById = new Map<number, { id: number; url: string }>()
      const firstImageByBase = new Map<number, { id: number; url: string }>()
      for (const img of allImages) {
        const decoded = img.url.indexOf("__lbl__") === -1 ? img.url : img.url.substring(0, img.url.indexOf("__lbl__"))
        imageById.set(img.id, { id: img.id, url: decoded })
        if (!firstImageByBase.has(img.base_id)) {
          firstImageByBase.set(img.base_id, { id: img.id, url: decoded })
        }
      }

      // Use product's specific base_image_id when available, fall back to first image of base
      const getImageForProduct = (p: any) => {
        if (p.base_image_id && imageById.has(p.base_image_id)) {
          return imageById.get(p.base_image_id)!
        }
        return firstImageByBase.get(p.base_id)
      }

      const imageIds = [...new Set(rawProducts.map((p) => getImageForProduct(p)?.id).filter(Boolean))] as number[]
      const zonesRes = imageIds.length > 0
        ? await supabase
            .from("image_zones")
            .select("id, base_image_id, x, y, width, height")
            .in("base_image_id", imageIds)
        : { data: [] }

      const allZones = (zonesRes.data ?? []) as Array<{
        id: number; base_image_id: number; x: number; y: number; width: number; height: number
      }>

      const zonesByImage = new Map<number, typeof allZones>()
      for (const z of allZones) {
        const arr = zonesByImage.get(z.base_image_id) ?? []
        arr.push(z)
        zonesByImage.set(z.base_image_id, arr)
      }

      const allPlacements = (placementsRes.data ?? []) as Array<{
        product_id: number; zone_id: number; x: number; y: number; scale: number; is_mirrored: boolean
      }>
      const placementsByProduct = new Map<number, Record<string, { x: number; y: number; scale: number; is_mirrored: boolean }>>()
      for (const pl of allPlacements) {
        const map = placementsByProduct.get(pl.product_id) ?? {}
        map[String(pl.zone_id)] = {
          x: Number(pl.x),
          y: Number(pl.y),
          scale: Number(pl.scale),
          is_mirrored: pl.is_mirrored ?? false,
        }
        placementsByProduct.set(pl.product_id, map)
      }

      enrichedProducts = rawProducts.map((p) => {
        const img = getImageForProduct(p)
        const zones = img ? (zonesByImage.get(img.id) ?? []) : []

        return {
          id: p.id,
          name: p.name,
          type: "product" as const,
          baseImageUrl: img?.url ?? null,
          printImageUrl: p.print_designs?.image_url ?? null,
          zones: zones.map((z) => ({
            id: String(z.id),
            x: Number(z.x),
            y: Number(z.y),
            width: Number(z.width),
            height: Number(z.height),
          })),
          placements: placementsByProduct.get(p.id) ?? {},
        }
      })
    }

    const items: SearchResult[] = [
      ...enrichedProducts,
      ...(basesRes.data ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        image_url: b.image_url,
        type: "base" as const,
      })),
      ...(printsRes.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        image_url: p.image_url,
        type: "print" as const,
      })),
    ]

    setResults(items)
    setOpen(items.length > 0)
    setActiveIndex(-1)
    setLoading(false)
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 300)
  }

  const navigate = (item: SearchResult) => {
    setOpen(false)
    setQuery("")
    setResults([])
    router.push(`${TYPE_HREF[item.type]}/${item.id}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => (i < results.length - 1 ? i + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => (i > 0 ? i - 1 : results.length - 1))
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault()
      navigate(results[activeIndex])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, item) => {
    if (!acc[item.type]) acc[item.type] = []
    acc[item.type].push(item)
    return acc
  }, {})

  let flatIndex = -1

  return (
    <div ref={containerRef} className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={"\u042f \u0448\u0443\u043a\u0430\u044e..."}
        className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring md:w-56"
      />

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-lg border bg-popover shadow-lg">
          {(["product", "base", "print"] as const).map((type) => {
            const items = grouped[type]
            if (!items || items.length === 0) return null
            const Icon = TYPE_ICONS[type]

            return (
              <div key={type}>
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground">
                  <Icon className="size-3.5" />
                  {TYPE_LABELS[type]}
                </div>
                {items.map((item) => {
                  flatIndex++
                  const idx = flatIndex
                  return (
                    <button
                      key={`${type}-${item.id}`}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        navigate(item)
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                        activeIndex === idx ? "bg-accent" : ""
                      }`}
                    >
                      <ResultThumb item={item} />
                      <span className="line-clamp-1">{item.name}</span>
                    </button>
                  )
                })}
              </div>
            )
          })}

          {query.length >= 2 && results.length > 0 && (
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                setOpen(false)
                setQuery("")
                setResults([])
                router.push(`/catalog?q=${encodeURIComponent(query)}`)
              }}
              className="flex w-full items-center justify-center border-t px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-accent"
            >
              {"\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u0438 \u0432\u0441\u0456 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u0438"}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
