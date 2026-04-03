"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { UA } from "@/lib/translations"

type Group = {
  id: number
  name: string
  base_category_id: number | null
  base_subcategory_id: number | null
}

type Subcategory = {
  id: number
  name: string
  base_category_id: number | null
}

type Category = {
  id: number
  name: string
}

interface CatalogMenuProps {
  categories: Category[]
  subcategories: Subcategory[]
  groups: Group[]
}

export function CatalogMenu({ categories, subcategories, groups }: CatalogMenuProps) {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<number | null>(
    categories[0]?.id ?? null
  )

  const subcatsForCategory = subcategories.filter(
    (sc) => sc.base_category_id === activeCategory
  )

  const groupsForSubcat = (subcatId: number) =>
    groups.filter((g) => g.base_subcategory_id === subcatId)

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href="/catalog"
        className={cn(
          "flex items-center gap-1.5 px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors",
          "text-primary hover:text-primary/80"
        )}
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen(false)}
        aria-expanded={open}
      >
        {UA.store.catalog}
        <ChevronDown
          className={cn(
            "size-4 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </Link>

      {open && (
        <div className="absolute top-full left-0 z-50 min-w-[800px] rounded-lg border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Category tabs */}
          <div className="flex gap-1 border-b px-4 pt-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium transition-colors rounded-t-md",
                  activeCategory === cat.id
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                onMouseEnter={() => setActiveCategory(cat.id)}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Subcategories + groups grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 p-6 md:grid-cols-3 lg:grid-cols-4">
            {subcatsForCategory.map((subcat) => {
              const subGroups = groupsForSubcat(subcat.id)
              return (
                <div key={subcat.id}>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-foreground">
                    {subcat.name}
                  </h3>
                  <ul className="space-y-1.5">
                    {subGroups.map((group) => (
                      <li key={group.id}>
                        <Link
                          href={`/group/${group.id}`}
                          className="text-sm text-muted-foreground transition-colors hover:text-primary"
                          onClick={() => setOpen(false)}
                        >
                          {group.name}
                        </Link>
                      </li>
                    ))}
                    {subGroups.length === 0 && (
                      <li className="text-xs text-muted-foreground/60 italic">
                        {"\u0429\u0435 \u043d\u0435\u043c\u0430\u0454 \u0433\u0440\u0443\u043f"}
                      </li>
                    )}
                  </ul>
                </div>
              )
            })}
            {/* Інше — hardcoded for every category */}
            <div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-foreground">
                {"\u0406\u043d\u0448\u0435"}
              </h3>
              <ul className="space-y-1.5">
                {groups
                  .filter((g) => g.base_subcategory_id === null && (g.base_category_id === null || g.base_category_id === activeCategory))
                  .map((group) => (
                    <li key={group.id}>
                      <Link
                        href={`/group/${group.id}`}
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                        onClick={() => setOpen(false)}
                      >
                        {group.name}
                      </Link>
                    </li>
                  ))}
                {groups.filter((g) => g.base_subcategory_id === null && (g.base_category_id === null || g.base_category_id === activeCategory)).length === 0 && (
                  <li className="text-xs text-muted-foreground/60 italic">
                    {"\u0429\u0435 \u043d\u0435\u043c\u0430\u0454 \u0433\u0440\u0443\u043f"}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
