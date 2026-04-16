"use client"

import { useState, useCallback, useEffect } from "react"
import { Palette, Ruler, FolderOpen, Plus, Trash2, Pencil, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ParameterFormDialog } from "./parameter-form-dialog"
import { deleteMaterial } from "@/app/admin/parameters/actions"
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog"
import { createClient } from "@/lib/supabase/client"

// Per-tab data shapes
type ColorRow = { id: string; name: string; hex_code: string | null }
type SizeRow = { id: string; name: string; sort_order: number | null }
type AreaRow = { id: string; name: string; description: string | null }
type BaseCategoryRow = { id: number; name: string; description: string | null }
type BaseSubcategoryRow = { id: number; name: string; base_category_id: number; description: string | null; base_categories?: { name: string } | null }
type PrintCategoryRow = { id: number; name: string; description: string | null }
type PrintSubcategoryRow = { id: number; name: string; print_category_id: number }

type TabData =
  | ColorRow[]
  | SizeRow[]
  | AreaRow[]
  | BaseCategoryRow[]
  | BaseSubcategoryRow[]
  | PrintCategoryRow[]
  | PrintSubcategoryRow[]

const tabs = [
  { id: "colors", label: "Кольори", icon: Palette },
  { id: "sizes", label: "Розміри", icon: Ruler },
  { id: "base_categories", label: "Категорії основ", icon: FolderOpen },
  { id: "base_subcategories", label: "Підкатегорії основ", icon: FolderOpen },
  { id: "print_categories", label: "Категорії принтів", icon: FolderOpen },
  { id: "print_subcategories", label: "Підкатегорії принтів", icon: FolderOpen },
]

async function fetchTab(tabId: string): Promise<TabData> {
  const supabase = createClient()
  switch (tabId) {
    case "colors": {
      const { data } = await supabase.from("colors").select("*").order("name")
      return (data || []) as ColorRow[]
    }
    case "sizes": {
      const { data } = await supabase.from("sizes").select("*").order("sort_order")
      return (data || []) as SizeRow[]
    }
    case "areas": {
      const { data } = await supabase.from("areas").select("*").order("name")
      return (data || []) as AreaRow[]
    }
    case "base_categories": {
      const { data } = await supabase.from("base_categories").select("*").order("name")
      return (data || []) as BaseCategoryRow[]
    }
    case "base_subcategories": {
      const { data } = await supabase
        .from("base_subcategories")
        .select("*, base_categories:base_category_id(id, name)")
        .order("name")
      return (data || []) as BaseSubcategoryRow[]
    }
    case "print_categories": {
      const { data } = await supabase.from("print_categories").select("*").order("name")
      return (data || []) as PrintCategoryRow[]
    }
    case "print_subcategories": {
      const { data } = await supabase.from("print_subcategories").select("*").order("name")
      return (data || []) as PrintSubcategoryRow[]
    }
    default:
      return []
  }
}

export function ParametersTabs() {
  const [activeTab, setActiveTab] = useState("colors")
  const [tabCache, setTabCache] = useState<Partial<Record<string, TabData>>>({})
  const [loadingTabs, setLoadingTabs] = useState<Record<string, boolean>>({ colors: true })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch a tab if not already cached
  const loadTab = useCallback(async (tabId: string) => {
    if (tabCache[tabId] !== undefined) return
    setLoadingTabs(prev => ({ ...prev, [tabId]: true }))
    const result = await fetchTab(tabId)
    setTabCache(prev => ({ ...prev, [tabId]: result }))
    setLoadingTabs(prev => ({ ...prev, [tabId]: false }))
  }, [tabCache])

  // Load initial tab on first render
  useEffect(() => {
    loadTab("colors")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
    loadTab(tabId)
  }

  const refetchActive = useCallback(async () => {
    setLoadingTabs(prev => ({ ...prev, [activeTab]: true }))
    const result = await fetchTab(activeTab)
    setTabCache(prev => ({ ...prev, [activeTab]: result }))
    setLoadingTabs(prev => ({ ...prev, [activeTab]: false }))
  }, [activeTab])

  const handleDelete = async () => {
    if (deletingId) {
      await deleteMaterial(activeTab, deletingId)
      await refetchActive()
    }
  }

  const handleEdit = (item: Record<string, unknown>) => {
    setEditingItem(item)
    setIsDialogOpen(true)
  }

  const handleAddNew = () => {
    setEditingItem(null)
    setIsDialogOpen(true)
  }

  const tabData = (tabCache[activeTab] || []) as Record<string, unknown>[]
  const isLoading = loadingTabs[activeTab] === true

  // Ensure categories are loaded for subcategory dialogs
  useEffect(() => {
    if (activeTab === "base_subcategories" && !tabCache["base_categories"]) {
      loadTab("base_categories")
    }
    if (activeTab === "print_subcategories" && !tabCache["print_categories"]) {
      loadTab("print_categories")
    }
  }, [activeTab, tabCache, loadTab])

  // Collect base_categories and print_categories for dialogs
  const baseCategories = (tabCache["base_categories"] || []) as BaseCategoryRow[]
  const printCategories = (tabCache["print_categories"] || []) as PrintCategoryRow[]

  const renderItem = (item: Record<string, unknown>) => (
    <div
      key={item.id as string}
      className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
    >
      <div className="flex items-center gap-3">
        {activeTab === "colors" && "hex_code" in item && item.hex_code && (
          <div
            className="h-6 w-6 shrink-0 rounded-full border border-border"
            style={{ backgroundColor: item.hex_code as string }}
          />
        )}
        <div>
          <p className="font-medium text-foreground">{item.name as string}</p>
          {"description" in item && item.description && (
            <p className="text-sm text-muted-foreground">{item.description as string}</p>
          )}
          {"hex_code" in item && item.hex_code && (
            <p className="text-xs text-muted-foreground">{item.hex_code as string}</p>
          )}
          {"base_categories" in item && item.base_categories && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {"Категорія: "}{(item.base_categories as { name: string }).name}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleEdit(item)}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => setDeletingId(item.id as string)}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        {/* Tabs */}
        <div className="-mb-px flex overflow-x-auto border-b border-border scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ").slice(-1)[0]}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium text-foreground">
              {tabs.find(t => t.id === activeTab)?.label}
              {!isLoading && <span className="ml-1 text-muted-foreground">({tabData.length})</span>}
            </h3>
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              {"Додати"}
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tabData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">{"Елементів ще немає"}</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {tabData.map(renderItem)}
            </div>
          )}
        </div>
      </div>

      <ParameterFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        type={activeTab}
        item={editingItem}
        categories={baseCategories}
        printCategories={printCategories}
        onSuccess={refetchActive}
      />

      <DeleteConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        title="Видалити елемент?"
        description="Цей елемент буде видалено назавжди. Цю дію неможливо скасувати."
      />
    </>
  )
}
