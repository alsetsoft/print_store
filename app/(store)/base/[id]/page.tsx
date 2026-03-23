import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BaseDetailClient } from "./base-client"
import { StoreBreadcrumb } from "@/components/store/store-breadcrumb"

function decodeLabel(raw: string): string {
  const idx = raw.indexOf("__lbl__")
  return idx === -1 ? raw : raw.substring(0, idx)
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from("bases")
    .select("name")
    .eq("id", parseInt(id))
    .single()

  return { title: data?.name ?? "\u041e\u0441\u043d\u043e\u0432\u0430" }
}

export default async function BaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const baseId = parseInt(id)
  if (isNaN(baseId)) notFound()

  const supabase = await createClient()

  // Fetch base
  const { data: base } = await supabase
    .from("bases")
    .select("id, name, description, price")
    .eq("id", baseId)
    .single()

  if (!base) notFound()

  // Fetch colors, sizes, images in parallel
  const [baseColorsRes, baseSizesRes, baseImagesRes] = await Promise.all([
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

  type BaseImage = {
    id: number
    url: string
    colorId: number | null
  }

  const imagesByColor = new Map<number | null, BaseImage[]>()
  for (const img of allImages) {
    const entry: BaseImage = {
      id: img.id,
      url: decodeLabel(img.url),
      colorId: img.color_id,
    }
    const key = img.color_id
    const arr = imagesByColor.get(key) ?? []
    arr.push(entry)
    imagesByColor.set(key, arr)
  }

  // Build color options with their images
  const colorOptions = colors.map((color) => {
    const imgs = imagesByColor.get(color.id) ?? imagesByColor.get(null) ?? []
    return { ...color, images: imgs }
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <StoreBreadcrumb items={[
        { label: "\u041e\u0441\u043d\u043e\u0432\u0438", href: "/bases" },
        { label: base.name },
      ]} />
      <BaseDetailClient
        base={{
          id: base.id,
          name: base.name,
          description: base.description ?? null,
          price: base.price ?? null,
        }}
        colorOptions={colorOptions}
        sizes={sizes}
      />
    </div>
  )
}
