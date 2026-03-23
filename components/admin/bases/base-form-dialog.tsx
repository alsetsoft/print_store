"use client"

import { useState, useEffect } from "react"
import { X, Upload, Loader2, Grid3X3, AlertCircle } from "lucide-react"
import { createBase, updateBase } from "@/app/admin/bases/actions"
import { createClient } from "@/lib/supabase/client"
import { ZoneEditorModal, Zone } from "./zone-editor-modal"

interface Base {
  id: string
  name: string
  description: string | null
  image_url: string | null
  base_categories: { id: string; name: string } | null
  base_subcategories: { id: string; name: string } | null
}

interface BaseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  base?: Base | null
}

export function BaseFormDialog({ open, onOpenChange, base }: BaseFormDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [zones, setZones] = useState<Zone[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [zoneEditorOpen, setZoneEditorOpen] = useState(false)
  const [showZoneError, setShowZoneError] = useState(false)

  useEffect(() => {
    if (base) {
      setName(base.name)
      setDescription(base.description || "")
      setCategoryId(base.base_categories?.id || "")
      setImageUrl(base.image_url || "")
      setZones([]) // TODO: load zones from DB
    } else {
      setName("")
      setDescription("")
      setCategoryId("")
      setImageUrl("")
      setZones([])
    }
    setShowZoneError(false)
  }, [base, open])

  useEffect(() => {
    async function fetchCategories() {
      const supabase = createClient()
      const { data } = await supabase
        .from("base_categories")
        .select("id, name")
        .order("name")
      setCategories(data || [])
    }
    if (open) {
      fetchCategories()
    }
  }, [open])

  // Reset zone error when zones change
  useEffect(() => {
    if (zones.length > 0) {
      setShowZoneError(false)
    }
  }, [zones])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate zones
    if (imageUrl && zones.length === 0) {
      setShowZoneError(true)
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append("name", name)
      formData.append("description", description)
      formData.append("category_id", categoryId)
      formData.append("image_url", imageUrl)
      formData.append("zones", JSON.stringify(zones))

      if (base) {
        formData.append("id", base.id)
        await updateBase(formData)
      } else {
        await createBase(formData)
      }

      onOpenChange(false)
    } catch (error) {
      console.error("Error saving base:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = name && (!imageUrl || zones.length > 0)
  const hasImageWithoutZones = imageUrl && zones.length === 0

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div 
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" 
          onClick={() => onOpenChange(false)}
        />
        <div className="relative z-50 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {base ? "Редагувати основу" : "Додати основу"}
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
                Назва *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Введіть назву основи"
                required
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Опис
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Короткий опис основи"
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Категорія
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Оберіть категорію</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                URL зображення
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value)
                    // Reset zones when image changes
                    if (e.target.value !== imageUrl) {
                      setZones([])
                    }
                  }}
                  placeholder="https://example.com/image.png"
                  className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Upload className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Image Preview with Zone Editor */}
            {imageUrl && (
              <div className="space-y-2">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Зони для принтів *
                </label>
                <div
                  onClick={() => {
                    console.log("[v0] Opening zone editor, imageUrl:", imageUrl)
                    setZoneEditorOpen(true)
                  }}
                  className={`group relative flex cursor-pointer justify-center rounded-lg border-2 border-dashed p-4 transition-all ${
                    hasImageWithoutZones && showZoneError
                      ? "border-destructive bg-destructive/5"
                      : zones.length > 0
                      ? "border-primary/50 bg-primary/5 hover:border-primary"
                      : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <div className="relative">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="h-40 w-40 rounded-lg object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none"
                      }}
                    />
                    {/* Zone overlay indicators */}
                    {zones.map((zone) => (
                      <div
                        key={zone.id}
                        className="absolute border-2 border-primary/60 bg-primary/20"
                        style={{
                          left: `${zone.x}%`,
                          top: `${zone.y}%`,
                          width: `${zone.width}%`,
                          height: `${zone.height}%`,
                        }}
                      />
                    ))}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-foreground/60 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex flex-col items-center text-white">
                        <Grid3X3 className="mb-1 h-6 w-6" />
                        <span className="text-sm font-medium">
                          {zones.length > 0 ? "Редагувати зони" : "Визначити зони"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Zone count badge */}
                  {zones.length > 0 && (
                    <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                      {zones.length}
                    </div>
                  )}
                </div>

                {/* Zone error message */}
                {hasImageWithoutZones && showZoneError && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Необхідно визначити хоча б одну зону для розміщення принта</span>
                  </div>
                )}

                {/* Zone hint */}
                {!showZoneError && zones.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    Натисніть на зображення, щоб визначити зони для принтів
                  </p>
                )}

                {zones.length > 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    Визначено зон: {zones.length}. Натисніть для редагування.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Скасувати
              </button>
              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  hasImageWithoutZones && showZoneError
                    ? "border-2 border-destructive bg-primary text-primary-foreground opacity-50"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                }`}
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {base ? "Зберегти" : "Додати"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Zone Editor Modal */}
      <ZoneEditorModal
        open={zoneEditorOpen}
        onOpenChange={setZoneEditorOpen}
        imageUrl={imageUrl}
        zones={zones}
        onZonesChange={setZones}
      />
    </>
  )
}
