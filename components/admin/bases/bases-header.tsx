"use client"

import { Plus } from "lucide-react"
import { useState } from "react"
import { BaseFormDialog } from "@/components/admin/parameters/base-form-dialog"

interface BasesHeaderProps {
  totalCount: number
  categories: { id: number; name: string }[]
  subcategories: { id: number; name: string; base_category_id: number }[]
  colors: { id: number; name: string; hex_code: string | null }[]
  sizes: { id: number; name: string; sort_order: number | null }[]
  onSuccess?: () => void
}

export function BasesHeader({ totalCount, categories, subcategories, colors, sizes, onSuccess }: BasesHeaderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Основи</h1>
          <p className="text-muted-foreground" suppressHydrationWarning>
            {"Управляйте базовими продуктами для друку"}
          </p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          suppressHydrationWarning
        >
          <Plus className="h-4 w-4" />
          {"Додати основу"}
        </button>
      </div>

      <BaseFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        item={null}
        categories={categories}
        subcategories={subcategories}
        colors={colors}
        sizes={sizes}
        onSuccess={onSuccess}
      />
    </>
  )
}
