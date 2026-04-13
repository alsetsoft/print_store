"use client"

import { cn } from "@/lib/utils"
import { UA } from "@/lib/translations"
import { Check } from "lucide-react"

type Category = { id: number; name: string }
type Subcategory = { id: number; name: string; base_category_id: number | null }
type Group = { id: number; name: string; base_category_id: number | null; base_subcategory_id: number | null }
type PrintCategory = { id: number; name: string }

interface CatalogSidebarProps {
  categories: Category[]
  subcategories: Subcategory[]
  groups: Group[]
  activeCategoryId: number | null
  activeSubcategoryId: number | null
  onCategoryChange: (id: number | null) => void
  onSubcategoryChange: (id: number | null) => void
  printCategories?: PrintCategory[]
}

function CheckboxItem({
  label,
  checked,
  onClick,
}: {
  label: string
  checked: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm transition-colors hover:bg-accent"
    >
      <span
        className={cn(
          "flex size-4.5 shrink-0 items-center justify-center rounded border transition-colors",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/30"
        )}
      >
        {checked && <Check className="size-3" />}
      </span>
      <span className={cn(checked ? "font-medium text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </button>
  )
}

export function CatalogSidebar({
  categories,
  subcategories,
  groups,
  activeCategoryId,
  activeSubcategoryId,
  onCategoryChange,
  onSubcategoryChange,
  printCategories,
}: CatalogSidebarProps) {
  // Determine which items to show in category section
  const subcatsForActive = activeCategoryId
    ? subcategories.filter((sc) => sc.base_category_id === activeCategoryId)
    : []

  const showSubcategories = activeCategoryId && subcatsForActive.length > 0

  return (
    <aside className="w-full shrink-0 lg:w-60">
      {/* Section: Категорія */}
      <div className="mb-6">
        <h3 className="mb-2 font-heading text-sm font-bold text-foreground">
          {UA.common.category}
        </h3>
        <div className="space-y-0.5">
          {showSubcategories ? (
            <>
              <CheckboxItem
                label={UA.store.allProducts}
                checked={!activeSubcategoryId}
                onClick={() => onSubcategoryChange(null)}
              />
              {subcatsForActive.map((sc) => (
                <CheckboxItem
                  key={sc.id}
                  label={sc.name}
                  checked={activeSubcategoryId === sc.id}
                  onClick={() =>
                    onSubcategoryChange(activeSubcategoryId === sc.id ? null : sc.id)
                  }
                />
              ))}
            </>
          ) : (
            <>
              <CheckboxItem
                label={UA.store.allProducts}
                checked={!activeCategoryId}
                onClick={() => onCategoryChange(null)}
              />
              {categories.map((cat) => (
                <CheckboxItem
                  key={cat.id}
                  label={cat.name}
                  checked={activeCategoryId === cat.id}
                  onClick={() => onCategoryChange(cat.id)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Section: Принти */}
      {printCategories && printCategories.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 font-heading text-sm font-bold text-foreground">
            {UA.store.printCategory}
          </h3>
          <div className="space-y-0.5">
            <CheckboxItem
              label={UA.store.allProducts}
              checked={true}
              onClick={() => {}}
            />
            {printCategories.map((pc) => (
              <CheckboxItem
                key={pc.id}
                label={pc.name}
                checked={false}
                onClick={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {/* Section: Колір — placeholder */}
      <div className="mb-6">
        <h3 className="mb-2 font-heading text-sm font-bold text-foreground">
          {UA.store.color}
        </h3>
        <div className="space-y-0.5">
          {[
            "\u0411\u0456\u043b\u0438\u0439",
            "\u0427\u043e\u0440\u043d\u0438\u0439",
            "\u0421\u0456\u0440\u0438\u0439",
          ].map((colorName) => (
            <CheckboxItem
              key={colorName}
              label={colorName}
              checked={false}
              onClick={() => {}}
            />
          ))}
        </div>
      </div>
    </aside>
  )
}
