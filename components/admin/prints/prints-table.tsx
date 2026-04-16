"use client"

import { useState } from "react"
import { Search, Pencil, Trash2, ImageIcon } from "lucide-react"
import { PrintFormDialog } from "./print-form-dialog"
import { deletePrint } from "@/app/admin/prints/actions"
import Image from "next/image"
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Print {
  id: string
  name: string
  description: string | null
  price: number | null
  image_url: string | null
  print_categories: { id: string; name: string } | null
  print_subcategories: { id: string; name: string } | null
  created_at: string
}

interface Category {
  id: string
  name: string
}

interface PrintsTableProps {
  prints: Print[]
  categories: Category[]
  onSuccess?: () => void
}

export function PrintsTable({ prints, categories, onSuccess }: PrintsTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [editingPrint, setEditingPrint] = useState<Print | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredPrints = prints.filter((print) =>
    print.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    print.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async () => {
    if (deletingId) {
      await deletePrint(deletingId)
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
            placeholder="Пошук принтів..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="px-6 pb-2">
        <h3 className="text-sm font-medium text-foreground">
          Всі принти ({filteredPrints.length})
        </h3>
      </div>

      {/* Mobile card list */}
      <div className="flex flex-col gap-2 px-4 pb-4 lg:hidden">
        {filteredPrints.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery ? "\u041f\u0440\u0438\u043d\u0442\u0456\u0432 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e" : "\u041f\u0440\u0438\u043d\u0442\u0438 \u0449\u0435 \u043d\u0435 \u0434\u043e\u0434\u0430\u043d\u0456"}
            </p>
          </div>
        ) : (
          filteredPrints.map((print) => (
            <div key={print.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                {print.image_url ? (
                  <Image
                    src={print.image_url}
                    alt={print.name}
                    width={56}
                    height={56}
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{print.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {print.print_categories && (
                    <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground">
                      {print.print_categories.name}
                    </span>
                  )}
                  {print.print_subcategories && (
                    <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground">
                      {print.print_subcategories.name}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {print.price != null && Number(print.price) > 0
                    ? `${print.price} \u0433\u0440\u043d`
                    : "\u2014"}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setEditingPrint(print)}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeletingId(print.id)}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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
              <th className="px-6 py-3 font-medium">Прев&apos;ю</th>
              <th className="px-6 py-3 font-medium">Назва</th>
              <th className="px-6 py-3 font-medium">Категорія</th>
              <th className="px-6 py-3 font-medium">Підкатегорія</th>
              <th className="px-6 py-3 font-medium">Ціна</th>
              <th className="px-6 py-3 font-medium">Дії</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredPrints.length === 0 ? (
              <tr>
              <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "Принтів не знайдено" : "Принти ще не додані"}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPrints.map((print) => (
                <tr key={print.id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted">
                      {print.image_url ? (
                        <Image
                          src={print.image_url}
                          alt={print.name}
                          width={48}
                          height={48}
                          className="h-full w-full rounded-lg object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-foreground">{print.name}</p>
                      {print.description && (
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="max-w-[200px] cursor-default truncate text-sm text-muted-foreground">
                                {print.description}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[300px] whitespace-normal break-words text-sm">
                              {print.description}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {print.print_categories ? (
                      <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground">
                        {print.print_categories.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {print.print_subcategories ? (
                      <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground">
                        {print.print_subcategories.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {print.price != null && Number(print.price) > 0
                      ? `${print.price} \u0433\u0440\u043d`
                      : <span className="text-muted-foreground">{"\u2014"}</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingPrint(print)}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(print.id)}
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

      <PrintFormDialog
        open={!!editingPrint}
        onOpenChange={(open) => !open && setEditingPrint(null)}
        print={editingPrint}
        onSuccess={onSuccess}
      />

      <DeleteConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        title="Видалити принт?"
        description="Цей принт буде видалено назавжди. Цю дію неможливо скасувати."
      />
    </>
  )
}
