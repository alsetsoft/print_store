import type { Metadata } from "next"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { StoreBreadcrumb, type BreadcrumbSegment } from "@/components/store/store-breadcrumb"
import { ProductCard } from "@/components/store/product-card"
import { fetchEnrichedProducts } from "@/lib/supabase/queries"
import { UA } from "@/lib/translations"
import { Package, Layers } from "lucide-react"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: group } = await supabase
    .from("groups")
    .select("name, description")
    .eq("id", parseInt(id))
    .single()

  if (!group) return { title: "\u0413\u0440\u0443\u043f\u0430 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u0430" }

  return {
    title: group.name,
    description: group.description || `\u0422\u043e\u0432\u0430\u0440\u0438 \u0433\u0440\u0443\u043f\u0438 ${group.name}`,
  }
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const groupId = parseInt(id)
  if (isNaN(groupId)) notFound()

  const supabase = await createClient()

  // Fetch group
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description, base_subcategory_id, print_subcategory_id")
    .eq("id", groupId)
    .single()

  if (!group) notFound()

  // Fetch product IDs in this group
  const { data: productGroupsData } = await supabase
    .from("product_groups")
    .select("product_id")
    .eq("group_id", groupId)

  const productIds = (productGroupsData ?? []).map((pg) => pg.product_id)

  const breadcrumbItems: BreadcrumbSegment[] = [
    { label: "\u041a\u0430\u0442\u0430\u043b\u043e\u0433", href: "/catalog" },
    { label: group.name },
  ]

  const enrichedProducts = productIds.length > 0
    ? (await fetchEnrichedProducts(supabase, {
        productIds,
        limit: productIds.length,
      })).products
    : []

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 lg:px-8">
      <StoreBreadcrumb items={breadcrumbItems} />

      {/* Hero */}
      <section className="mb-6 overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/8 via-card to-card p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:flex">
              <Layers className="size-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {group.name}
              </h1>
              {group.description && (
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  {group.description}
                </p>
              )}
            </div>
          </div>
          <Link
            href="/create"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {UA.store.createDesign}
          </Link>
        </div>
      </section>

      {/* Results meta */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {UA.store.foundResults} {enrichedProducts.length} {UA.store.results}
        </p>
      </div>

      {/* Product grid */}
      {enrichedProducts.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {enrichedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed bg-card/40 py-20 text-center">
          <Package className="mb-4 size-12 text-muted-foreground/30" />
          <h3 className="text-lg font-medium text-foreground">
            {"\u0422\u043e\u0432\u0430\u0440\u0456\u0432 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {"\u0423 \u0446\u0456\u0439 \u0433\u0440\u0443\u043f\u0456 \u043f\u043e\u043a\u0438 \u043d\u0435\u043c\u0430\u0454 \u0442\u043e\u0432\u0430\u0440\u0456\u0432"}
          </p>
          <Link
            href="/catalog"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {UA.store.catalog}
          </Link>
        </div>
      )}
    </div>
  )
}
