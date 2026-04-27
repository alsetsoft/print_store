"use client"

import { useState, useEffect, useRef } from "react"
import { X, Loader2, ImageIcon, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { createMaterial, updateMaterial } from "@/app/admin/parameters/actions"
import { uploadImage } from "@/lib/upload"
import { validateImageFile, imageAcceptString } from "@/lib/file-validation"

interface MaterialFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: string
  item?: Record<string, unknown> | null
  categories?: { id: number; name: string }[]
  printCategories?: { id: number; name: string }[]
  onSuccess?: () => void
}

const typeLabels: Record<string, string> = {
  bases: "основу",
  colors: "колір",
  sizes: "розмір",
  areas: "зону друку",
  articles: "\u0430\u0440\u0442\u0438\u043A\u0443\u043B",
  base_categories: "категорію основ",
  base_subcategories: "підкатегорію основ",
  print_categories: "категорію принтів",
  print_subcategories: "підкатегорію принтів",
}

export function ParameterFormDialog({ 
  open, 
  onOpenChange, 
  type, 
  item,
  categories = [],
  printCategories = [],
  onSuccess
}: MaterialFormDialogProps) {
  const [name, setName] = useState("")
  const [hexCode, setHexCode] = useState("")
  const [description, setDescription] = useState("")
  const [sortOrder, setSortOrder] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isBase = type === "bases"
  const isColor = type === "colors"
  const isSize = type === "sizes"
  const isCategory = type === "base_categories" || type === "print_categories"
  const isSubcategory = type === "base_subcategories"
  const isPrintSubcategory = type === "print_subcategories"
  const isArea = type === "areas"
  const isArticle = type === "articles"

  useEffect(() => {
    if (item) {
      setName((item.name as string) || "")
      setHexCode((item.hex_code as string) || "")
      setDescription((item.description as string) || "")
      setSortOrder(item.sort_order?.toString() || "")
      setCategoryId(
        item.base_category_id?.toString() || 
        item.print_category_id?.toString() ||
        (item.base_categories as { id: number } | null)?.id?.toString() || 
        (item.print_categories as { id: number } | null)?.id?.toString() || 
        ""
      )

      setImageUrl((item.image_url as string) || "")
      setPreviewUrl((item.image_url as string) || null)
    } else {
      setName("")
      setHexCode("")
      setDescription("")
      setSortOrder("")
      setCategoryId("")
      setImageUrl("")
      setPreviewUrl(null)
    }
  }, [item, open])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validationError = validateImageFile(file)
    if (validationError) {
      toast.error(validationError)
      e.target.value = ""
      return
    }

    const localPreview = URL.createObjectURL(file)
    setPreviewUrl(localPreview)
    setIsUploading(true)

    try {
      const url = await uploadImage(file, "bases")
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
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append("name", name)
      
      if (isBase) {
        formData.append("description", description)
        formData.append("category_id", categoryId)
        formData.append("image_url", imageUrl)
      }
      if (isColor) {
        formData.append("hex_code", hexCode)
      }
      if (isCategory || isArea) {
        formData.append("description", description)
      }
      if (isSubcategory) {
        formData.append("description", description)
        formData.append("base_category_id", categoryId)
      }
      if (isPrintSubcategory) {
        formData.append("print_category_id", categoryId)
      }
      if (isSize) {
        formData.append("sort_order", sortOrder)
      }

      if (item) {
        formData.append("id", item.id as string)
        await updateMaterial(type, formData)
      } else {
        await createMaterial(type, formData)
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Error saving material:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" 
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {item ? "Редагувати " : "Додати "}{typeLabels[type]}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              {"Назва *"}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введіть назву"
              required
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {isBase && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  {"Опис"}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Короткий опис товару"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  {"Категорія"}
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">{"Оберіть категорію"}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  {"Зображення"}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={imageAcceptString()}
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {previewUrl ? (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-32 w-full rounded-lg border border-border object-contain bg-muted"
                    />
                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute right-2 top-2 rounded-lg bg-destructive p-1.5 text-destructive-foreground shadow-sm hover:bg-destructive/90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/50 transition-colors hover:border-primary hover:bg-muted"
                  >
                    {isUploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {"Завантажити зображення"}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}

          {isColor && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                {"HEX колір"}
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={hexCode || "#000000"}
                  onChange={(e) => setHexCode(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-background"
                />
                <input
                  type="text"
                  value={hexCode}
                  onChange={(e) => setHexCode(e.target.value)}
                  placeholder="#000000"
                  className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {isSize && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                {"Порядок сортування"}
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {(isCategory || isArea || isArticle) && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                {"Опис"}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Короткий опис"
                rows={3}
                className="w-full resize-none rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {isSubcategory && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  {"Категорія основ *"}
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">{"Оберіть категорію"}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  {"Опис"}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Короткий опис підкатегорії"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </>
          )}

          {isPrintSubcategory && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                {"Категорія принтів *"}
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">{"Оберіть категорію"}</option>
                {printCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {"Скасувати"}
            </button>
            <button
              type="submit"
              disabled={isLoading || !name}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {item ? "Зберегти" : "Додати"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
