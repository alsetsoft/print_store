import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { PrintsPageClient } from "./prints-client"
import { StoreBreadcrumb, type BreadcrumbSegment } from "@/components/store/store-breadcrumb"

const PAGE_SIZE = 24

export const metadata: Metadata = {
  title: "\u041f\u0440\u0438\u043d\u0442\u0438 \u2014 \u043a\u0430\u0442\u0430\u043b\u043e\u0433 \u0434\u0438\u0437\u0430\u0439\u043d\u0456\u0432",
  description:
    "\u041f\u0435\u0440\u0435\u0433\u043b\u044f\u043d\u044c\u0442\u0435 \u043a\u0430\u0442\u0430\u043b\u043e\u0433 \u043f\u0440\u0438\u043d\u0442\u0456\u0432 \u0434\u043b\u044f \u043d\u0430\u043d\u0435\u0441\u0435\u043d\u043d\u044f \u043d\u0430 \u043e\u0434\u044f\u0433.",
}

export default async function PrintsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string
    subcategory?: string
    q?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const page = Math.max(1, parseInt(params.page ?? "1") || 1)
  const categoryId = params.category ? parseInt(params.category) : null
  const subcategoryId = params.subcategory ? parseInt(params.subcategory) : null
  const searchQuery = params.q?.trim() ?? ""

  // Fetch categories & subcategories
  const [categoriesRes, subcategoriesRes] = await Promise.all([
    supabase.from("print_categories").select("id, name").order("name"),
    supabase.from("print_subcategories").select("id, name, print_category_id").order("name"),
  ])

  const categories = categoriesRes.data ?? []
  const subcategories = subcategoriesRes.data ?? []

  // Build filtered print_designs query
  let query = supabase
    .from("print_designs")
    .select("id, name, description, image_url, print_category_id, print_subcategory_id", { count: "exact" })

  if (subcategoryId) {
    query = query.eq("print_subcategory_id", subcategoryId)
  } else if (categoryId) {
    const subcatIds = subcategories
      .filter((sc) => sc.print_category_id === categoryId)
      .map((sc) => sc.id)

    if (subcatIds.length > 0) {
      query = query.in("print_subcategory_id", subcatIds)
    } else {
      query = query.eq("print_category_id", categoryId)
    }
  }

  if (searchQuery) {
    query = query.ilike("name", `%${searchQuery}%`)
  }

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: prints, count: totalCount } = await query
    .order("created_at", { ascending: false })
    .range(from, to)

  const printDesigns = (prints ?? []) as Array<{
    id: number
    name: string
    description: string | null
    image_url: string | null
    print_category_id: number | null
    print_subcategory_id: number | null
  }>

  // Build breadcrumb
  const breadcrumbItems: BreadcrumbSegment[] = [{ label: "\u041f\u0440\u0438\u043d\u0442\u0438", href: "/prints" }]

  if (subcategoryId) {
    const subcat = subcategories.find((sc) => sc.id === subcategoryId)
    const parentCat = subcat ? categories.find((c) => c.id === subcat.print_category_id) : null
    if (parentCat) {
      breadcrumbItems.push({ label: parentCat.name, href: `/prints?category=${parentCat.id}` })
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <StoreBreadcrumb items={breadcrumbItems} />
      <PrintsPageClient
        categories={categories}
        subcategories={subcategories}
        prints={printDesigns}
        totalCount={totalCount ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        initialCategoryId={categoryId}
        initialSubcategoryId={subcategoryId}
        initialSearch={searchQuery}
      />
    </div>
  )
}
