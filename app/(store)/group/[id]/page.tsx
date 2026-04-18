import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { StoreBreadcrumb, type BreadcrumbSegment } from "@/components/store/store-breadcrumb"
import { ProductCard } from "@/components/store/product-card"
import { fetchEnrichedProducts } from "@/lib/supabase/queries"
import { Package } from "lucide-react"

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

  if (productIds.length === 0) {
    const breadcrumbItems: BreadcrumbSegment[] = [
      { label: "\u041a\u0430\u0442\u0430\u043b\u043e\u0433", href: "/catalog" },
      { label: group.name },
    ]
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <StoreBreadcrumb items={breadcrumbItems} />
        <h1 className="mb-6 text-2xl font-bold tracking-tight">{group.name}</h1>
        {group.description && (
          <p className="mb-6 text-muted-foreground">{group.description}</p>
        )}
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="mb-4 size-12 text-muted-foreground/30" />
          <h3 className="text-lg font-medium text-foreground">
            {"\u0422\u043e\u0432\u0430\u0440\u0456\u0432 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {"\u0423 \u0446\u0456\u0439 \u0433\u0440\u0443\u043f\u0456 \u043f\u043e\u043a\u0438 \u043d\u0435\u043c\u0430\u0454 \u0442\u043e\u0432\u0430\u0440\u0456\u0432"}
          </p>
        </div>
      </div>
    )
  }

  const { products: enrichedProducts } = await fetchEnrichedProducts(supabase, {
    productIds,
    limit: productIds.length,
  })

  // Breadcrumb
  const breadcrumbItems: BreadcrumbSegment[] = [
    { label: "\u041a\u0430\u0442\u0430\u043b\u043e\u0433", href: "/catalog" },
    { label: group.name },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <StoreBreadcrumb items={breadcrumbItems} />
      <h1 className="mb-2 text-2xl font-bold tracking-tight">{group.name}</h1>
      {group.description && (
        <p className="mb-6 text-muted-foreground">{group.description}</p>
      )}
      <p className="mb-6 text-sm text-muted-foreground">
        {"\u0412\u0441\u044c\u043e\u0433\u043e"} {enrichedProducts.length} {"\u0442\u043e\u0432\u0430\u0440\u0456\u0432"}
      </p>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {enrichedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
