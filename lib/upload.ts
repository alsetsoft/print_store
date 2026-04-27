import { createClient } from "@/lib/supabase/client"

export async function uploadImage(file: File, folder: string = "general"): Promise<string | null> {
  const supabase = createClient()

  const fileExt = file.name.split(".").pop()
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

  const { error } = await supabase.storage
    .from("images")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    })

  if (error) {
    console.error("Upload error:", error)
    return null
  }

  const { data: urlData } = supabase.storage
    .from("images")
    .getPublicUrl(fileName)

  return urlData.publicUrl
}

export async function uploadDataUrl(dataUrl: string, folder: string = "general"): Promise<string | null> {
  try {
    const mimeMatch = dataUrl.match(/^data:([^;]+);/)
    const mime = mimeMatch?.[1] ?? "image/png"
    const ext = mime.split("/")[1] ?? "png"
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const file = new File([blob], `preview.${ext}`, { type: mime })
    return uploadImage(file, folder)
  } catch (e) {
    console.error("uploadDataUrl error:", e)
    return null
  }
}
