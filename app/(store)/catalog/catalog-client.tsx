"use client"

import { useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Package, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { CatalogSidebar } from "@/components/store/catalog-sidebar"
import { ProductCard } from "@/components/store/product-card"

type Category = { id: number; name: string }
type Subcategory = { id: number; name: string; base_category_id: number | null }

type Product = {
  id: number
  name: string
  price: number | null
  baseImageUrl: string | null
  printImageUrl: string | null
  zones: { id: string; x: number; y: number; width: number; height: number }[]
  placements: Record<string, { x: number; y: number; scale: number; is_mirrored: boolean }>
  colorId?: number | null
}

interface CatalogPageClientProps {
  categories: Category[]
  subcategories: Subcategory[]
  products: Product[]
  totalCount: number
  page: number
  pageSize: number
  initialCategoryId: number | null
  initialSubcategoryId: number | null
  initialSearch: string
}

export function CatalogPageClient({
  categories,
  subcategories,
  products,
  totalCount,
  page,
  pageSize,
  initialCategoryId,
  initialSubcategoryId,
  initialSearch,
}: CatalogPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

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
      return `/catalog${qs ? `?${qs}` : ""}`
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
      : "\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u043e\u0434\u044f\u0433\u0443 \u0437 \u043f\u0440\u0438\u043d\u0442\u0430\u043c\u0438"

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{pageTitle}</h1>
      <div className="flex flex-col gap-6 lg:flex-row">
        <CatalogSidebar
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
              {"\u0442\u043e\u0432\u0430\u0440\u0456\u0432"}
            </p>
            {totalPages > 1 && (
              <p className="text-sm text-muted-foreground">
                {"\u0421\u0442\u043e\u0440\u0456\u043d\u043a\u0430"} {page} / {totalPages}
              </p>
            )}
          </div>

          {/* Product grid */}
          {products.length > 0 ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package className="mb-4 size-12 text-muted-foreground/30" />
              <h3 className="text-lg font-medium text-foreground">
                {"\u0422\u043e\u0432\u0430\u0440\u0456\u0432 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e"}
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

function Pagination({
  page,
  totalPages,
  buildUrl,
}: {
  page: number
  totalPages: number
  buildUrl: (page: number) => string
}) {
  // Build visible page numbers: always show first, last, and a window around current
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
    <nav
      className="mt-8 flex items-center justify-center gap-1"
      aria-label="Pagination"
    >
      <a
        href={page > 1 ? buildUrl(page - 1) : undefined}
        className={cn(
          "flex size-9 items-center justify-center rounded-md border text-sm transition-colors",
          page > 1
            ? "hover:bg-accent cursor-pointer"
            : "pointer-events-none opacity-40"
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
          page < totalPages
            ? "hover:bg-accent cursor-pointer"
            : "pointer-events-none opacity-40"
        )}
        aria-disabled={page >= totalPages}
      >
        <ChevronRight className="size-4" />
      </a>
    </nav>
  )
}
