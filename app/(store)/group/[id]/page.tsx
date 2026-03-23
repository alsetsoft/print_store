import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { StoreBreadcrumb, type BreadcrumbSegment } from "@/components/store/store-breadcrumb"
import { ProductCard } from "@/components/store/product-card"
import { Package } from "lucide-react"

function decodeLabel(raw: string): string {
  const idx = raw.indexOf("__lbl__")
  return idx === -1 ? raw : raw.substring(0, idx)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: group } = await supabase
    .from("groups")
    .select("name, description")
    .eq("id", parseInt(id))
    .single()

  if (!group) return { title: "\u0413\u0440\u0443\u043f\u0430 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u0430" }

  return {
    title: group.name,
    description: group.description || `\u0422\u043e\u0432\u0430\u0440\u0438 \u0433\u0440\u0443\u043f\u0438 ${group.name}`,
  }
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const groupId = parseInt(id)
  if (isNaN(groupId)) notFound()

  const supabase = await createClient()

  // Fetch group
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description, base_subcategory_id, print_subcategory_id")
    .eq("id", groupId)
    .single()

  if (!group) notFound()

  // Fetch product IDs in this group
  const { data: productGroupsData } = await supabase
    .from("product_groups")
    .select("product_id")
    .eq("group_id", groupId)

  const productIds = (productGroupsData ?? []).map((pg) => pg.product_id)

  if (productIds.length === 0) {
    const breadcrumbItems: BreadcrumbSegment[] = [
      { label: "\u041a\u0430\u0442\u0430\u043b\u043e\u0433", href: "/catalog" },
      { label: group.name },
    ]
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <StoreBreadcrumb items={breadcrumbItems} />
        <h1 className="mb-6 text-2xl font-bold tracking-tight">{group.name}</h1>
        {group.description && (
          <p className="mb-6 text-muted-foreground">{group.description}</p>
        )}
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="mb-4 size-12 text-muted-foreground/30" />
          <h3 className="text-lg font-medium text-foreground">
            {"\u0422\u043e\u0432\u0430\u0440\u0456\u0432 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {"\u0423 \u0446\u0456\u0439 \u0433\u0440\u0443\u043f\u0456 \u043f\u043e\u043a\u0438 \u043d\u0435\u043c\u0430\u0454 \u0442\u043e\u0432\u0430\u0440\u0456\u0432"}
          </p>
        </div>
      </div>
    )
  }

  // Fetch products with relations
  const { data: rawProducts } = await supabase
    .from("products")
    .select(
      `id, name, price, base_id, print_id,
       bases:base_id(id, name, image_url),
       print_designs:print_id(id, name, image_url)`
    )
    .in("id", productIds)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  const products = (rawProducts ?? []) as unknown as Array<{
    id: number
    name: string
    price: number | null
    base_id: number
    print_id: number
    bases: { id: number; name: string; image_url: string | null } | null
    print_designs: { id: number; name: string; image_url: string | null } | null
  }>

  // Enrich with images, zones, placements
  const uniqueBaseIds = [...new Set(products.map((p) => p.base_id))]

  const [imagesRes, placementsRes] = await Promise.all([
    uniqueBaseIds.length > 0
      ? supabase
          .from("base_images")
          .select("id, base_id, url, sort_order")
          .in("base_id", uniqueBaseIds)
          .order("sort_order")
      : Promise.resolve({ data: [] }),
    productIds.length > 0
      ? supabase
          .from("product_print_placements")
          .select("product_id, zone_id, x, y, scale, is_mirrored")
          .in("product_id", productIds)
      : Promise.resolve({ data: [] }),
  ])

  const allImages = (imagesRes.data ?? []) as Array<{
    id: number; base_id: number; url: string; sort_order: number
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
      placements: placementsByProduct.get(p.id) ?? {},
    }
  })

  // Breadcrumb
  const breadcrumbItems: BreadcrumbSegment[] = [
    { label: "\u041a\u0430\u0442\u0430\u043b\u043e\u0433", href: "/catalog" },
    { label: group.name },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <StoreBreadcrumb items={breadcrumbItems} />
      <h1 className="mb-2 text-2xl font-bold tracking-tight">{group.name}</h1>
      {group.description && (
        <p className="mb-6 text-muted-foreground">{group.description}</p>
      )}
      <p className="mb-6 text-sm text-muted-foreground">
        {"\u0412\u0441\u044c\u043e\u0433\u043e"} {enrichedProducts.length} {"\u0442\u043e\u0432\u0430\u0440\u0456\u0432"}
      </p>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {enrichedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
