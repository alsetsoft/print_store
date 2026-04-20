import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Paintbrush } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { fetchEnrichedProducts } from "@/lib/supabase/queries"
import { ProductCard } from "@/components/store/product-card"
import { StoreBreadcrumb, type BreadcrumbSegment } from "@/components/store/store-breadcrumb"
import { UA } from "@/lib/translations"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from("print_designs")
    .select("name")
    .eq("id", parseInt(id))
    .single()

  return {
    title: data?.name ?? "\u041f\u0440\u0438\u043d\u0442",
  }
}

export default async function PrintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const printId = parseInt(id)
  if (isNaN(printId)) notFound()

  const supabase = await createClient()

  // Fetch print design
  const { data: print } = await supabase
    .from("print_designs")
    .select("id, name, description, image_url, print_category_id, print_subcategory_id")
    .eq("id", printId)
    .single()

  if (!print) notFound()

  // Fetch category/subcategory names
  const [catRes, subcatRes] = await Promise.all([
    print.print_category_id
      ? supabase.from("print_categories").select("id, name").eq("id", print.print_category_id).single()
      : Promise.resolve({ data: null }),
    print.print_subcategory_id
      ? supabase.from("print_subcategories").select("id, name").eq("id", print.print_subcategory_id).single()
      : Promise.resolve({ data: null }),
  ])

  const category = catRes.data as { id: number; name: string } | null
  const subcategory = subcatRes.data as { id: number; name: string } | null

  // Fetch product IDs using this print, then enrich them via the shared helper
  // so the cards match catalog/group shape (images[], initialImageIndex, etc).
  const { data: productIdRows } = await supabase
    .from("products")
    .select("id")
    .eq("print_id", printId)
    .eq("is_active", true)

  const productIds = (productIdRows ?? []).map((r) => r.id as number)

  const { products: enrichedProducts } = await fetchEnrichedProducts(supabase, {
    productIds,
    limit: productIds.length || 1,
  })

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 lg:px-8">
      <StoreBreadcrumb items={(() => {
        const items: BreadcrumbSegment[] = [{ label: "\u041f\u0440\u0438\u043d\u0442\u0438", href: "/prints" }]
        if (category) {
          items.push({ label: category.name, href: `/prints?category=${category.id}` })
        }
        if (subcategory) {
          items.push({ label: subcategory.name, href: `/prints?subcategory=${subcategory.id}` })
        }
        items.push({ label: print.name })
        return items
      })()} />

      {/* Print hero section */}
      <div className="mb-12 flex flex-col gap-8 lg:flex-row">
        {/* Large print image */}
        <div className="w-full max-w-sm mx-auto lg:mx-0 shrink-0">
          <div className="relative aspect-square rounded-2xl border bg-card overflow-hidden" style={{ backgroundImage: "repeating-conic-gradient(#f0f0f0 0% 25%, transparent 0% 50%)", backgroundSize: "20px 20px" }}>
            {print.image_url ? (
              <Image
                src={print.image_url}
                alt={print.name}
                fill
                className="object-contain p-6"
                sizes="(max-width: 1024px) 100vw, 512px"
                priority
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <Paintbrush className="size-20 text-muted-foreground/30" />
              </div>
            )}
          </div>
        </div>

        {/* Print info */}
        <div className="flex-1 flex flex-col justify-center">
          {(category || subcategory) && (
            <div className="mb-4 flex flex-wrap gap-2">
              {category && (
                <Link
                  href={`/prints?category=${category.id}`}
                  className="rounded-full bg-muted px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  {category.name}
                </Link>
              )}
              {subcategory && (
                <Link
                  href={`/prints?subcategory=${subcategory.id}`}
                  className="rounded-full bg-muted px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  {subcategory.name}
                </Link>
              )}
            </div>
          )}

          <h1 className="text-3xl font-bold tracking-tight">{print.name}</h1>

          {print.description && (
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">{print.description}</p>
          )}

          <Link
            href={`/create?printId=${print.id}`}
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 w-fit"
          >
            {UA.store.createWithPrint}
          </Link>
        </div>
      </div>

      {/* Products with this print */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          {UA.store.productsWithPrint}
          <span className="rounded-full bg-muted px-3 py-1 text-sm font-normal text-muted-foreground">{enrichedProducts.length}</span>
        </h2>

        {enrichedProducts.length > 0 ? (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {enrichedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-muted/20 py-16 text-center">
            <Paintbrush className="mb-3 size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {"\u0422\u043e\u0432\u0430\u0440\u0456\u0432 \u0437 \u0446\u0438\u043c \u043f\u0440\u0438\u043d\u0442\u043e\u043c \u0449\u0435 \u043d\u0435\u043c\u0430\u0454"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
