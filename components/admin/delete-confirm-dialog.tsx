"use client"

import { AlertTriangle } from "lucide-react"

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title?: string
  description?: string
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Видалити елемент?",
  description = "Цей елемент буде видалено назавжди. Цю дію неможливо скасувати.",
}: DeleteConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Скасувати
          </button>
          <button
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            className="flex-1 rounded-lg bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
          >
            Видалити
          </button>
        </div>
      </div>
    </div>
  )
}
