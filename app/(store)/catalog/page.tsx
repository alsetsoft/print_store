import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { CatalogPageClient } from "./catalog-client"
import { StoreBreadcrumb, type BreadcrumbSegment } from "@/components/store/store-breadcrumb"

const PAGE_SIZE = 20

export const metadata: Metadata = {
  title: "\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u043e\u0434\u044f\u0433\u0443 \u0437 \u043f\u0440\u0438\u043d\u0442\u0430\u043c\u0438",
  description:
    "\u041f\u0435\u0440\u0435\u0433\u043b\u044f\u043d\u044c\u0442\u0435 \u043a\u0430\u0442\u0430\u043b\u043e\u0433 \u0442\u043e\u0432\u0430\u0440\u0456\u0432 \u0437 \u043f\u0440\u0438\u043d\u0442\u0430\u043c\u0438: \u0444\u0443\u0442\u0431\u043e\u043b\u043a\u0438, \u0445\u0443\u0434\u0456, \u0447\u0430\u0448\u043a\u0438 \u0442\u0430 \u0456\u043d\u0448\u0435.",
}

function decodeLabel(raw: string): string {
  const idx = raw.indexOf("__lbl__")
  return idx === -1 ? raw : raw.substring(0, idx)
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string
    subcategory?: string
    q?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const page = Math.max(1, parseInt(params.page ?? "1") || 1)
  const categoryId = params.category ? parseInt(params.category) : null
  const subcategoryId = params.subcategory ? parseInt(params.subcategory) : null
  const searchQuery = params.q?.trim() ?? ""

  // Fetch categories & subcategories (small, always needed)
  const [categoriesRes, subcategoriesRes] = await Promise.all([
    supabase.from("base_categories").select("id, name").order("id"),
    supabase.from("base_subcategories").select("id, name, base_category_id").order("id"),
  ])

  const categories = categoriesRes.data ?? []
  const subcategories = subcategoriesRes.data ?? []

  // Build filtered product query
  // We need to filter by base category/subcategory which lives on the `bases` relation.
  // Supabase PostgREST doesn't support filtering on joined columns with .range() well,
  // so we first find matching base_ids, then query products.

  let baseIds: number[] | null = null // null = no filter

  if (subcategoryId) {
    const { data: bases } = await supabase
      .from("bases")
      .select("id")
      .eq("base_subcategory_id", subcategoryId)
    baseIds = (bases ?? []).map((b) => b.id)
  } else if (categoryId) {
    // Get all subcategory ids for this category, then bases
    const subcatIds = subcategories
      .filter((sc) => sc.base_category_id === categoryId)
      .map((sc) => sc.id)

    if (subcatIds.length > 0) {
      const { data: bases } = await supabase
        .from("bases")
        .select("id")
        .in("base_subcategory_id", subcatIds)
      baseIds = (bases ?? []).map((b) => b.id)
    } else {
      baseIds = []
    }
  }

  // Count + fetch paginated products
  let productQuery = supabase
    .from("products")
    .select(
      `id, name, price, base_id, print_id, base_image_id,
       bases:base_id(id, name, image_url, base_category_id, base_subcategory_id),
       print_designs:print_id(id, name, image_url)`,
      { count: "exact" }
    )
    .eq("is_active", true)

  if (baseIds !== null) {
    if (baseIds.length === 0) {
      // No matching bases — short circuit
      const earlyBreadcrumb: BreadcrumbSegment[] = [{ label: "\u041a\u0430\u0442\u0430\u043b\u043e\u0433", href: "/catalog" }]
      if (subcategoryId) {
        const subcat = subcategories.find((sc) => sc.id === subcategoryId)
        const parentCat = subcat ? categories.find((c) => c.id === subcat.base_category_id) : null
        if (parentCat) earlyBreadcrumb.push({ label: parentCat.name, href: `/catalog?category=${parentCat.id}` })
        if (subcat) earlyBreadcrumb.push({ label: subcat.name })
      } else if (categoryId) {
        const cat = categories.find((c) => c.id === categoryId)
        if (cat) earlyBreadcrumb.push({ label: cat.name })
      }
      return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <StoreBreadcrumb items={earlyBreadcrumb} />
          <CatalogPageClient
            categories={categories}
            subcategories={subcategories}
            products={[]}
            totalCount={0}
            page={page}
            pageSize={PAGE_SIZE}
            initialCategoryId={categoryId}
            initialSubcategoryId={subcategoryId}
            initialSearch={searchQuery}
          />
        </div>
      )
    }
    productQuery = productQuery.in("base_id", baseIds)
  }

  if (searchQuery) {
    productQuery = productQuery.ilike("name", `%${searchQuery}%`)
  }

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: rawProducts, count: totalCount } = await productQuery
    .order("created_at", { ascending: false })
    .range(from, to)

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

  // Enrich with images, zones, placements
  const productIds = products.map((p) => p.id)
  const uniqueBaseIds = [...new Set(products.map((p) => p.base_id))]

  const [imagesRes, placementsRes] = await Promise.all([
    uniqueBaseIds.length > 0
      ? supabase
          .from("base_images")
          .select("id, base_id, url, color_id, sort_order")
          .in("base_id", uniqueBaseIds)
          .order("sort_order")
      : Promise.resolve({ data: [] }),
    productIds.length > 0
      ? supabase
          .from("product_print_placements")
          .select("product_id, zone_id, print_id, x, y, scale, is_mirrored")
          .in("product_id", productIds)
      : Promise.resolve({ data: [] }),
  ])

  const allImages = (imagesRes.data ?? []) as Array<{
    id: number; base_id: number; url: string; color_id: number | null; sort_order: number
  }>

  const firstImageByBase = new Map<number, { id: number; url: string }>()
  for (const img of allImages) {
    if (!firstImageByBase.has(img.base_id)) {
      firstImageByBase.set(img.base_id, { id: img.id, url: decodeLabel(img.url) })
    }
  }

  const imageIds = [...firstImageByBase.values()].map((img) => img.id)
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

  const enrichedProducts = products.map((p) => {
    const firstImg = firstImageByBase.get(p.base_id)
    const zones = firstImg ? (zonesByImage.get(firstImg.id) ?? []) : []

    return {
      id: p.id,
      name: p.name,
      price: p.price,
      baseImageUrl: firstImg?.url ?? null,
      printImageUrl: p.print_designs?.image_url ?? null,
      zones: zones.map((z) => ({
        id: String(z.id),
        x: Number(z.x),
        y: Number(z.y),
        width: Number(z.width),
        height: Number(z.height),
      })),
      colorId: (() => {
        const img = allImages.find(i => i.id === p.base_image_id)
        return img?.color_id ?? null
      })(),
      placements: (() => {
        const raw = placementsByProduct.get(p.id) ?? {}
        const resolved: Record<string, { x: number; y: number; scale: number; is_mirrored: boolean; printImageUrl?: string }> = {}
        for (const [zoneId, pl] of Object.entries(raw)) {
          resolved[zoneId] = {
            x: pl.x, y: pl.y, scale: pl.scale, is_mirrored: pl.is_mirrored,
            ...(pl.print_id && pl.print_id !== p.print_id && secondaryPrintUrls.has(pl.print_id)
              ? { printImageUrl: secondaryPrintUrls.get(pl.print_id)! }
              : {}),
          }
        }
        return resolved
      })(),
    }
  })

  // Build breadcrumb
  const breadcrumbItems: BreadcrumbSegment[] = [{ label: "\u041a\u0430\u0442\u0430\u043b\u043e\u0433", href: "/catalog" }]

  if (subcategoryId) {
    const subcat = subcategories.find((sc) => sc.id === subcategoryId)
    const parentCat = subcat ? categories.find((c) => c.id === subcat.base_category_id) : null
    if (parentCat) {
      breadcrumbItems.push({ label: parentCat.name, href: `/catalog?category=${parentCat.id}` })
    }
    if (subcat) {
      breadcrumbItems.push({ label: subcat.name })
    }
  } else if (categoryId) {
    const cat = categories.find((c) => c.id === categoryId)
    if (cat) {
      breadcrumbItems.push({ label: cat.name })
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <StoreBreadcrumb items={breadcrumbItems} />
      <CatalogPageClient
        categories={categories}
        subcategories={subcategories}
        products={enrichedProducts}
        totalCount={totalCount ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        initialCategoryId={categoryId}
        initialSubcategoryId={subcategoryId}
        initialSearch={searchQuery}
      />
    </div>
  )
}
