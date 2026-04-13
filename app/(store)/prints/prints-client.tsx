"use client"

import { useCallback, useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Paintbrush, ChevronLeft, ChevronRight, Search, ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { UA } from "@/lib/translations"

type Category = { id: number; name: string }
type Subcategory = { id: number; name: string; print_category_id: number }

type PrintDesign = {
  id: number
  name: string
  description: string | null
  image_url: string | null
  print_category_id: number | null
  print_subcategory_id: number | null
}

interface PrintsPageClientProps {
  categories: Category[]
  subcategories: Subcategory[]
  prints: PrintDesign[]
  totalCount: number
  page: number
  pageSize: number
  initialCategoryId: number | null
  initialSubcategoryId: number | null
  initialSearch: string
}

export function PrintsPageClient({
  categories,
  subcategories,
  prints,
  totalCount,
  page,
  pageSize,
  initialCategoryId,
  initialSubcategoryId,
  initialSearch,
}: PrintsPageClientProps) {
  const router = useRouter()

  const [localSearch, setLocalSearch] = useState(initialSearch)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [sortOpen, setSortOpen] = useState(false)

  useEffect(() => {
    setLocalSearch(initialSearch)
  }, [initialSearch])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const buildUrl = useCallback(
    (overrides: { category?: number | null; subcategory?: number | null; q?: string; page?: number }) => {
      const params = new URLSearchParams()

      const cat = overrides.category !== undefined ? overrides.category : initialCategoryId
      const sub = overrides.subcategory !== undefined ? overrides.subcategory : initialSubcategoryId
      const q = overrides.q !== undefined ? overrides.q : initialSearch
      const p = overrides.page ?? 1

      if (cat) params.set("category", String(cat))
      if (sub) params.set("subcategory", String(sub))
      if (q) params.set("q", q)
      if (p > 1) params.set("page", String(p))

      const qs = params.toString()
      return `/prints${qs ? `?${qs}` : ""}`
    },
    [initialCategoryId, initialSubcategoryId, initialSearch]
  )

  const navigate = useCallback(
    (overrides: { category?: number | null; subcategory?: number | null; q?: string; page?: number }) => {
      router.push(buildUrl(overrides))
    },
    [router, buildUrl]
  )

  const handleSearchChange = (value: string) => {
    setLocalSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navigate({ q: value, page: 1 })
    }, 400)
  }

  return (
    <>
      {/* Search bar + CTA */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder={UA.store.searchPrints}
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-12 w-full rounded-2xl border bg-card pl-12 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <Link
          href="/create"
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-primary px-6 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {UA.store.createDesign}
        </Link>
      </div>

      {/* Category pill tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => navigate({ category: null, subcategory: null, page: 1 })}
          className={cn(
            "shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors",
            !initialCategoryId
              ? "bg-primary text-primary-foreground"
              : "bg-card text-foreground hover:bg-accent"
          )}
        >
          {UA.store.allPrints}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => navigate({ category: cat.id, subcategory: null, page: 1 })}
            className={cn(
              "shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors",
              initialCategoryId === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-card text-foreground hover:bg-accent"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Sidebar + Grid */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <PrintsSidebar
          categories={categories}
          subcategories={subcategories}
          activeCategoryId={initialCategoryId}
          activeSubcategoryId={initialSubcategoryId}
          onCategoryChange={(id) => navigate({ category: id, subcategory: null, page: 1 })}
          onSubcategoryChange={(id) => navigate({ subcategory: id, page: 1 })}
        />

        <div className="flex-1">
          {/* Results header */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {UA.store.foundResults} {totalCount} {UA.store.printResults}
            </p>
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                {UA.store.sortBy}: <span className="font-medium text-foreground">{UA.store.sortPopular}</span>
                <ChevronDown className={cn("size-4 transition-transform", sortOpen && "rotate-180")} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-xl border bg-card p-1 shadow-lg">
                  {[UA.store.sortPopular, UA.store.sortNewest].map((label) => (
                    <button
                      key={label}
                      onClick={() => setSortOpen(false)}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Print grid */}
          {prints.length > 0 ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {prints.map((print) => (
                <PrintCard key={print.id} print={print} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Paintbrush className="mb-4 size-12 text-muted-foreground/30" />
              <h3 className="text-lg font-medium text-foreground">
                {"\u041f\u0440\u0438\u043d\u0442\u0456\u0432 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {"\u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0437\u043c\u0456\u043d\u0438\u0442\u0438 \u0444\u0456\u043b\u044c\u0442\u0440\u0438 \u0430\u0431\u043e \u043f\u043e\u0448\u0443\u043a\u043e\u0432\u0438\u0439 \u0437\u0430\u043f\u0438\u0442"}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              buildUrl={(p) => buildUrl({ page: p })}
            />
          )}
        </div>
      </div>
    </>
  )
}

function PrintCard({ print }: { print: PrintDesign }) {
  return (
    <Link href={`/print/${print.id}`} className="group overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md">
      <div className="relative aspect-square bg-muted">
        {print.image_url ? (
          <Image
            src={print.image_url}
            alt={print.name}
            fill
            className="object-contain p-3 transition-transform duration-200 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Paintbrush className="size-10 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-foreground">{print.name}</h3>
        {print.description && (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{print.description}</p>
        )}
      </div>
    </Link>
  )
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

function PrintsSidebar({
  categories,
  subcategories,
  activeCategoryId,
  activeSubcategoryId,
  onCategoryChange,
  onSubcategoryChange,
}: {
  categories: Category[]
  subcategories: Subcategory[]
  activeCategoryId: number | null
  activeSubcategoryId: number | null
  onCategoryChange: (id: number | null) => void
  onSubcategoryChange: (id: number | null) => void
}) {
  const subcatsForActive = activeCategoryId
    ? subcategories.filter((sc) => sc.print_category_id === activeCategoryId)
    : []

  const showSubcategories = activeCategoryId && subcatsForActive.length > 0

  return (
    <aside className="w-full shrink-0 lg:w-60">
      <div className="mb-6">
        <h3 className="mb-2 font-heading text-sm font-bold text-foreground">
          {UA.common.category}
        </h3>
        <div className="space-y-0.5">
          {showSubcategories ? (
            <>
              <CheckboxItem
                label={UA.store.allPrints}
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
                label={UA.store.allPrints}
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
    </aside>
  )
}

function Pagination({
  page,
  totalPages,
  buildUrl,
}: {
  page: number
  totalPages: number
  buildUrl: (page: number) => string
}) {
  const pages: (number | "...")[] = []
  const addPage = (n: number) => {
    if (n >= 1 && n <= totalPages && !pages.includes(n)) pages.push(n)
  }

  addPage(1)
  if (page - 2 > 2) pages.push("...")
  for (let i = page - 2; i <= page + 2; i++) addPage(i)
  if (page + 2 < totalPages - 1) pages.push("...")
  addPage(totalPages)

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      <a
        href={page > 1 ? buildUrl(page - 1) : undefined}
        className={cn(
          "flex size-9 items-center justify-center rounded-xl border text-sm transition-colors",
          page > 1 ? "hover:bg-accent cursor-pointer" : "pointer-events-none opacity-40"
        )}
        aria-disabled={page <= 1}
      >
        <ChevronLeft className="size-4" />
      </a>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="flex size-9 items-center justify-center text-sm text-muted-foreground">
            &hellip;
          </span>
        ) : (
          <a
            key={p}
            href={buildUrl(p)}
            className={cn(
              "flex size-9 items-center justify-center rounded-xl border text-sm font-medium transition-colors",
              p === page
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            {p}
          </a>
        )
      )}

      <a
        href={page < totalPages ? buildUrl(page + 1) : undefined}
        className={cn(
          "flex size-9 items-center justify-center rounded-xl border text-sm transition-colors",
          page < totalPages ? "hover:bg-accent cursor-pointer" : "pointer-events-none opacity-40"
        )}
        aria-disabled={page >= totalPages}
      >
        <ChevronRight className="size-4" />
      </a>
    </nav>
  )
}
