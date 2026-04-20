"use client"

import { useState } from "react"
import { Search, Pencil, Trash2, Package } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { BaseFormDialog } from "@/components/admin/parameters/base-form-dialog"
import { deleteMaterial } from "@/app/admin/parameters/actions"
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog"

interface Base {
  id: string
  name: string
  description: string | null
  price: number | null
  article_id: number | null
  articles: { id: number; name: string } | null
  image_url: string | null
  base_categories: { id: number; name: string } | null
  base_subcategories: { id: number; name: string } | null
  base_colors: { color_id: number; colors: { id: number; name: string; hex_code: string | null } | null }[] | null
}

interface BasesTableProps {
  bases: Base[]
  categories: { id: number; name: string }[]
  subcategories: { id: number; name: string; base_category_id: number }[]
  colors: { id: number; name: string; hex_code: string | null }[]
  sizes: { id: number; name: string; sort_order: number | null }[]
  articles: { id: number; name: string }[]
  onSuccess?: () => void
}

export function BasesTable({ bases, categories, subcategories, colors, sizes, articles, onSuccess }: BasesTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [editingBase, setEditingBase] = useState<Base | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredBases = bases.filter((base) =>
    base.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    base.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    base.articles?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async () => {
    if (deletingId) {
      await deleteMaterial("bases", deletingId)
      onSuccess?.()
    }
  }

  return (
    <>
      <div className="p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            suppressHydrationWarning
            placeholder="Пошук основ..."
          />
        </div>
      </div>

      <div className="px-6 pb-2">
        <h3 className="text-sm font-medium text-foreground" suppressHydrationWarning>
          {"Всі основи"} ({filteredBases.length})
        </h3>
      </div>

      {/* Mobile card list */}
      <div className="space-y-2 px-4 pb-4 lg:hidden">
        {filteredBases.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <Package className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground" suppressHydrationWarning>
              {searchQuery ? "Основ не знайдено" : "Основи ще не додані"}
            </p>
          </div>
        ) : (
          filteredBases.map((base) => (
            <div key={base.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex gap-3">
                {/* Left: image */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                  {base.image_url ? (
                    <img
                      src={base.image_url}
                      alt={base.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* Middle: info */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="font-medium text-foreground">{base.name}</p>
                  {base.description && (
                    <p className="truncate text-sm text-muted-foreground">
                      {base.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {base.base_categories && (
                      <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium">
                        {base.base_categories.name}
                      </span>
                    )}
                    {base.base_colors && base.base_colors.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {base.base_colors.map((bc) => bc.colors?.hex_code && (
                          <div
                            key={bc.color_id}
                            className="h-4 w-4 rounded-full border border-border"
                            style={{ backgroundColor: bc.colors.hex_code }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: price & actions */}
                <div className="flex shrink-0 flex-col items-end justify-between">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {base.price ? `${base.price} ₴` : "—"}
                    </p>
                    {base.articles?.name && (
                      <p className="font-mono text-xs text-muted-foreground">{base.articles.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingBase(base)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(base.id)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-t border-border bg-muted/50 text-left text-sm text-muted-foreground">
              <th className="px-6 py-3 font-medium" suppressHydrationWarning>{"Прев'ю"}</th>
              <th className="px-6 py-3 font-medium" suppressHydrationWarning>{"Назва"}</th>
              <th className="px-6 py-3 font-medium" suppressHydrationWarning>{"Категорія"}</th>
              <th className="px-6 py-3 font-medium" suppressHydrationWarning>{"Колір"}</th>
              <th className="px-6 py-3 font-medium" suppressHydrationWarning>{"\u0410\u0440\u0442\u0438\u043A\u0443\u043B"}</th>
              <th className="px-6 py-3 font-medium" suppressHydrationWarning>{"Ціна"}</th>
              <th className="px-6 py-3 font-medium" suppressHydrationWarning>{"Дії"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredBases.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground" suppressHydrationWarning>
                      {searchQuery ? "Основ не знайдено" : "Основи ще не додані"}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredBases.map((base) => (
                <tr key={base.id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                      {base.image_url ? (
                        <img
                          src={base.image_url}
                          alt={base.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground">{base.name}</p>
                    {base.description && (
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="max-w-[200px] cursor-default truncate text-sm text-muted-foreground">
                              {base.description}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[300px] whitespace-normal break-words text-sm">
                            {base.description}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {base.base_categories && (
                        <span className="inline-flex w-fit items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium">
                          {base.base_categories.name}
                        </span>
                      )}
                      {base.base_subcategories && (
                        <span className="text-xs text-muted-foreground">{base.base_subcategories.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {base.base_colors && base.base_colors.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {base.base_colors.map((bc) => bc.colors && (
                          <div key={bc.color_id} className="flex items-center gap-1.5">
                            {bc.colors.hex_code && (
                              <div
                                className="h-4 w-4 rounded-full border border-border"
                                style={{ backgroundColor: bc.colors.hex_code }}
                              />
                            )}
                            <span className="text-sm text-foreground">{bc.colors.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-muted-foreground">{base.articles?.name || "—"}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-foreground">
                      {base.price ? `${base.price} ₴` : "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingBase(base)}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(base.id)}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingBase && (
        <BaseFormDialog
          open={!!editingBase}
          onOpenChange={(open) => !open && setEditingBase(null)}
          item={editingBase as unknown as Record<string, unknown>}
          categories={categories}
          subcategories={subcategories}
          colors={colors}
          sizes={sizes}
          articles={articles}
          onSuccess={onSuccess}
        />
      )}

      <DeleteConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        title="Видалити основу?"
        description="Цю основу буде видалено назавжди разом з усіма пов'язаними даними. Цю дію неможливо скасувати."
      />
    </>
  )
}
