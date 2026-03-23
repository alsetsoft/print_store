"use client"

import { useState, useEffect, useRef } from "react"
import { X, Loader2, ImageIcon, Trash2 } from "lucide-react"
import { createPrint, updatePrint } from "@/app/admin/prints/actions"
import { createClient } from "@/lib/supabase/client"
import { uploadImage } from "@/lib/upload"

interface Print {
  id: string
  name: string
  description: string | null
  price: number | null
  image_url: string | null
  print_categories: { id: string; name: string } | null
  print_subcategories: { id: string; name: string } | null
}

interface PrintFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  print?: Print | null
  onSuccess?: () => void
}

interface Category {
  id: string
  name: string
}

interface Color {
  id: string
  name: string
  hex_code: string
}

export function PrintFormDialog({ open, onOpenChange, print, onSuccess }: PrintFormDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [subcategoryId, setSubcategoryId] = useState("")
  const [colorId, setColorId] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Category[]>([])
  const [colors, setColors] = useState<Color[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (print) {
      setName(print.name)
      setDescription(print.description || "")
      setPrice(print.price != null ? String(print.price) : "")
      setCategoryId(print.print_categories?.id || "")
      setSubcategoryId(print.print_subcategories?.id || "")
      setColorId("")
      setImageUrl(print.image_url || "")
      setPreviewUrl(print.image_url || null)
    } else {
      setName("")
      setDescription("")
      setPrice("")
      setCategoryId("")
      setSubcategoryId("")
      setColorId("")
      setImageUrl("")
      setPreviewUrl(null)
    }
  }, [print, open])

  // Fetch categories and colors when dialog opens
  useEffect(() => {
    if (!open) return
    async function fetchOptions() {
      const supabase = createClient()
      const [{ data: cats }, { data: cols }] = await Promise.all([
        supabase.from("print_categories").select("id, name").order("name"),
        supabase.from("colors").select("id, name, hex_code").order("name"),
      ])
      setCategories(cats || [])
      setColors(cols || [])
    }
    fetchOptions()
  }, [open])

  // Fetch subcategories when category changes
  useEffect(() => {
    if (!categoryId) {
      setSubcategories([])
      setSubcategoryId("")
      return
    }
    async function fetchSubcategories() {
      const supabase = createClient()
      const { data } = await supabase
        .from("print_subcategories")
        .select("id, name")
        .eq("print_category_id", categoryId)
        .order("name")
      setSubcategories(data || [])
    }
    fetchSubcategories()
  }, [categoryId])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const localPreview = URL.createObjectURL(file)
    setPreviewUrl(localPreview)
    setIsUploading(true)

    try {
      const url = await uploadImage(file, "prints")
      if (url) {
        setImageUrl(url)
        setPreviewUrl(url)
      } else {
        setPreviewUrl(imageUrl || null)
      }
    } catch (error) {
      console.error("Upload failed:", error)
      setPreviewUrl(imageUrl || null)
    } finally {
      setIsUploading(false)
      URL.revokeObjectURL(localPreview)
    }
  }

  const handleRemoveImage = () => {
    setImageUrl("")
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("name", name)
      formData.append("description", description)
      formData.append("price", price)
      formData.append("category_id", categoryId)
      formData.append("subcategory_id", subcategoryId)
      formData.append("color_id", colorId)
      formData.append("image_url", imageUrl)

      if (print) {
        formData.append("id", print.id)
        await updatePrint(formData)
      } else {
        await createPrint(formData)
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Error saving print:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  const isValid = name.trim() && categoryId && imageUrl

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50 flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {print ? "Редагувати принт" : "Додати принт"}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto p-6">
          <form id="print-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                {"Назва"} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={"Введіть назву принта"}
                required
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                {"Опис"}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={"Короткий опис принта"}
                rows={3}
                className="w-full resize-none rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Price */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                {"\u0426\u0456\u043d\u0430 (\u0433\u0440\u043d)"}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Category + Subcategory side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  {"Категорія"} <span className="text-destructive">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value)
                    setSubcategoryId("")
                  }}
                  required
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">{"Оберіть..."}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  {"Підкатегорія"} <span className="text-destructive">*</span>
                </label>
                <select
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  disabled={!categoryId || subcategories.length === 0}
                  required
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{"Оберіть..."}</option>
                  {subcategories.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Color (optional) */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                {"Колір"}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {"необов'язково"}
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {/* No color option */}
                <button
                  type="button"
                  onClick={() => setColorId("")}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs transition-all ${
                    colorId === ""
                      ? "border-primary scale-110 shadow-md"
                      : "border-border hover:border-muted-foreground"
                  } bg-muted`}
                  title={"Без кольору"}
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
                {colors.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setColorId(color.id)}
                    className={`h-8 w-8 rounded-full border-2 transition-all hover:scale-110 ${
                      colorId === color.id
                        ? "border-primary scale-110 shadow-md ring-2 ring-primary ring-offset-2"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: color.hex_code }}
                    title={color.name}
                  />
                ))}
              </div>
              {colorId && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {colors.find((c) => c.id === colorId)?.name}
                </p>
              )}
            </div>

            {/* Photo */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                {"Фото"} <span className="text-destructive">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-44 w-full rounded-lg border border-border bg-muted object-contain"
                  />
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute right-2 top-2 rounded-lg bg-destructive p-1.5 text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 rounded-lg bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm border border-border transition-colors hover:bg-muted"
                  >
                    {"Замінити"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/50 transition-colors hover:border-primary hover:bg-muted disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {"Натисніть, щоб завантажити"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        PNG, JPG, WEBP
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {"Скасувати"}
          </button>
          <button
            type="submit"
            form="print-form"
            disabled={isLoading || isUploading || !isValid}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {print ? "Зберегти" : "Додати"}
          </button>
        </div>
      </div>
    </div>
  )
}
