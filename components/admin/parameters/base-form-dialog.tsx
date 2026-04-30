"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Loader2, ImageIcon, Trash2, Upload, Grid3X3, Star, Link2, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { createBase, updateBase, decodeLabel } from "@/app/admin/parameters/actions"
import { createClient } from "@/lib/supabase/client"
import { ZoneEditorModal, Zone } from "./zone-editor-modal"
import { Switch } from "@/components/ui/switch"
import { validateImageFile, imageAcceptString } from "@/lib/file-validation"

interface BaseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: Record<string, unknown> | null
  categories: { id: number; name: string }[]
  subcategories?: { id: number; name: string; base_category_id: number }[]
  colors?: { id: number; name: string; hex_code: string | null }[]
  sizes?: { id: number; name: string; sort_order: number | null }[]
  articles?: { id: number; name: string }[]
  onSuccess?: () => void
}

interface UploadedImage {
  id: string
  url: string
  uploading: boolean
  file?: File
  localPreview?: string
  zones: Zone[]
  label?: string
}

interface Subcategory {
  id: number
  name: string
  base_category_id: number
}

export function BaseFormDialog({ open, onOpenChange, item, categories, subcategories: subcategoriesProp, colors: colorsProp, sizes: sizesProp, articles: articlesProp = [], onSuccess }: BaseFormDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [subcategoryId, setSubcategoryId] = useState("")
  const [price, setPrice] = useState("")
  const [selectedColorIds, setSelectedColorIds] = useState<number[]>([])
  const [selectedSizeIds, setSelectedSizeIds] = useState<number[]>([])
  const [articleId, setArticleId] = useState("")
  const [isPopular, setIsPopular] = useState(false)
  // Images organized by color: colorId -> array of images
  const [imagesByColor, setImagesByColor] = useState<Record<number, UploadedImage[]>>({})
  const [activeColorTab, setActiveColorTab] = useState<number | null>(null)
  const [subcategories, setSubcategories] = useState<Subcategory[]>(subcategoriesProp || [])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [zoneEditorOpen, setZoneEditorOpen] = useState(false)
  const [editingImageId, setEditingImageId] = useState<string | null>(null)
  const [editingColorId, setEditingColorId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const primaryColorId = selectedColorIds[0] ?? null

  const syncAllZonesFromPrimary = useCallback((imgs: Record<number, UploadedImage[]>, colorIds: number[]): Record<number, UploadedImage[]> => {
    const primary = colorIds[0]
    if (primary == null) return imgs
    const primaryImages = imgs[primary] || []
    if (primaryImages.length === 0) return imgs
    const updated = { ...imgs }
    for (let c = 1; c < colorIds.length; c++) {
      const colorId = colorIds[c]
      const colorImages = updated[colorId] || []
      updated[colorId] = colorImages.map((img, idx) => {
        const source = primaryImages[idx]
        return { ...img, zones: source?.zones || [], label: source?.label ?? img.label }
      })
    }
    return updated
  }, [])

  // Use ref for immediate sync (state updates are async and cause race conditions)
  const skipSubcategoryResetRef = useRef(false)

  useEffect(() => {
    if (!categoryId) {
      setSubcategories(subcategoriesProp ? subcategoriesProp.filter(s => s.base_category_id === parseInt(categoryId || "0")) : [])
      if (!skipSubcategoryResetRef.current) setSubcategoryId("")
      return
    }
    if (subcategoriesProp) {
      setSubcategories(subcategoriesProp.filter(s => s.base_category_id === parseInt(categoryId)))
      // Only reset subcategoryId when user manually changes category
      if (!skipSubcategoryResetRef.current) setSubcategoryId("")
      skipSubcategoryResetRef.current = false
      return
    }
    const loadSubs = async () => {
      const { data } = await supabase
        .from("base_subcategories")
        .select("id, name, base_category_id")
        .eq("base_category_id", parseInt(categoryId))
        .order("name")
      setSubcategories(data || [])
      if (!skipSubcategoryResetRef.current) setSubcategoryId("")
      skipSubcategoryResetRef.current = false
    }
    loadSubs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, subcategoriesProp])

  useEffect(() => {
    if (!open) return
    if (item) {
      // Set ref flag BEFORE setting categoryId to prevent subcategory reset
      skipSubcategoryResetRef.current = true
      setName((item.name as string) || "")
      setDescription((item.description as string) || "")
      setCategoryId(item.base_category_id?.toString() || "")
      setSubcategoryId(item.base_subcategory_id?.toString() || "")
      setPrice(item.price?.toString() || "")
      setArticleId(item.article_id?.toString() || "")
      setIsPopular(Boolean(item.is_popular))
      // Load colors from base_colors junction table
      const loadColors = async () => {
        const { data } = await supabase
          .from("base_colors")
          .select("color_id")
          .eq("base_id", item.id)
        const colorIds = (data || []).map((r: { color_id: number }) => r.color_id)
        setSelectedColorIds(colorIds)
        if (colorIds.length > 0) setActiveColorTab(colorIds[0])
      }
      loadColors()
      // Load sizes for this base
      const loadSizes = async () => {
        const { data } = await supabase
          .from("base_sizes")
          .select("size_id")
          .eq("base_id", item.id)
        setSelectedSizeIds((data || []).map((r: { size_id: number }) => r.size_id))
      }
      loadSizes()
      // Load all images from base_images table with their zones, organized by color
      const loadImages = async () => {
        const { data } = await supabase
          .from("base_images")
          .select("*")
          .eq("base_id", item.id)
          .order("sort_order")
        if (data && data.length > 0) {
          // Load zones for each image, preserving sort_order
          const resolved = await Promise.all(
            data.map(async (img, index) => {
              const { data: zonesData } = await supabase
                .from("image_zones")
                .select("id, name, x, y, width, height, is_max, price")
                .eq("base_image_id", img.id)
              const uploadedImg: UploadedImage = {
                id: String(img.id),
                url: decodeLabel(img.url).url,
                uploading: false,
                zones: (zonesData || []).map((z) => ({
                  id: z.id.toString(),
                  name: z.name,
                  x: Number(z.x),
                  y: Number(z.y),
                  width: Number(z.width),
                  height: Number(z.height),
                  is_max: z.is_max ?? false,
                  price: Number(z.price) || 0,
                })),
                label: decodeLabel(img.url).label || `\u041E\u0441\u043D\u043E\u0432\u0430 ${index + 1}`,
              }
              return { uploadedImg, colorId: img.color_id || 0, sortIndex: index }
            })
          )
          // Sort by original query order then group by color
          resolved.sort((a, b) => a.sortIndex - b.sortIndex)
          const imgByColor: Record<number, UploadedImage[]> = {}
          for (const { uploadedImg, colorId } of resolved) {
            if (!imgByColor[colorId]) imgByColor[colorId] = []
            imgByColor[colorId].push(uploadedImg)
          }
          // After loading, sync zones from primary color to all others
          const { data: colorData } = await supabase
            .from("base_colors")
            .select("color_id")
            .eq("base_id", item.id)
          const loadedColorIds = (colorData || []).map((r: { color_id: number }) => r.color_id)
          if (loadedColorIds.length > 1) {
            setImagesByColor(syncAllZonesFromPrimary(imgByColor, loadedColorIds))
          } else {
            setImagesByColor(imgByColor)
          }
        } else if (item.image_url) {
          // Fallback to single image_url for old records
          const raw = item.image_url as string
          const { url, label } = decodeLabel(raw)
          setImagesByColor({ 0: [{ id: "main", url, uploading: false, zones: [], label: label || "Основа 1" }] })
        } else {
          setImagesByColor({})
        }
      }
      loadImages()
    } else {
      // Reset for new item creation
      skipSubcategoryResetRef.current = false
      setName("")
      setDescription("")
      setCategoryId("")
      setSubcategoryId("")
      setPrice("")
      setSelectedColorIds([])
      setSelectedSizeIds([])
      setArticleId("")
      setImagesByColor({})
      setActiveColorTab(null)
      setIsPopular(false)
    }
    setErrors({})
  }, [item, open])

  const uploadFileToSupabase = useCallback(async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop()
    const path = `bases/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
    const { error } = await supabase.storage.from("images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    })
    if (error) {
      return null
    }
    const { data } = supabase.storage.from("images").getPublicUrl(path)
    return data.publicUrl
  }, [supabase])

  const handleFilesChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, colorId: number) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (fileInputRef.current) fileInputRef.current.value = ""

    const validFiles: File[] = []
    for (const file of files) {
      const validationError = validateImageFile(file)
      if (validationError) {
        toast.error(`${file.name}: ${validationError}`)
        continue
      }
      validFiles.push(file)
    }
    if (!validFiles.length) return

    // Use index to guarantee unique IDs even if files are selected simultaneously
    const timestamp = Date.now()
    const currentCount = imagesByColor[colorId]?.length || 0
    const placeholders: UploadedImage[] = validFiles.map((file, index) => ({
      id: `tmp-${timestamp}-${index}-${Math.random().toString(36).substring(2)}`,
      url: "",
      uploading: true,
      file,
      localPreview: URL.createObjectURL(file),
      zones: [],
      label: `Вигляд ${currentCount + index + 1}`,
    }))

    // Add all placeholders for this color
    setImagesByColor((prev) => ({
      ...prev,
      [colorId]: [...(prev[colorId] || []), ...placeholders],
    }))

    // Upload each file concurrently and update each placeholder individually
    await Promise.all(
      placeholders.map(async (placeholder, index) => {
        const remoteUrl = await uploadFileToSupabase(placeholder.file!)
        setImagesByColor((prev) => {
          const updated = {
            ...prev,
            [colorId]: (prev[colorId] || []).map((img) =>
              img.id === placeholder.id
                ? { ...img, url: remoteUrl || "", uploading: false }
                : img
            ),
          }
          // If uploading to a non-primary color, copy zones from primary at same index
          const primary = selectedColorIds[0]
          if (primary != null && colorId !== primary) {
            const primaryImages = updated[primary] || []
            const imgIndex = currentCount + index
            if (primaryImages[imgIndex]?.zones?.length) {
              updated[colorId] = (updated[colorId] || []).map((img) =>
                img.id === placeholder.id
                  ? { ...img, zones: primaryImages[imgIndex].zones }
                  : img
              )
            }
          }
          return updated
        })
      })
    )
  }, [uploadFileToSupabase, imagesByColor, selectedColorIds])

  const handleRemoveImage = (colorId: number, id: string) => {
    setImagesByColor((prev) => {
      const images = prev[colorId] || []
      const img = images.find((i) => i.id === id)
      if (img?.localPreview) URL.revokeObjectURL(img.localPreview)
      return {
        ...prev,
        [colorId]: images.filter((i) => i.id !== id),
      }
    })
  }

  const handleMoveImage = (colorId: number, imageId: string, direction: -1 | 1) => {
    setImagesByColor((prev) => {
      const images = prev[colorId] || []
      const idx = images.findIndex((i) => i.id === imageId)
      if (idx < 0) return prev
      const newIdx = idx + direction
      if (newIdx < 0 || newIdx >= images.length) return prev
      const updated = { ...prev }
      // Swap on the active color
      const arr = [...images]
      ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
      updated[colorId] = arr
      // If moving on primary color, also swap at same indices on all other colors
      if (colorId === primaryColorId) {
        for (let c = 1; c < selectedColorIds.length; c++) {
          const cId = selectedColorIds[c]
          const cImages = updated[cId] || []
          if (cImages.length > Math.max(idx, newIdx)) {
            const cArr = [...cImages]
            ;[cArr[idx], cArr[newIdx]] = [cArr[newIdx], cArr[idx]]
            updated[cId] = cArr
          }
        }
      }
      return updated
    })
  }

  const handleOpenZoneEditor = (colorId: number, imageId: string) => {
    setEditingColorId(colorId)
    setEditingImageId(imageId)
    setZoneEditorOpen(true)
  }

  const handleLabelChange = (colorId: number, imageId: string, newLabel: string) => {
    setImagesByColor((prev) => {
      const editingImages = prev[colorId] || []
      const editedIndex = editingImages.findIndex((img) => img.id === imageId)
      const updated = {
        ...prev,
        [colorId]: editingImages.map((img) =>
          img.id === imageId ? { ...img, label: newLabel } : img
        ),
      }
      // If editing primary color, propagate label to same index in all other colors
      if (colorId === primaryColorId && editedIndex >= 0) {
        for (let c = 1; c < selectedColorIds.length; c++) {
          const cId = selectedColorIds[c]
          const colorImages = updated[cId] || []
          if (colorImages[editedIndex]) {
            updated[cId] = colorImages.map((img, idx) =>
              idx === editedIndex ? { ...img, label: newLabel } : img
            )
          }
        }
      }
      return updated
    })
  }

  const handleZonesChange = (newZones: Zone[]) => {
    if (!editingImageId || editingColorId === null) return
    setImagesByColor((prev) => {
      // Update zones on the edited image
      const editingImages = prev[editingColorId] || []
      const editedIndex = editingImages.findIndex((img) => img.id === editingImageId)
      const updated = {
        ...prev,
        [editingColorId]: editingImages.map((img) =>
          img.id === editingImageId ? { ...img, zones: newZones } : img
        ),
      }
      // If editing primary color, propagate zones to same index in all other colors
      if (editingColorId === primaryColorId && editedIndex >= 0) {
        for (let c = 1; c < selectedColorIds.length; c++) {
          const colorId = selectedColorIds[c]
          const colorImages = updated[colorId] || []
          if (colorImages[editedIndex]) {
            updated[colorId] = colorImages.map((img, idx) =>
              idx === editedIndex ? { ...img, zones: newZones } : img
            )
          }
        }
      }
      return updated
    })
  }

  const editingImage = editingColorId !== null 
    ? (imagesByColor[editingColorId] || []).find((img) => img.id === editingImageId)
    : undefined
  const editingImageUrl = editingImage?.url || editingImage?.localPreview || ""
  const editingImageZones = editingImage?.zones || []

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = "Назва обовязкова"
    if (!description.trim()) errs.description = "Опис обовязковий"
    if (!categoryId) errs.categoryId = "Оберіть категорію"
    if (!subcategoryId) errs.subcategoryId = "Оберіть підкатегорію"
    if (colorsProp && colorsProp.length > 0 && selectedColorIds.length === 0) errs.colorId = "Оберіть хоча б один колір"
    if (sizesProp && sizesProp.length > 0 && selectedSizeIds.length === 0) errs.sizeIds = "Оберіть хоча б один розмір"
    if (!articleId) errs.articleId = "\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u0430\u0440\u0442\u0438\u043A\u0443\u043B"
    if (!price || parseFloat(price) < 0) errs.price = "Введіть коректну ціну"
    // Check primary color has at least one image with zones
    const primary = selectedColorIds[0]
    const primaryImages = primary != null ? (imagesByColor[primary] || []).filter((i) => !i.uploading && i.url) : []
    if (primaryImages.length === 0) {
      errs.images = "\u0414\u043E\u0434\u0430\u0439\u0442\u0435 \u0445\u043E\u0447\u0430 \u0431 \u043E\u0434\u043D\u0435 \u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u043D\u044F \u0434\u043B\u044F \u043A\u043E\u0436\u043D\u043E\u0433\u043E \u043A\u043E\u043B\u044C\u043E\u0440\u0443"
    }
    if (primaryImages.some((i) => i.zones.length === 0)) {
      errs.zones = "\u041A\u043E\u0436\u043D\u0435 \u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u043D\u044F \u043F\u043E\u0432\u0438\u043D\u043D\u043E \u043C\u0430\u0442\u0438 \u0445\u043E\u0447\u0430 \u0431 \u043E\u0434\u043D\u0443 \u0437\u043E\u043D\u0443 \u0434\u043B\u044F \u043F\u0440\u0438\u043D\u0442\u0430"
    }
    // Enforce same image count across all colors
    if (primary != null && selectedColorIds.length > 1) {
      const expectedCount = primaryImages.length
      for (let c = 1; c < selectedColorIds.length; c++) {
        const colorImages = (imagesByColor[selectedColorIds[c]] || []).filter((i) => !i.uploading && i.url)
        if (colorImages.length !== expectedCount) {
          errs.images = `\u0412\u0441\u0456 \u043A\u043E\u043B\u044C\u043E\u0440\u0438 \u043F\u043E\u0432\u0438\u043D\u043D\u0456 \u043C\u0430\u0442\u0438 \u043E\u0434\u043D\u0430\u043A\u043E\u0432\u0443 \u043A\u0456\u043B\u044C\u043A\u0456\u0441\u0442\u044C \u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u044C (${expectedCount})`
          break
        }
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    try {
      // Build images with zones array for the action, including color_id for each image
      const imagesWithZones: { url: string; label: string; color_id: number; zones: { name: string; x: number; y: number; width: number; height: number; is_max?: boolean; price?: number }[] }[] = []
      for (const colorId of selectedColorIds) {
        const colorImages = (imagesByColor[colorId] || []).filter((i) => !i.uploading && i.url)
        for (const i of colorImages) {
          imagesWithZones.push({
            url: i.url,
            label: i.label || "",
            color_id: colorId,
            zones: i.zones.map((z) => ({
              name: z.name,
              x: z.x,
              y: z.y,
              width: z.width,
              height: z.height,
              is_max: z.is_max,
              price: z.price ?? 0,
            })),
          })
        }
      }

      const formData = new FormData()
      formData.append("name", name.trim())
      formData.append("description", description.trim())
      formData.append("category_id", categoryId)
      formData.append("subcategory_id", subcategoryId)
      formData.append("price", price)
      formData.append("color_ids", JSON.stringify(selectedColorIds))
      formData.append("size_ids", JSON.stringify(selectedSizeIds))
      formData.append("article_id", articleId)
      formData.append("images_with_zones", JSON.stringify(imagesWithZones))
      formData.append("is_popular", isPopular ? "1" : "")
      if (item) {
        formData.append("id", item.id as string)
        await updateBase(formData)
      } else {
        await createBase(formData)
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      console.error("Error saving base:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  const isAnyUploading = Object.values(imagesByColor).some((imgs) => imgs.some((i) => i.uploading))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="relative z-50 flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-xl">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground" suppressHydrationWarning>
            {item ? "Редагувати основу" : "Додати основу"}
          </h2>
          <button onClick={() => onOpenChange(false)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form id="base-form" onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground" suppressHydrationWarning>
                {"Назва"} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Наприклад: Футболка Gildan 64000"
                className={`w-full rounded-lg border px-4 py-2.5 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${errors.name ? "border-destructive focus:border-destructive focus:ring-destructive" : "border-input focus:border-primary focus:ring-primary"}`}
              />
              {errors.name && <p className="mt-1 text-xs text-destructive" suppressHydrationWarning>{errors.name}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground" suppressHydrationWarning>
                {"Опис"} <span className="text-destructive">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Короткий опис товару"
                rows={3}
                className={`w-full resize-none rounded-lg border px-4 py-2.5 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${errors.description ? "border-destructive focus:border-destructive focus:ring-destructive" : "border-input focus:border-primary focus:ring-primary"}`}
              />
              {errors.description && <p className="mt-1 text-xs text-destructive" suppressHydrationWarning>{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground" suppressHydrationWarning>
                  {"Категорія"} <span className="text-destructive">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 ${errors.categoryId ? "border-destructive focus:border-destructive focus:ring-destructive" : "border-input focus:border-primary focus:ring-primary"}`}
                >
                  <option value="">{"Оберіть..."}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {errors.categoryId && <p className="mt-1 text-xs text-destructive" suppressHydrationWarning>{errors.categoryId}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground" suppressHydrationWarning>
                  {"Підкатегорія"} <span className="text-destructive">*</span>
                </label>
                <select
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  disabled={!categoryId || subcategories.length === 0}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${errors.subcategoryId ? "border-destructive focus:border-destructive focus:ring-destructive" : "border-input focus:border-primary focus:ring-primary"}`}
                >
                  <option value="">{"Оберіть..."}</option>
                  {subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
                {errors.subcategoryId && <p className="mt-1 text-xs text-destructive" suppressHydrationWarning>{errors.subcategoryId}</p>}
              </div>
            </div>

            {/* Color multi-selector */}
            {colorsProp && colorsProp.length > 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground" suppressHydrationWarning>
                  {"Кольори"} <span className="text-destructive">*</span>
                </label>
                <p className="mb-1.5 text-xs text-muted-foreground">
                  {"Оберіть всі кольори, в яких доступна ця основа"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {colorsProp.map((c) => {
                    const selected = selectedColorIds.includes(c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedColorIds((prev) => {
                            const newIds = selected
                              ? prev.filter((id) => id !== c.id)
                              : [...prev, c.id]
                            // If deselecting, remove images for this color
                            if (selected) {
                              setImagesByColor((prevImgs) => {
                                const copy = { ...prevImgs }
                                delete copy[c.id]
                                return copy
                              })
                            }
                            // Set active tab to first selected color
                            if (!selected && newIds.length === 1) {
                              setActiveColorTab(c.id)
                            } else if (selected && activeColorTab === c.id) {
                              setActiveColorTab(newIds[0] || null)
                            }
                            return newIds
                          })
                        }}
                        title={c.name}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors ${
                          selected
                            ? "border-primary bg-primary/10 font-medium text-primary"
                            : "border-input bg-background text-foreground hover:border-primary"
                        }`}
                      >
                        {c.hex_code && (
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-border"
                            style={{ backgroundColor: c.hex_code }}
                          />
                        )}
                        {c.name}
                      </button>
                    )
                  })}
                </div>
                {errors.colorId && <p className="mt-1 text-xs text-destructive">{errors.colorId}</p>}
              </div>
            )}

            {/* Sizes multi-select */}
            {sizesProp && sizesProp.length > 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground" suppressHydrationWarning>
                  {"Розміри"} <span className="text-destructive">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {sizesProp.map((size) => {
                    const selected = selectedSizeIds.includes(size.id)
                    return (
                      <button
                        key={size.id}
                        type="button"
                        onClick={() =>
                          setSelectedSizeIds((prev) =>
                            selected ? prev.filter((id) => id !== size.id) : [...prev, size.id]
                          )
                        }
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background text-foreground hover:border-primary hover:text-primary"
                        }`}
                      >
                        {size.name}
                      </button>
                    )
                  })}
                </div>
                {errors.sizeIds && <p className="mt-1 text-xs text-destructive">{errors.sizeIds}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  {"\u0410\u0440\u0442\u0438\u043A\u0443\u043B"} <span className="text-destructive">*</span>
                </label>
                <select
                  value={articleId}
                  onChange={(e) => setArticleId(e.target.value)}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 ${errors.articleId ? "border-destructive focus:border-destructive focus:ring-destructive" : "border-input focus:border-primary focus:ring-primary"}`}
                >
                  <option value="">{"\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u0430\u0440\u0442\u0438\u043A\u0443\u043B"}</option>
                  {articlesProp.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                {errors.articleId && <p className="mt-1 text-xs text-destructive">{errors.articleId}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Ціна <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${errors.price ? "border-destructive focus:border-destructive focus:ring-destructive" : "border-input focus:border-primary focus:ring-primary"}`}
                />
                {errors.price && <p className="mt-1 text-xs text-destructive">{errors.price}</p>}
              </div>
            </div>

            {/* Popular flag */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{"Популярна"}</p>
                <p className="text-xs text-muted-foreground">
                  {"Показувати першою у сортуванні «Популярне»"}
                </p>
              </div>
              <Switch checked={isPopular} onCheckedChange={setIsPopular} />
            </div>

            {/* Images per color */}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground" suppressHydrationWarning>
                {"Зображення"} <span className="text-destructive">*</span>
              </label>
              {selectedColorIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-input bg-muted/30 px-4 py-8 text-center">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground" suppressHydrationWarning>
                    {"Спочатку оберіть колір"}
                  </p>
                  <p className="max-w-xs text-xs text-muted-foreground" suppressHydrationWarning>
                    {"Зображення додаються окремо для кожного кольору основи"}
                  </p>
                </div>
              ) : (
                <>
                <p className="mb-2 text-xs text-muted-foreground">
                  {"Додайте фото для кожного кольору: спереду, ззаду, збоку тощо"}
                </p>

                {/* Color tabs */}
                <div className="mb-3 flex flex-wrap gap-1.5 rounded-lg border border-input bg-muted/30 p-1">
                  {selectedColorIds.map((colorId) => {
                    const color = colorsProp?.find((c) => c.id === colorId)
                    const isActive = activeColorTab === colorId
                    const isPrimary = colorId === primaryColorId
                    const colorImages = imagesByColor[colorId] || []
                    const hasImages = colorImages.some((i) => !i.uploading && i.url)
                    return (
                      <button
                        key={colorId}
                        type="button"
                        onClick={() => setActiveColorTab(colorId)}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {color?.hex_code && (
                          <span
                            className="h-3 w-3 rounded-full border border-border"
                            style={{ backgroundColor: color.hex_code }}
                          />
                        )}
                        {color?.name || `Колір ${colorId}`}
                        {isPrimary && <Star className="h-3 w-3 text-amber-500" />}
                        {!isPrimary && <Link2 className="h-3 w-3 text-muted-foreground" />}
                        {hasImages && (
                          <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary">
                            {colorImages.filter((i) => !i.uploading && i.url).length}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Images for active color */}
                {activeColorTab !== null && (() => {
                  const isActiveColorPrimary = activeColorTab === primaryColorId
                  return (
                  <div>
                    {!isActiveColorPrimary && (
                      <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                        <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{"\u0417\u043E\u043D\u0438 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E \u043A\u043E\u043F\u0456\u044E\u044E\u0442\u044C\u0441\u044F \u0437 \u043F\u0435\u0440\u0448\u043E\u0433\u043E \u043A\u043E\u043B\u044C\u043E\u0440\u0443. \u0420\u0435\u0434\u0430\u0433\u0443\u0439\u0442\u0435 \u0437\u043E\u043D\u0438 \u043D\u0430 \u0432\u043A\u043B\u0430\u0434\u0446\u0456 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0433\u043E \u043A\u043E\u043B\u044C\u043E\u0440\u0443."}</span>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={imageAcceptString()}
                      multiple
                      onChange={(e) => handleFilesChange(e, activeColorTab)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/30 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-muted/60"
                      suppressHydrationWarning
                    >
                      <Upload className="h-4 w-4" />
                      {"\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u043D\u044F"}
                    </button>

                    {(imagesByColor[activeColorTab] || []).length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        {(imagesByColor[activeColorTab] || []).map((img, imgIdx) => {
                          const totalImages = (imagesByColor[activeColorTab] || []).length
                          const displaySrc = img.uploading
                            ? img.localPreview
                            : (img.url || img.localPreview)
                          const hasZones = img.zones && img.zones.length > 0
                          const needsZones = !img.uploading && displaySrc && !hasZones

                          return (
                            <div key={img.id} className="flex flex-col">
                              <div
                                className={`group relative aspect-square overflow-hidden rounded-lg border-2 bg-muted transition-all ${
                                  needsZones && errors.zones && isActiveColorPrimary
                                    ? "border-destructive"
                                    : hasZones
                                    ? "border-primary/50"
                                    : "border-border"
                                } ${!img.uploading && displaySrc && isActiveColorPrimary ? "cursor-pointer hover:border-primary" : ""}`}
                                onClick={() => {
                                  if (!img.uploading && displaySrc && isActiveColorPrimary) {
                                    handleOpenZoneEditor(activeColorTab, img.id)
                                  }
                                }}
                              >
                                {displaySrc ? (
                                  <>
                                    <img
                                      src={displaySrc}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                    {img.zones && img.zones.map((zone) => (
                                      <div
                                        key={zone.id}
                                        className="absolute border border-primary/60 bg-primary/20"
                                        style={{
                                          left: `${zone.x}%`,
                                          top: `${zone.y}%`,
                                          width: `${zone.width}%`,
                                          height: `${zone.height}%`,
                                        }}
                                      />
                                    ))}
                                    {img.uploading && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                      </div>
                                    )}
                                    {!img.uploading && isActiveColorPrimary && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-foreground/60 opacity-0 transition-opacity group-hover:opacity-100">
                                        <div className="flex flex-col items-center text-white">
                                          <Grid3X3 className="h-5 w-5" />
                                          <span className="mt-1 text-xs font-medium">
                                            {hasZones ? "\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438" : "\u0414\u043E\u0434\u0430\u0442\u0438 \u0437\u043E\u043D\u0438"}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    {!img.uploading && !isActiveColorPrimary && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-foreground/60 opacity-0 transition-opacity group-hover:opacity-100">
                                        <div className="flex flex-col items-center text-white">
                                          <Link2 className="h-5 w-5" />
                                          <span className="mt-1 text-xs font-medium">
                                            {"\u0417\u043E\u043D\u0438 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0456\u0437\u043E\u0432\u0430\u043D\u0456"}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    {hasZones && (
                                      <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground shadow-sm">
                                        {img.zones.length}
                                      </div>
                                    )}
                                    {!img.uploading && isActiveColorPrimary && totalImages > 1 && (
                                      <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        {imgIdx > 0 && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleMoveImage(activeColorTab, img.id, -1)
                                            }}
                                            className="flex h-5 w-5 items-center justify-center rounded-full bg-background/90 shadow-sm hover:bg-background"
                                          >
                                            <ChevronLeft className="h-3 w-3 text-foreground" />
                                          </button>
                                        )}
                                        {imgIdx < totalImages - 1 && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleMoveImage(activeColorTab, img.id, 1)
                                            }}
                                            className="flex h-5 w-5 items-center justify-center rounded-full bg-background/90 shadow-sm hover:bg-background"
                                          >
                                            <ChevronRight className="h-3 w-3 text-foreground" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                {!img.uploading && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRemoveImage(activeColorTab, img.id)
                                    }}
                                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive opacity-0 transition-opacity group-hover:opacity-100"
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive-foreground" />
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                value={String(img.label ?? "")}
                                onChange={(e) => handleLabelChange(activeColorTab, img.id, e.target.value)}
                                placeholder="Назва"
                                disabled={!isActiveColorPrimary}
                                className={`mt-1.5 w-full rounded border border-input bg-background px-2 py-1 text-center text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${!isActiveColorPrimary ? "cursor-not-allowed opacity-50" : ""}`}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  )
                })()}
                {errors.zones && <p className="mt-1 text-xs text-destructive">{errors.zones}</p>}
                {errors.images && <p className="mt-1 text-xs text-destructive" suppressHydrationWarning>{errors.images}</p>}
                </>
              )}
            </div>

          </form>
        </div>

        <div className="flex gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            suppressHydrationWarning
          >
            {"Скасувати"}
          </button>
          <button
            type="submit"
            form="base-form"
            disabled={isLoading || isAnyUploading}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              errors.zones 
                ? "border-2 border-destructive bg-primary text-primary-foreground" 
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
            suppressHydrationWarning
          >
            {(isLoading || isAnyUploading) && <Loader2 className="h-4 w-4 animate-spin" />}
            {isAnyUploading ? "Завантаження..." : item ? "Зберегти" : "Додати"}
          </button>
        </div>
      </div>

      {/* Zone Editor Modal */}
      <ZoneEditorModal
        open={zoneEditorOpen}
        onOpenChange={setZoneEditorOpen}
        imageUrl={editingImageUrl}
        zones={editingImageZones}
        onZonesChange={handleZonesChange}
      />
    </div>
  )
}
