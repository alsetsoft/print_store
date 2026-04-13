import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { fetchEnrichedProducts } from "@/lib/supabase/queries"
import { CatalogPageClient } from "./catalog-client"
import { StoreBreadcrumb, type BreadcrumbSegment } from "@/components/store/store-breadcrumb"

const PAGE_SIZE = 20

export const metadata: Metadata = {
  title: "\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u043e\u0434\u044f\u0433\u0443 \u0437 \u043f\u0440\u0438\u043d\u0442\u0430\u043c\u0438",
  description:
    "\u041f\u0435\u0440\u0435\u0433\u043b\u044f\u043d\u044c\u0442\u0435 \u043a\u0430\u0442\u0430\u043b\u043e\u0433 \u0442\u043e\u0432\u0430\u0440\u0456\u0432 \u0437 \u043f\u0440\u0438\u043d\u0442\u0430\u043c\u0438: \u0444\u0443\u0442\u0431\u043e\u043b\u043a\u0438, \u0445\u0443\u0434\u0456, \u0447\u0430\u0448\u043a\u0438 \u0442\u0430 \u0456\u043d\u0448\u0435.",
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string
    subcategory?: string
    print_category?: string
    q?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const page = Math.max(1, parseInt(params.page ?? "1") || 1)
  const categoryId = params.category ? parseInt(params.category) : null
  const subcategoryId = params.subcategory ? parseInt(params.subcategory) : null
  const printCategoryId = params.print_category ? parseInt(params.print_category) : null
  const searchQuery = params.q?.trim() ?? ""

  // Fetch categories, subcategories & groups (small, always needed)
  const [categoriesRes, subcategoriesRes, groupsRes, printCategoriesRes] = await Promise.all([
    supabase.from("base_categories").select("id, name").order("id"),
    supabase.from("base_subcategories").select("id, name, base_category_id").order("id"),
    supabase.from("groups").select("id, name, base_category_id, base_subcategory_id").order("name"),
    supabase.from("print_categories").select("id, name").order("name"),
  ])

  const categories = categoriesRes.data ?? []
  const subcategories = subcategoriesRes.data ?? []
  const groups = groupsRes.data ?? []
  const printCategories = printCategoriesRes.data ?? []

  // Build filtered base IDs
  let baseIds: number[] | null = null

  if (subcategoryId) {
    const { data: bases } = await supabase
      .from("bases")
      .select("id")
      .eq("base_subcategory_id", subcategoryId)
    baseIds = (bases ?? []).map((b) => b.id)
  } else if (categoryId) {
    const subcatIds = subcategories
      .filter((sc) => sc.base_category_id === categoryId)
      .map((sc) => sc.id)

    if (subcatIds.length > 0) {
      const { data: bases } = await supabase
        .from("bases")
        .select("id")
        .in("base_subcategory_id", subcatIds)
      baseIds = (bases ?? []).map((b) => b.id)
    } else {
      baseIds = []
    }
  }

  // Early return for empty base filter
  if (baseIds !== null && baseIds.length === 0) {
    const earlyBreadcrumb: BreadcrumbSegment[] = [{ label: "\u041a\u0430\u0442\u0430\u043b\u043e\u0433", href: "/catalog" }]
    if (subcategoryId) {
      const subcat = subcategories.find((sc) => sc.id === subcategoryId)
      const parentCat = subcat ? categories.find((c) => c.id === subcat.base_category_id) : null
      if (parentCat) earlyBreadcrumb.push({ label: parentCat.name, href: `/catalog?category=${parentCat.id}` })
      if (subcat) earlyBreadcrumb.push({ label: subcat.name })
    } else if (categoryId) {
      const cat = categories.find((c) => c.id === categoryId)
      if (cat) earlyBreadcrumb.push({ label: cat.name })
    }
    return (
      <div className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 lg:px-8">
        <StoreBreadcrumb items={earlyBreadcrumb} />
        <CatalogPageClient
          categories={categories}
          subcategories={subcategories}
          groups={groups}
          products={[]}
          totalCount={0}
          page={page}
          pageSize={PAGE_SIZE}
          initialCategoryId={categoryId}
          initialSubcategoryId={subcategoryId}
          initialSearch={searchQuery}
          printCategories={printCategories}
          initialPrintCategoryId={printCategoryId}
        />
      </div>
    )
  }

  const from = (page - 1) * PAGE_SIZE

  const { products: enrichedProducts, totalCount } = await fetchEnrichedProducts(supabase, {
    baseIds,
    printCategoryId,
    search: searchQuery || undefined,
    limit: PAGE_SIZE,
    offset: from,
    count: true,
  })

  // Build breadcrumb
  const breadcrumbItems: BreadcrumbSegment[] = [{ label: "\u041a\u0430\u0442\u0430\u043b\u043e\u0433", href: "/catalog" }]

  if (subcategoryId) {
    const subcat = subcategories.find((sc) => sc.id === subcategoryId)
    const parentCat = subcat ? categories.find((c) => c.id === subcat.base_category_id) : null
    if (parentCat) {
      breadcrumbItems.push({ label: parentCat.name, href: `/catalog?category=${parentCat.id}` })
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
      <CatalogPageClient
        categories={categories}
        subcategories={subcategories}
        groups={groups}
        products={enrichedProducts}
        totalCount={totalCount}
        page={page}
        pageSize={PAGE_SIZE}
        initialCategoryId={categoryId}
        initialSubcategoryId={subcategoryId}
        initialSearch={searchQuery}
        printCategories={printCategories}
        initialPrintCategoryId={printCategoryId}
      />
    </div>
  )
}
