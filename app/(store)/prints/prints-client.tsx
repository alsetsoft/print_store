"use client"

import { useCallback, useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Paintbrush, ChevronLeft, ChevronRight, ArrowLeft, Search } from "lucide-react"
import { cn } from "@/lib/utils"

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

  // Title
  const activeCategory = categories.find((c) => c.id === initialCategoryId)
  const activeSubcategory = subcategories.find((sc) => sc.id === initialSubcategoryId)
  const pageTitle = activeSubcategory
    ? activeSubcategory.name
    : activeCategory
      ? activeCategory.name
      : "\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u043f\u0440\u0438\u043d\u0442\u0456\u0432"

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{pageTitle}</h1>
      <div className="flex flex-col gap-6 lg:flex-row">
        <PrintsSidebar
          categories={categories}
          subcategories={subcategories}
          activeCategoryId={initialCategoryId}
          activeSubcategoryId={initialSubcategoryId}
          onCategoryChange={(id) => navigate({ category: id, subcategory: null, page: 1 })}
          onSubcategoryChange={(id) => navigate({ subcategory: id, page: 1 })}
          searchQuery={initialSearch}
          onSearchChange={(q) => navigate({ q, page: 1 })}
        />

        <div className="flex-1">
          {/* Count */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {"\u0412\u0441\u044c\u043e\u0433\u043e"} {totalCount}{" "}
              {"\u043f\u0440\u0438\u043d\u0442\u0456\u0432"}
            </p>
            {totalPages > 1 && (
              <p className="text-sm text-muted-foreground">
                {"\u0421\u0442\u043e\u0440\u0456\u043d\u043a\u0430"} {page} / {totalPages}
              </p>
            )}
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
    <Link href={`/print/${print.id}`} className="group overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
      <div className="relative aspect-square bg-muted/30">
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

function PrintsSidebar({
  categories,
  subcategories,
  activeCategoryId,
  activeSubcategoryId,
  onCategoryChange,
  onSubcategoryChange,
  searchQuery,
  onSearchChange,
}: {
  categories: Category[]
  subcategories: Subcategory[]
  activeCategoryId: number | null
  activeSubcategoryId: number | null
  onCategoryChange: (id: number | null) => void
  onSubcategoryChange: (id: number | null) => void
  searchQuery: string
  onSearchChange: (value: string) => void
}) {
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
    (sc) => sc.print_category_id === activeCategoryId
  )

  return (
    <aside className="w-full shrink-0 lg:w-64">
      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder={"\u041f\u043e\u0448\u0443\u043a \u043f\u0440\u0438\u043d\u0442\u0456\u0432"}
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
              onClick={() => onCategoryChange(null)}
              className="flex w-full items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              {"\u0412\u0441\u0456 \u043f\u0440\u0438\u043d\u0442\u0438"}
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
          "flex size-9 items-center justify-center rounded-md border text-sm transition-colors",
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
              "flex size-9 items-center justify-center rounded-md border text-sm font-medium transition-colors",
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
          "flex size-9 items-center justify-center rounded-md border text-sm transition-colors",
          page < totalPages ? "hover:bg-accent cursor-pointer" : "pointer-events-none opacity-40"
        )}
        aria-disabled={page >= totalPages}
      >
        <ChevronRight className="size-4" />
      </a>
    </nav>
  )
}
