import { createClient } from "@/lib/supabase/client"

const tableMap: Record<string, string> = {
  bases: "bases",
  colors: "colors",
  sizes: "sizes",
  areas: "areas",
  articles: "articles",
  base_categories: "base_categories",
  base_subcategories: "base_subcategories",
  print_categories: "print_categories",
  print_subcategories: "print_subcategories",
}

// Encode label into URL: "https://...url...__lbl__Основа 1"
function encodeLabel(url: string, label?: string): string {
  if (!label) return url
  // Strip any existing label suffix first
  const base = url.split("__lbl__")[0]
  return `${base}__lbl__${label}`
}

// Decode label from URL; returns { url, label }
export function decodeLabel(raw: string): { url: string; label: string } {
  const idx = raw.indexOf("__lbl__")
  if (idx === -1) return { url: raw, label: "" }
  return { url: raw.substring(0, idx), label: raw.substring(idx + 7) }
}

interface ImageWithZones {
  url: string
  label?: string
  color_id?: number
  zones: { name: string; x: number; y: number; width: number; height: number; is_max?: boolean; price?: number }[]
}

export async function createBase(formData: FormData) {
  const supabase = createClient()

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const categoryId = formData.get("category_id") as string
  const subcategoryId = formData.get("subcategory_id") as string
  const price = formData.get("price") as string
  const articleId = formData.get("article_id") as string
  const colorIdsRaw = formData.get("color_ids") as string
  const colorIds: number[] = colorIdsRaw ? JSON.parse(colorIdsRaw) : []
  const sizeIdsRaw = formData.get("size_ids") as string
  const sizeIds: number[] = sizeIdsRaw ? JSON.parse(sizeIdsRaw) : []
  const imagesWithZonesRaw = formData.get("images_with_zones") as string
  const imagesWithZones: ImageWithZones[] = imagesWithZonesRaw ? JSON.parse(imagesWithZonesRaw) : []
  const isPopular = Boolean(formData.get("is_popular"))

  const { data: base, error } = await supabase
    .from("bases")
    .insert({
      name,
      description,
      base_category_id: categoryId ? parseInt(categoryId) : null,
      base_subcategory_id: subcategoryId ? parseInt(subcategoryId) : null,
      price: price ? parseFloat(price) : 0,
      article_id: articleId ? parseInt(articleId) : null,
      image_url: imagesWithZones[0]?.url || null,
      is_popular: isPopular,
    })
    .select("id")
    .single()

  if (error) {
    console.error("Error creating base:", error)
    throw new Error("Failed to create base")
  }

  if (base?.id) {
    // Insert colors (multiple)
    if (colorIds.length > 0) {
      await supabase.from("base_colors").insert(
        colorIds.map((colorId) => ({ base_id: base.id, color_id: colorId }))
      )
    }
    if (sizeIds.length > 0) {
      await supabase.from("base_sizes").insert(sizeIds.map((sizeId) => ({ base_id: base.id, size_id: sizeId })))
    }
    // Insert images with their color_id and zones
    for (let i = 0; i < imagesWithZones.length; i++) {
      const img = imagesWithZones[i]
      const encodedUrl = encodeLabel(img.url, img.label)
      const { data: insertedImage, error: imgError } = await supabase
        .from("base_images")
        .insert({ 
          base_id: base.id, 
          url: encodedUrl, 
          sort_order: i,
          color_id: img.color_id || null,
        })
        .select("id")
        .single()
      if (imgError) console.error("[v0] Image insert error:", imgError.message)

      if (insertedImage?.id && img.zones.length > 0) {
        const { error: zoneError } = await supabase.from("image_zones").insert(
          img.zones.map((zone) => ({
            base_image_id: insertedImage.id,
            name: zone.name,
            x: zone.x,
            y: zone.y,
            width: zone.width,
            height: zone.height,
            is_max: zone.is_max ?? false,
            price: zone.price ?? 0,
          }))
        )
        if (zoneError) console.error("[v0] Zone insert error:", zoneError.message)
      }
    }
  }
}

