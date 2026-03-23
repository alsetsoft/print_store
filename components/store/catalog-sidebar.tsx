"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowLeft, ChevronRight, Search } from "lucide-react"
import { cn } from "@/lib/utils"

type Category = { id: number; name: string }
type Subcategory = { id: number; name: string; base_category_id: number | null }

interface CatalogSidebarProps {
  categories: Category[]
  subcategories: Subcategory[]
  activeCategoryId: number | null
  activeSubcategoryId: number | null
  onCategoryChange: (id: number | null) => void
  onSubcategoryChange: (id: number | null) => void
  searchQuery: string
  onSearchChange: (value: string) => void
}

export function CatalogSidebar({
  categories,
  subcategories,
  activeCategoryId,
  activeSubcategoryId,
  onCategoryChange,
  onSubcategoryChange,
  searchQuery,
  onSearchChange,
}: CatalogSidebarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLocalSearch(searchQuery)
  }, [searchQuery])

  const handleSearchChange = (value: string) => {
    setLocalSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onSearchChange(value)
    }, 400)
  }

  const activeCategory = categories.find((c) => c.id === activeCategoryId)
  const subcatsForActive = subcategories.filter(
    (sc) => sc.base_category_id === activeCategoryId
  )

  return (
    <aside className="w-full shrink-0 lg:w-64">
      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder={"\u041f\u043e\u0448\u0443\u043a \u043f\u043e \u0442\u043e\u0432\u0430\u0440\u0430\u0445"}
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <nav className="space-y-0.5">
        {activeCategory ? (
          <>
            <button
              onClick={() => {
                onCategoryChange(null)
              }}
              className="flex w-full items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              {"\u0412\u0441\u0456 \u0442\u043e\u0432\u0430\u0440\u0438"}
            </button>

            <div className="px-3 py-2 text-sm font-bold text-foreground">
              {activeCategory.name}
            </div>

            {subcatsForActive.map((sc) => (
              <button
                key={sc.id}
                onClick={() =>
                  onSubcategoryChange(activeSubcategoryId === sc.id ? null : sc.id)
                }
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                  activeSubcategoryId === sc.id
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {sc.name}
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </button>
            ))}
          </>
        ) : (
          categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              {cat.name}
              <ChevronRight className="size-3.5 text-muted-foreground" />
            </button>
          ))
        )}
      </nav>
    </aside>
  )
}
