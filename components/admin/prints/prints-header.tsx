"use client"

import { Plus } from "lucide-react"
import { useState } from "react"
import { PrintFormDialog } from "./print-form-dialog"

interface PrintsHeaderProps {
  totalCount: number
  categories: { id: string; name: string }[]
  onSuccess?: () => void
}

export function PrintsHeader({ totalCount, categories, onSuccess }: PrintsHeaderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Принти</h1>
          <p className="text-muted-foreground">
            Управляйте дизайнами та призначайте їх на матеріали
          </p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Додати принт
        </button>
      </div>

      <PrintFormDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        onSuccess={onSuccess}
      />
    </>
  )
}