export async function updateBase(formData: FormData) {
  const supabase = createClient()

  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const categoryId = formData.get("category_id") as string
  const subcategoryId = formData.get("subcategory_id") as string
  const price = formData.get("price") as string
  const articleId = formData.get("article_id") as string
  const colorIdsRaw = formData.get("color_ids") as string
  const colorIds: number[] = colorIdsRaw ? JSON.parse(colorIdsRaw) : []
  const sizeIdsRaw = formData.get("size_ids") as string
  const sizeIds: number[] = sizeIdsRaw ? JSON.parse(sizeIdsRaw) : []
  const imagesWithZonesRaw = formData.get("images_with_zones") as string
  const imagesWithZones: ImageWithZones[] = imagesWithZonesRaw ? JSON.parse(imagesWithZonesRaw) : []
  const isPopular = Boolean(formData.get("is_popular"))

  const { error } = await supabase
    .from("bases")
    .update({
      name,
      description,
      base_category_id: categoryId ? parseInt(categoryId) : null,
      base_subcategory_id: subcategoryId ? parseInt(subcategoryId) : null,
      price: price ? parseFloat(price) : 0,
      article_id: articleId ? parseInt(articleId) : null,
      image_url: imagesWithZones[0]?.url || null,
      is_popular: isPopular,
    })
    .eq("id", id)

  if (error) {
    console.error("Error updating base:", error)
    throw new Error("Failed to update base")
  }

  // Replace colors (multiple)
  await supabase.from("base_colors").delete().eq("base_id", id)
  if (colorIds.length > 0) {
    await supabase.from("base_colors").insert(
      colorIds.map((colorId) => ({ base_id: parseInt(id), color_id: colorId }))
    )
  }

  await supabase.from("base_sizes").delete().eq("base_id", id)
  if (sizeIds.length > 0) {
    await supabase.from("base_sizes").insert(sizeIds.map((sizeId) => ({ base_id: parseInt(id), size_id: sizeId })))
  }

  // Delete old images (zones will be cascade deleted due to FK)
  await supabase.from("base_images").delete().eq("base_id", id)
  
  // Insert new images with color_id and zones
  for (let i = 0; i < imagesWithZones.length; i++) {
    const img = imagesWithZones[i]
    const encodedUrl = encodeLabel(img.url, img.label)
    const { data: insertedImage, error: imgError } = await supabase
      .from("base_images")
      .insert({ 
        base_id: parseInt(id), 
        url: encodedUrl, 
        sort_order: i,
        color_id: img.color_id || null,
      })
      .select("id")
      .single()
    if (imgError) console.error("[v0] Image update insert error:", imgError.message)

    if (insertedImage?.id && img.zones.length > 0) {
      await supabase.from("image_zones").insert(
        img.zones.map((zone) => ({
          base_image_id: insertedImage.id,
          name: zone.name,
          x: zone.x,
          y: zone.y,
          width: zone.width,
          height: zone.height,
          is_max: zone.is_max ?? false,
          price: zone.price ?? 0,
        }))
      )
    }
  }
}

export async function createMaterial(type: string, formData: FormData) {
  const supabase = createClient()
  const table = tableMap[type]
  if (!table) throw new Error("Invalid material type")

  const name = formData.get("name") as string
  const data: Record<string, unknown> = { name }

  if (type === "colors") data.hex_code = formData.get("hex_code") || null
  if (type === "sizes") {
    const sortOrder = formData.get("sort_order") as string
    data.sort_order = sortOrder ? parseInt(sortOrder) : null
  }
  if (type === "areas" || type === "base_categories" || type === "print_categories" || type === "articles") {
    data.description = formData.get("description") || null
  }
  if (type === "base_subcategories") {
    data.description = formData.get("description") || null
    const parentCategoryId = formData.get("base_category_id") as string
    data.base_category_id = parentCategoryId ? parseInt(parentCategoryId) : null
  }
  if (type === "print_subcategories") {
    const printCategoryId = formData.get("print_category_id") as string
    data.print_category_id = printCategoryId ? parseInt(printCategoryId) : null
  }

  const { error } = await supabase.from(table).insert(data)
  if (error) throw new Error(`Failed to create ${type}`)
}

export async function updateMaterial(type: string, formData: FormData) {
  const supabase = createClient()
  const table = tableMap[type]
  if (!table) throw new Error("Invalid material type")

  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const data: Record<string, unknown> = { name }

  if (type === "colors") data.hex_code = formData.get("hex_code") || null
  if (type === "sizes") {
    const sortOrder = formData.get("sort_order") as string
    data.sort_order = sortOrder ? parseInt(sortOrder) : null
  }
  if (type === "areas" || type === "base_categories" || type === "print_categories" || type === "articles") {
    data.description = formData.get("description") || null
  }
  if (type === "base_subcategories") {
    data.description = formData.get("description") || null
    const parentCategoryId = formData.get("base_category_id") as string
    data.base_category_id = parentCategoryId ? parseInt(parentCategoryId) : null
  }
  if (type === "print_subcategories") {
    const printCategoryId = formData.get("print_category_id") as string
    data.print_category_id = printCategoryId ? parseInt(printCategoryId) : null
  }

  const { error } = await supabase.from(table).update(data).eq("id", id)
  if (error) throw new Error(`Failed to update ${type}`)
}

export async function deleteMaterial(type: string, id: string) {
  const supabase = createClient()
  const table = tableMap[type]
  if (!table) throw new Error("Invalid material type")

  if (type === "bases") {
    await deleteBase(id)
    return
  }

  const { error } = await supabase.from(table).delete().eq("id", id)
  if (error) throw new Error(`Failed to delete ${type}`)
}

async function deleteBase(id: string) {
  const supabase = createClient()

  const { data: base } = await supabase
    .from("bases")
    .select("image_url")
    .eq("id", id)
    .single()

  const { data: extraImages } = await supabase
    .from("base_images")
    .select("url")
    .eq("base_id", id)

  const allUrls: string[] = []
  if (base?.image_url) allUrls.push(base.image_url)
  if (extraImages) allUrls.push(...extraImages.map((img) => img.url))

  if (allUrls.length > 0) {
    const storagePaths = allUrls
      .map((url) => {
        const match = url.match(/\/storage\/v1\/object\/public\/images\/(.+)/)
        return match ? match[1] : null
      })
      .filter(Boolean) as string[]

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage.from("images").remove(storagePaths)
      if (storageError) {
        console.error("Error deleting images from storage:", storageError)
      }
    }
  }

  const { error } = await supabase.from("bases").delete().eq("id", id)
  if (error) throw new Error("Failed to delete base")
}
