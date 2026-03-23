import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Paintbrush } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { ProductCard } from "@/components/store/product-card"
import { StoreBreadcrumb, type BreadcrumbSegment } from "@/components/store/store-breadcrumb"

function decodeLabel(raw: string): string {
  const idx = raw.indexOf("__lbl__")
  return idx === -1 ? raw : raw.substring(0, idx)
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from("print_designs")
    .select("name")
    .eq("id", parseInt(id))
    .single()

  return {
    title: data?.name ?? "\u041f\u0440\u0438\u043d\u0442",
  }
}

export default async function PrintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const printId = parseInt(id)
  if (isNaN(printId)) notFound()

  const supabase = await createClient()

  // Fetch print design
  const { data: print } = await supabase
    .from("print_designs")
    .select("id, name, description, image_url, print_category_id, print_subcategory_id")
    .eq("id", printId)
    .single()

  if (!print) notFound()

  // Fetch category/subcategory names
  const [catRes, subcatRes] = await Promise.all([
    print.print_category_id
      ? supabase.from("print_categories").select("id, name").eq("id", print.print_category_id).single()
      : Promise.resolve({ data: null }),
    print.print_subcategory_id
      ? supabase.from("print_subcategories").select("id, name").eq("id", print.print_subcategory_id).single()
      : Promise.resolve({ data: null }),
  ])

  const category = catRes.data as { id: number; name: string } | null
  const subcategory = subcatRes.data as { id: number; name: string } | null

  // Fetch products using this print
  const { data: rawProducts } = await supabase
    .from("products")
    .select(
      `id, name, price, base_id, print_id,
       bases:base_id(id, name, image_url),
       print_designs:print_id(id, name, image_url)`
    )
    .eq("print_id", printId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  const products = (rawProducts ?? []) as Array<{
    id: number
    name: string
    price: number | null
    base_id: number
    print_id: number
    bases: { id: number; name: string; image_url: string | null } | null
    print_designs: { id: number; name: string; image_url: string | null } | null
  }>

  // Enrich with images, zones, placements (same pattern as catalog)
  const productIds = products.map((p) => p.id)
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <StoreBreadcrumb items={(() => {
        const items: BreadcrumbSegment[] = [{ label: "\u041f\u0440\u0438\u043d\u0442\u0438", href: "/prints" }]
        if (category) {
          items.push({ label: category.name, href: `/prints?category=${category.id}` })
        }
        if (subcategory) {
          items.push({ label: subcategory.name, href: `/prints?subcategory=${subcategory.id}` })
        }
        items.push({ label: print.name })
        return items
      })()} />

      {/* Print info */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start">
        <div className="shrink-0 overflow-hidden rounded-xl border bg-muted/30 md:w-64">
          <div className="relative aspect-square">
            {print.image_url ? (
              <Image
                src={print.image_url}
                alt={print.name}
                fill
                className="object-contain p-4"
                sizes="256px"
                priority
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <Paintbrush className="size-16 text-muted-foreground/30" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{print.name}</h1>
          {print.description && (
            <p className="mt-2 text-muted-foreground">{print.description}</p>
          )}
          {(category || subcategory) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {category && (
                <Link
                  href={`/prints?category=${category.id}`}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  {category.name}
                </Link>
              )}
              {subcategory && (
                <Link
                  href={`/prints?subcategory=${subcategory.id}`}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  {subcategory.name}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Products with this print */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">
          {"\u0422\u043e\u0432\u0430\u0440\u0438 \u0437 \u0446\u0438\u043c \u043f\u0440\u0438\u043d\u0442\u043e\u043c"}
          <span className="ml-1 text-muted-foreground font-normal">({enrichedProducts.length})</span>
        </h2>

        {enrichedProducts.length > 0 ? (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {enrichedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/20 py-16 text-center">
            <Paintbrush className="mb-3 size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {"\u0422\u043e\u0432\u0430\u0440\u0456\u0432 \u0437 \u0446\u0438\u043c \u043f\u0440\u0438\u043d\u0442\u043e\u043c \u0449\u0435 \u043d\u0435\u043c\u0430\u0454"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
