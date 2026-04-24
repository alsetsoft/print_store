import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { BasesPageClient } from "./bases-client"
import { StoreBreadcrumb, type BreadcrumbSegment } from "@/components/store/store-breadcrumb"
import { applySort, parseSort } from "@/lib/sort"

const BASES_SORT_OPTIONS = ["popular", "newest", "price-asc", "price-desc"] as const

const PAGE_SIZE = 24

function decodeLabel(raw: string): string {
  const idx = raw.indexOf("__lbl__")
  return idx === -1 ? raw : raw.substring(0, idx)
}

export const metadata: Metadata = {
  title: "\u041e\u0441\u043d\u043e\u0432\u0438 \u2014 \u043a\u0430\u0442\u0430\u043b\u043e\u0433",
  description:
    "\u041f\u0435\u0440\u0435\u0433\u043b\u044f\u043d\u044c\u0442\u0435 \u043a\u0430\u0442\u0430\u043b\u043e\u0433 \u043e\u0441\u043d\u043e\u0432: \u0444\u0443\u0442\u0431\u043e\u043b\u043a\u0438, \u0445\u0443\u0434\u0456, \u0447\u0430\u0448\u043a\u0438 \u0442\u0430 \u0456\u043d\u0448\u0435.",
}

export default async function BasesPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string
    subcategory?: string
    q?: string
    page?: string
    sort?: string
  }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const page = Math.max(1, parseInt(params.page ?? "1") || 1)
  const categoryId = params.category ? parseInt(params.category) : null
  const subcategoryId = params.subcategory ? parseInt(params.subcategory) : null
  const searchQuery = params.q?.trim() ?? ""
  const sort = parseSort(params.sort, BASES_SORT_OPTIONS)

  // Fetch categories & subcategories
  const [categoriesRes, subcategoriesRes] = await Promise.all([
    supabase.from("base_categories").select("id, name").order("id"),
    supabase.from("base_subcategories").select("id, name, base_category_id").order("id"),
  ])

  const categories = categoriesRes.data ?? []
  const subcategories = subcategoriesRes.data ?? []

  // Build filtered bases query
  let query = supabase
    .from("bases")
    .select("id, name, description, price, image_url, base_category_id, base_subcategory_id, is_popular", { count: "exact" })

  if (subcategoryId) {
    query = query.eq("base_subcategory_id", subcategoryId)
  } else if (categoryId) {
    const subcatIds = subcategories
      .filter((sc) => sc.base_category_id === categoryId)
      .map((sc) => sc.id)

    if (subcatIds.length > 0) {
      query = query.in("base_subcategory_id", subcatIds)
    } else {
      query = query.eq("base_category_id", categoryId)
    }
  }

  if (searchQuery) {
    query = query.ilike("name", `%${searchQuery}%`)
  }

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const sortedQuery = applySort(query, sort)

  const { data: rawBases, count: totalCount } = await sortedQuery.range(from, to)

  const bases = (rawBases ?? []) as Array<{
    id: number
    name: string
    description: string | null
    price: number | null
    image_url: string | null
    base_category_id: number | null
    base_subcategory_id: number | null
  }>

  // Get first base_image for each base (better quality preview)
  const baseIds = bases.map((b) => b.id)
  const imagesRes = baseIds.length > 0
    ? await supabase
        .from("base_images")
        .select("id, base_id, url, sort_order")
        .in("base_id", baseIds)
        .order("sort_order")
    : { data: [] }

  const firstImageByBase = new Map<number, string>()
  for (const img of (imagesRes.data ?? []) as Array<{ id: number; base_id: number; url: string }>) {
    if (!firstImageByBase.has(img.base_id)) {
      firstImageByBase.set(img.base_id, decodeLabel(img.url))
    }
  }

  const enrichedBases = bases.map((b) => ({
    ...b,
    previewUrl: firstImageByBase.get(b.id) ?? b.image_url ?? null,
  }))

  // Build breadcrumb
  const breadcrumbItems: BreadcrumbSegment[] = [{ label: "\u041e\u0441\u043d\u043e\u0432\u0438", href: "/bases" }]

  if (subcategoryId) {
    const subcat = subcategories.find((sc) => sc.id === subcategoryId)
    const parentCat = subcat ? categories.find((c) => c.id === subcat.base_category_id) : null
    if (parentCat) {
      breadcrumbItems.push({ label: parentCat.name, href: `/bases?category=${parentCat.id}` })
    }
    if (subcat) {
      breadcrumbItems.push({ label: subcat.name })
    }
  } else if (categoryId) {
    const cat = categories.find((c) => c.id === categoryId)
    if (cat) {
      breadcrumbItems.push({ label: cat.name })
    }
  }

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 lg:px-8">
      <StoreBreadcrumb items={breadcrumbItems} />
      <BasesPageClient
        categories={categories}
        subcategories={subcategories}
        bases={enrichedBases}
        totalCount={totalCount ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        initialCategoryId={categoryId}
        initialSubcategoryId={subcategoryId}
        initialSearch={searchQuery}
        initialSort={sort}
      />
    </div>
  )
}
