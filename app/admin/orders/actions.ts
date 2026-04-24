"use server"

import { createClient } from "@/lib/supabase/server"

function decodeLabel(raw: string): string {
  const idx = raw.indexOf("__lbl__")
  return idx === -1 ? raw : raw.substring(0, idx)
}

export interface ProductPreviewData {
  baseImageUrl: string
  printImageUrl: string | null
  zones: { id: string; x: number; y: number; width: number; height: number }[]
  placements: Record<
    string,
    { x: number; y: number; scale: number; is_mirrored: boolean; printImageUrl?: string }
  >
}

export async function getProductPreviewData(
  productId: number,
  colorName: string | null,
): Promise<ProductPreviewData | null> {
  const supabase = await createClient()

  const { data: product } = await supabase
    .from("products")
    .select(
      "id, base_id, print_id, print_designs:print_id(id, image_url)",
    )
    .eq("id", productId)
    .single()

  if (!product || !product.base_id) return null

  const primaryPrintId = product.print_id as number | null
  const primaryPrintUrl =
    (product.print_designs as unknown as { image_url: string | null } | null)?.image_url ?? null

  // Resolve color_id from color_name via base_colors → colors.
  let colorId: number | null = null
  if (colorName) {
    const { data: colorRows } = await supabase
      .from("base_colors")
      .select("color_id, colors:color_id(name)")
      .eq("base_id", product.base_id)
    const match = (colorRows ?? []).find(
      (r) =>
        (r.colors as unknown as { name: string } | null)?.name === colorName,
    )
    colorId = (match?.color_id as number | null) ?? null
  }

  // Pick the first base image for the color, falling back to any.
  const imagesRes = await supabase
    .from("base_images")
    .select("id, url, color_id, sort_order")
    .eq("base_id", product.base_id)
    .order("sort_order")
  const allBaseImages = (imagesRes.data ?? []) as Array<{
    id: number
    url: string
    color_id: number | null
    sort_order: number
  }>
  const firstImage =
    (colorId !== null
      ? allBaseImages.find((i) => i.color_id === colorId)
      : undefined) ?? allBaseImages[0]
  if (!firstImage) return null

  // Fetch zones for this image.
  const { data: zonesRaw } = await supabase
    .from("image_zones")
    .select("id, x, y, width, height")
    .eq("base_image_id", firstImage.id)
  const zones = (zonesRaw ?? []).map((z) => ({
    id: String(z.id),
    x: Number(z.x),
    y: Number(z.y),
    width: Number(z.width),
    height: Number(z.height),
  }))

  // Fetch placements for this product.
  const { data: placementsRaw } = await supabase
    .from("product_print_placements")
    .select("zone_id, print_id, x, y, scale, is_mirrored")
    .eq("product_id", productId)

  // Collect secondary prints (zones with a non-primary print_id).
  const secondaryIds = new Set<number>()
  for (const pl of placementsRaw ?? []) {
    if (pl.print_id && pl.print_id !== primaryPrintId) {
      secondaryIds.add(pl.print_id as number)
    }
  }
  const secondaryPrintUrls = new Map<number, string>()
  if (secondaryIds.size > 0) {
    const { data } = await supabase
      .from("print_designs")
      .select("id, image_url")
      .in("id", [...secondaryIds])
    for (const p of (data ?? []) as Array<{ id: number; image_url: string | null }>) {
      if (p.image_url) secondaryPrintUrls.set(p.id, p.image_url)
    }
  }

  const placements: ProductPreviewData["placements"] = {}
  for (const pl of placementsRaw ?? []) {
    if (pl.print_id == null) continue
    placements[String(pl.zone_id)] = {
      x: Number(pl.x),
      y: Number(pl.y),
      scale: Number(pl.scale),
      is_mirrored: pl.is_mirrored ?? false,
      ...(pl.print_id !== primaryPrintId && secondaryPrintUrls.has(pl.print_id as number)
        ? { printImageUrl: secondaryPrintUrls.get(pl.print_id as number)! }
        : {}),
    }
  }

  return {
    baseImageUrl: decodeLabel(firstImage.url),
    printImageUrl: primaryPrintUrl,
    zones,
    placements,
  }
}

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const supabase = await createClient()

  const validStatuses = ["pending", "paid", "processing", "shipped", "completed", "cancelled"]
  if (!validStatuses.includes(newStatus)) {
    throw new Error("Invalid status")
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", orderId)

  if (error) throw new Error("Failed to update order status")

  return { success: true }
}
