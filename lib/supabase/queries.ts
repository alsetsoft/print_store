import type { SupabaseClient } from "@supabase/supabase-js"
import { applySort, DEFAULT_SORT, type SortKey } from "@/lib/sort"

function decodeLabel(raw: string): string {
  const idx = raw.indexOf("__lbl__")
  return idx === -1 ? raw : raw.substring(0, idx)
}

export type EnrichedProductImage = {
  id: number
  url: string
  zones: { id: string; x: number; y: number; width: number; height: number }[]
}

export type EnrichedProduct = {
  id: number
  name: string
  price: number | null
  printImageUrl: string | null
  colorId: number | null
  images: EnrichedProductImage[]
  initialImageIndex: number
  placements: Record<string, { x: number; y: number; scale: number; is_mirrored: boolean; printImageUrl?: string }>
}

export async function fetchEnrichedProducts(
  supabase: SupabaseClient,
  opts?: {
    baseIds?: number[] | null
    productIds?: number[] | null
    printCategoryId?: number | null
    search?: string
    limit?: number
    offset?: number
    count?: boolean
    sort?: SortKey
  }
): Promise<{ products: EnrichedProduct[]; totalCount: number }> {
  const { baseIds = null, productIds: filterProductIds = null, printCategoryId = null, search, limit = 20, offset = 0, count = false, sort = DEFAULT_SORT } = opts ?? {}

  // Short-circuit if baseIds is an empty array (no matching bases)
  if (baseIds !== null && baseIds.length === 0) {
    return { products: [], totalCount: 0 }
  }

  // Short-circuit if productIds filter is an empty array (no matching products)
  if (filterProductIds !== null && filterProductIds.length === 0) {
    return { products: [], totalCount: 0 }
  }

  // If filtering by print category, resolve matching print IDs first
  let printIds: number[] | null = null
  if (printCategoryId) {
    const { data: prints } = await supabase
      .from("print_designs")
      .select("id")
      .eq("print_category_id", printCategoryId)
    printIds = (prints ?? []).map((p) => p.id)
    if (printIds.length === 0) {
      return { products: [], totalCount: 0 }
    }
  }

  let productQuery = supabase
    .from("products")
    .select(
      `id, name, price, base_id, print_id, base_image_id, is_popular,
       bases:base_id(id, name, image_url, base_category_id, base_subcategory_id),
       print_designs:print_id(id, name, image_url)`,
      { count: count ? "exact" : undefined }
    )
    .eq("is_active", true)

  if (baseIds !== null) {
    productQuery = productQuery.in("base_id", baseIds)
  }

  if (filterProductIds !== null) {
    productQuery = productQuery.in("id", filterProductIds)
  }

  if (printIds !== null) {
    productQuery = productQuery.in("print_id", printIds)
  }

  if (search) {
    productQuery = productQuery.ilike("name", `%${search}%`)
  }

  const sortedQuery = applySort(productQuery, sort)

  const { data: rawProducts, count: totalCount } = await sortedQuery.range(offset, offset + limit - 1)

  const products = (rawProducts ?? []) as unknown as Array<{
    id: number
    name: string
    price: number | null
    base_id: number
    print_id: number
    base_image_id: number | null
    bases: { id: number; name: string; image_url: string | null; base_category_id: number | null; base_subcategory_id: number | null } | null
    print_designs: { id: number; name: string; image_url: string | null } | null
  }>

  if (products.length === 0) {
    return { products: [], totalCount: totalCount ?? 0 }
  }

  const productIds = products.map((p) => p.id)
  const uniqueBaseIds = [...new Set(products.map((p) => p.base_id))]

  const [imagesRes, placementsRes] = await Promise.all([
    supabase
      .from("base_images")
      .select("id, base_id, url, color_id, sort_order")
      .in("base_id", uniqueBaseIds)
      .order("sort_order"),
    supabase
      .from("product_print_placements")
      .select("product_id, zone_id, print_id, x, y, scale, is_mirrored")
      .in("product_id", productIds),
  ])

  const allImages = (imagesRes.data ?? []) as Array<{
    id: number; base_id: number; url: string; color_id: number | null; sort_order: number
  }>

  // Group base images by (base_id, color_id) for color-aware filtering later.
  const imagesByBaseAndColor = new Map<string, typeof allImages>()
  const imagesByBase = new Map<number, typeof allImages>()
  for (const img of allImages) {
    const byBase = imagesByBase.get(img.base_id) ?? []
    byBase.push(img)
    imagesByBase.set(img.base_id, byBase)
    const key = `${img.base_id}|${img.color_id ?? ""}`
    const arr = imagesByBaseAndColor.get(key) ?? []
    arr.push(img)
    imagesByBaseAndColor.set(key, arr)
  }

  const imageIds = allImages.map((img) => img.id)
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
    product_id: number; zone_id: number; print_id: number | null; x: number; y: number; scale: number; is_mirrored: boolean
  }>
  const placementsByProduct = new Map<number, Record<string, { x: number; y: number; scale: number; is_mirrored: boolean; print_id: number | null }>>()
  for (const pl of allPlacements) {
    const map = placementsByProduct.get(pl.product_id) ?? {}
    map[String(pl.zone_id)] = {
      x: Number(pl.x),
      y: Number(pl.y),
      scale: Number(pl.scale),
      is_mirrored: pl.is_mirrored ?? false,
      print_id: pl.print_id ?? null,
    }
    placementsByProduct.set(pl.product_id, map)
  }

  // Resolve secondary print image URLs
  const secondaryPrintIds = new Set<number>()
  for (const p of products) {
    const pls = placementsByProduct.get(p.id)
    if (!pls) continue
    for (const pl of Object.values(pls)) {
      if (pl.print_id && pl.print_id !== p.print_id) {
        secondaryPrintIds.add(pl.print_id)
      }
    }
  }

  const secondaryPrintUrls = new Map<number, string>()
  if (secondaryPrintIds.size > 0) {
    const { data: secondaryPrints } = await supabase
      .from("print_designs")
      .select("id, image_url")
      .in("id", [...secondaryPrintIds])
    for (const sp of (secondaryPrints ?? [])) {
      if (sp.image_url) secondaryPrintUrls.set(sp.id as number, sp.image_url as string)
    }
  }

  const enrichedProducts: EnrichedProduct[] = products.map((p) => {
    // Pick the product's color from its primary base_image_id.
    const primaryImg = p.base_image_id != null
      ? allImages.find((i) => i.id === p.base_image_id) ?? null
      : null
    const colorId = primaryImg?.color_id ?? null

    // Images for the card carousel: same color (or all if no color).
    const colorKey = `${p.base_id}|${colorId ?? ""}`
    const scopedImages = imagesByBaseAndColor.get(colorKey)
      ?? imagesByBase.get(p.base_id)
      ?? []

    const images: EnrichedProductImage[] = scopedImages.map((img) => ({
      id: img.id,
      url: decodeLabel(img.url),
      zones: (zonesByImage.get(img.id) ?? []).map((z) => ({
        id: String(z.id),
        x: Number(z.x),
        y: Number(z.y),
        width: Number(z.width),
        height: Number(z.height),
      })),
    }))

    const initialImageIndex = (() => {
      if (p.base_image_id == null) return 0
      const idx = images.findIndex((i) => i.id === p.base_image_id)
      return idx >= 0 ? idx : 0
    })()

    return {
      id: p.id,
      name: p.name,
      price: p.price,
      printImageUrl: p.print_designs?.image_url ?? null,
      colorId,
      images,
      initialImageIndex,
      placements: (() => {
        const raw = placementsByProduct.get(p.id) ?? {}
        const resolved: Record<string, { x: number; y: number; scale: number; is_mirrored: boolean; printImageUrl?: string }> = {}
        for (const [zoneId, pl] of Object.entries(raw)) {
          // Skip orphaned placements whose print_id is NULL and can't be resolved —
          // these come from legacy saves that wiped the field and would otherwise
          // duplicate the primary print visually.
          if (pl.print_id == null) continue
          resolved[zoneId] = {
            x: pl.x, y: pl.y, scale: pl.scale, is_mirrored: pl.is_mirrored,
            ...(pl.print_id !== p.print_id && secondaryPrintUrls.has(pl.print_id)
              ? { printImageUrl: secondaryPrintUrls.get(pl.print_id)! }
              : {}),
          }
        }
        return resolved
      })(),
    }
  })

  return { products: enrichedProducts, totalCount: totalCount ?? 0 }
}
