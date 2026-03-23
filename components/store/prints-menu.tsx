"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, Paintbrush } from "lucide-react"
import { cn } from "@/lib/utils"
import { UA } from "@/lib/translations"

type PrintCategory = {
  id: number
  name: string
}

type PrintSubcategory = {
  id: number
  name: string
  print_category_id: number
}

interface PrintsMenuProps {
  printCategories: PrintCategory[]
  printSubcategories: PrintSubcategory[]
}

export function PrintsMenu({ printCategories, printSubcategories }: PrintsMenuProps) {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<number | null>(
    printCategories[0]?.id ?? null
  )

  const subcatsForCategory = printSubcategories.filter(
    (sc) => sc.print_category_id === activeCategory
  )

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href="/prints"
        className={cn(
          "flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors",
          open ? "text-primary" : "text-foreground hover:text-primary"
        )}
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen(false)}
        aria-expanded={open}
      >
        <Paintbrush className="size-4" />
        {UA.store.prints}
        <ChevronDown
          className={cn(
            "size-4 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </Link>

      {open && printCategories.length > 0 && (
        <div className="absolute top-full left-0 z-50 min-w-[500px] rounded-lg border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="flex">
            {/* Categories list (left side) */}
            <div className="w-48 shrink-0 border-r bg-muted/30 p-2">
              {printCategories.map((cat) => (
                <button
                  key={cat.id}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent"
                  )}
                  onMouseEnter={() => setActiveCategory(cat.id)}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Subcategories (right side) */}
            <div className="flex-1 p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {printCategories.find((c) => c.id === activeCategory)?.name}
              </h3>
              {subcatsForCategory.length > 0 ? (
                <ul className="space-y-1">
                  {subcatsForCategory.map((sub) => (
                    <li key={sub.id}>
                      <Link
                        href={`/prints?subcategory=${sub.id}`}
                        className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        onClick={() => setOpen(false)}
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground/60 italic">
                  {"\u041f\u0456\u0434\u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u0457 \u0432\u0456\u0434\u0441\u0443\u0442\u043d\u0456"}
                </p>
              )}
              <div className="mt-4 border-t pt-3">
                <Link
                  href={`/prints?category=${activeCategory}`}
                  className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                  onClick={() => setOpen(false)}
                >
                  {"\u0414\u0438\u0432\u0438\u0442\u0438\u0441\u044c \u0432\u0441\u0435"} →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
