import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { ConstructorClient } from "./constructor-client"
import { StoreBreadcrumb } from "@/components/store/store-breadcrumb"

export const metadata: Metadata = {
  title: "\u041a\u043e\u043d\u0441\u0442\u0440\u0443\u043a\u0442\u043e\u0440 \u2014 \u0441\u0442\u0432\u043e\u0440\u0456\u0442\u044c \u0441\u0432\u0456\u0439 \u0434\u0438\u0437\u0430\u0439\u043d",
  description:
    "\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043e\u0441\u043d\u043e\u0432\u0443, \u0434\u043e\u0434\u0430\u0439\u0442\u0435 \u043c\u0430\u043b\u044e\u043d\u043e\u043a, \u043f\u0440\u0438\u043d\u0442, \u0442\u0435\u043a\u0441\u0442 \u0430\u0431\u043e QR-\u043a\u043e\u0434 \u2014 \u043c\u0438 \u043d\u0430\u0434\u0440\u0443\u043a\u0443\u0454\u043c\u043e.",
}

function decodeLabel(raw: string): { url: string; label: string } {
  const idx = raw.indexOf("__lbl__")
  if (idx === -1) return { url: raw, label: "" }
  return { url: raw.substring(0, idx), label: raw.substring(idx + 7) }
}

export default async function ConstructorPage() {
  const supabase = await createClient()

  // Default base: "футболка" id=16
  const { data: baseRow } = await supabase
    .from("bases")
    .select("id, name, price, image_url")
    .eq("id", 16)
    .single()

  if (!baseRow) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">
          {"\u041e\u0441\u043d\u043e\u0432\u0443 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e"}
        </p>
      </div>
    )
  }

  // Fetch base images, zones, colors, and available prints in parallel
  const [imagesRes, colorsRes, printsRes, sizesRes] = await Promise.all([
    supabase
      .from("base_images")
      .select("id, base_id, url, sort_order, color_id")
      .eq("base_id", baseRow.id)
      .order("sort_order"),
    supabase
      .from("base_colors")
      .select("id, color_id, colors:color_id(id, name, hex_code)")
      .eq("base_id", baseRow.id),
    supabase
      .from("print_designs")
      .select("id, name, image_url")
      .order("name")
      .limit(50),
    supabase
      .from("base_sizes")
      .select("size_id, price, sizes:size_id(id, name, sort_order)")
      .eq("base_id", baseRow.id),
  ])

  const rawImages = (imagesRes.data ?? []) as Array<{
    id: number; base_id: number; url: string; sort_order: number; color_id: number | null
  }>

  const imageIds = rawImages.map((img) => img.id)
  const zonesRes = imageIds.length > 0
    ? await supabase
        .from("image_zones")
        .select("id, base_image_id, name, x, y, width, height, is_max, price")
        .in("base_image_id", imageIds)
    : { data: [] }

  const allZones = (zonesRes.data ?? []) as Array<{
    id: number; base_image_id: number; name: string
    x: number; y: number; width: number; height: number; is_max: boolean; price: number | null
  }>

  const zonesByImage = new Map<number, typeof allZones>()
  for (const z of allZones) {
    const arr = zonesByImage.get(z.base_image_id) ?? []
    arr.push(z)
    zonesByImage.set(z.base_image_id, arr)
  }

  const images = rawImages.map((img) => {
    const decoded = decodeLabel(img.url)
    const zones = (zonesByImage.get(img.id) ?? []).map((z) => ({
      id: String(z.id),
      name: z.name,
      x: Number(z.x),
      y: Number(z.y),
      width: Number(z.width),
      height: Number(z.height),
      is_max: z.is_max,
      price: z.price != null ? Number(z.price) : null,
    }))
    return {
      id: String(img.id),
      url: decoded.url,
      label: decoded.label,
      sort_order: img.sort_order,
      color_id: img.color_id ? String(img.color_id) : null,
      zones,
    }
  })

  const colors = ((colorsRes.data ?? []) as unknown as Array<{
    id: number; color_id: number
    colors: { id: number; name: string; hex_code: string } | null
  }>)
    .filter((bc) => bc.colors)
    .map((bc) => ({
      id: String(bc.colors!.id),
      name: bc.colors!.name,
      hex: bc.colors!.hex_code,
    }))

  const prints = ((printsRes.data ?? []) as Array<{
    id: number; name: string; image_url: string | null
  }>).map((p) => ({
    id: String(p.id),
    name: p.name,
    image_url: p.image_url,
  }))

  const sizes = ((sizesRes.data ?? []) as unknown as Array<{
    size_id: number; price: number | null
    sizes: { id: number; name: string; sort_order: number | null } | null
  }>)
    .filter((bs) => bs.sizes)
    .map((bs) => ({
      id: String(bs.sizes!.id),
      name: bs.sizes!.name,
      sort_order: bs.sizes!.sort_order ?? 0,
      price: bs.price,
    }))
    .sort((a, b) => a.sort_order - b.sort_order)

  const base = {
    id: String(baseRow.id),
    name: baseRow.name,
    price: baseRow.price,
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <StoreBreadcrumb items={[{ label: "\u041a\u043e\u043d\u0441\u0442\u0440\u0443\u043a\u0442\u043e\u0440" }]} />
      <ConstructorClient base={base} images={images} colors={colors} prints={prints} sizes={sizes} />
    </div>
  )
}
