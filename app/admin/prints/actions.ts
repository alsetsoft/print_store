import { createClient } from "@/lib/supabase/client"

export async function createPrint(formData: FormData) {
  const supabase = createClient()

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const priceRaw = formData.get("price") as string
  const categoryId = formData.get("category_id") as string
  const subcategoryId = formData.get("subcategory_id") as string
  const imageUrl = formData.get("image_url") as string
  const isPopular = Boolean(formData.get("is_popular"))

  const { error } = await supabase.from("print_designs").insert({
    name,
    description: description || null,
    price: priceRaw ? parseFloat(priceRaw) : 0,
    print_category_id: categoryId ? parseInt(categoryId) : null,
    print_subcategory_id: subcategoryId ? parseInt(subcategoryId) : null,
    image_url: imageUrl || null,
    is_popular: isPopular,
  })

  if (error) {
    console.error("Error creating print:", error)
    throw new Error("Failed to create print")
  }
}

export async function updatePrint(formData: FormData) {
  const supabase = createClient()

  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const priceRaw = formData.get("price") as string
  const categoryId = formData.get("category_id") as string
  const subcategoryId = formData.get("subcategory_id") as string
  const imageUrl = formData.get("image_url") as string
  const isPopular = Boolean(formData.get("is_popular"))

  const { error } = await supabase
    .from("print_designs")
    .update({
      name,
      description: description || null,
      price: priceRaw ? parseFloat(priceRaw) : 0,
      print_category_id: categoryId ? parseInt(categoryId) : null,
      print_subcategory_id: subcategoryId ? parseInt(subcategoryId) : null,
      image_url: imageUrl || null,
      is_popular: isPopular,
    })
    .eq("id", id)

  if (error) {
    console.error("Error updating print:", error)
    throw new Error("Failed to update print")
  }
}

export async function deletePrint(id: string) {
  const supabase = createClient()

  const { error } = await supabase.from("print_designs").delete().eq("id", id)

  if (error) {
    console.error("Error deleting print:", error)
    throw new Error("Failed to delete print")
  }
}
