import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProductDetailClient } from "./product-client"
import { StoreBreadcrumb } from "@/components/store/store-breadcrumb"

function decodeLabel(raw: string): string {
  const idx = raw.indexOf("__lbl__")
  return idx === -1 ? raw : raw.substring(0, idx)
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from("products")
    .select("name")
    .eq("id", parseInt(id))
    .single()

  return { title: data?.name ?? "\u0422\u043e\u0432\u0430\u0440" }
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ color?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const initialColorId = sp.color ? parseInt(sp.color) : null
  const productId = parseInt(id)
  if (isNaN(productId)) notFound()

  const supabase = await createClient()

  // Fetch product with base and print
  const { data: product } = await supabase
    .from("products")
    .select(
      `id, name, price, base_id, print_id, is_active,
       bases:base_id(id, name, description, price),
       print_designs:print_id(id, name, image_url)`
    )
    .eq("id", productId)
    .single()

  if (!product || !product.is_active) notFound()

  const baseId = product.base_id as number

  // Fetch colors, sizes, images, zones, placements in parallel
  const [
    baseColorsRes,
    baseSizesRes,
    baseImagesRes,
    placementsRes,
  ] = await Promise.all([
    supabase
      .from("base_colors")
      .select("color_id, colors:color_id(id, name, hex_code)")
      .eq("base_id", baseId),
    supabase
      .from("base_sizes")
      .select("size_id, price, sizes:size_id(id, name, sort_order)")
      .eq("base_id", baseId),
    supabase
      .from("base_images")
      .select("id, url, color_id, sort_order")
      .eq("base_id", baseId)
      .order("sort_order"),
    supabase
      .from("product_print_placements")
      .select("zone_id, print_id, x, y, scale, is_mirrored")
      .eq("product_id", productId),
  ])

  // Parse colors
  const colors = (baseColorsRes.data ?? [])
    .map((bc) => {
      const c = bc.colors as unknown as { id: number; name: string; hex_code: string | null } | null
      return c ? { id: c.id, name: c.name, hex_code: c.hex_code } : null
    })
    .filter(Boolean) as Array<{ id: number; name: string; hex_code: string | null }>

  // Parse sizes (sorted by sort_order)
  const sizes = (baseSizesRes.data ?? [])
    .map((bs) => {
      const s = bs.sizes as unknown as { id: number; name: string; sort_order: number | null } | null
      return s ? { id: s.id, name: s.name, sort_order: s.sort_order ?? 0, price: bs.price as number | null } : null
    })
    .filter(Boolean) as Array<{ id: number; name: string; sort_order: number; price: number | null }>

  sizes.sort((a, b) => a.sort_order - b.sort_order)

  // Parse images grouped by color_id
  const allImages = (baseImagesRes.data ?? []) as Array<{
    id: number; url: string; color_id: number | null; sort_order: number
  }>

  // Get zones for all base images
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

  // Build placements map with secondary print resolution
  const rawPlacements = (placementsRes.data ?? []) as Array<{
    zone_id: number; print_id: number | null; x: number; y: number; scale: number; is_mirrored: boolean
  }>

  const secondaryPrintIds = new Set<number>()
  for (const pl of rawPlacements) {
    if (pl.print_id && pl.print_id !== (product.print_id as number)) {
      secondaryPrintIds.add(pl.print_id)
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

  const placements: Record<string, { x: number; y: number; scale: number; is_mirrored: boolean; printImageUrl?: string }> = {}
  for (const pl of rawPlacements) {
    placements[String(pl.zone_id)] = {
      x: Number(pl.x),
      y: Number(pl.y),
      scale: Number(pl.scale),
      is_mirrored: pl.is_mirrored ?? false,
      ...(pl.print_id && pl.print_id !== (product.print_id as number) && secondaryPrintUrls.has(pl.print_id)
        ? { printImageUrl: secondaryPrintUrls.get(pl.print_id)! }
        : {}),
    }
  }

  // Group images by color_id with their zones
  type ImageWithZones = {
    id: number
    url: string
    colorId: number | null
    zones: Array<{ id: string; x: number; y: number; width: number; height: number }>
  }

  const imagesByColor = new Map<number | null, ImageWithZones[]>()
  for (const img of allImages) {
    const imgZones = allZones
      .filter((z) => z.base_image_id === img.id)
      .map((z) => ({
        id: String(z.id),
        x: Number(z.x),
        y: Number(z.y),
        width: Number(z.width),
        height: Number(z.height),
      }))

    const entry: ImageWithZones = {
      id: img.id,
      url: decodeLabel(img.url),
      colorId: img.color_id,
      zones: imgZones,
    }

    const key = img.color_id
    const arr = imagesByColor.get(key) ?? []
    arr.push(entry)
    imagesByColor.set(key, arr)
  }

  // Build color options with their images
  const colorOptions = colors.map((color) => {
    const imgs = imagesByColor.get(color.id) ?? imagesByColor.get(null) ?? []
    return {
      ...color,
      images: imgs,
    }
  })

  // If no colors defined, use all images as a single "default" option
  if (colorOptions.length === 0 && allImages.length > 0) {
    const imgs = imagesByColor.get(null) ?? [...imagesByColor.values()].flat()
    colorOptions.push({
      id: 0,
      name: "",
      hex_code: null,
      images: imgs,
    })
  }

  const printDesign = product.print_designs as unknown as { id: number; name: string; image_url: string | null } | null
  const base = product.bases as unknown as { id: number; name: string; description: string | null; price: number | null } | null

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <StoreBreadcrumb items={[
        { label: "\u041a\u0430\u0442\u0430\u043b\u043e\u0433", href: "/catalog" },
        { label: product.name as string },
      ]} />
      <ProductDetailClient
        product={{
          id: product.id as number,
          name: product.name as string,
          description: base?.description ?? null,
          price: product.price as number | null,
        }}
        baseName={base?.name ?? ""}
        printImageUrl={printDesign?.image_url ?? null}
        colorOptions={colorOptions}
        sizes={sizes}
        placements={placements}
        initialColorId={initialColorId}
      />
    </div>
  )
}
