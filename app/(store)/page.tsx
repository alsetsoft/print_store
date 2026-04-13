import Link from "next/link"
import { ArrowRight, Zap, Shield, Palette, Truck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { fetchEnrichedProducts } from "@/lib/supabase/queries"
import { ProductCard } from "@/components/store/product-card"
import { UA } from "@/lib/translations"

export default async function HomePage() {
  const supabase = await createClient()

  const [categoriesRes, subcategoriesRes] = await Promise.all([
    supabase.from("base_categories").select("id, name").order("id"),
    supabase.from("base_subcategories").select("id, name, base_category_id").order("id"),
  ])

  const categories = categoriesRes.data ?? []
  const subcategories = subcategoriesRes.data ?? []

  // For first 2 categories, fetch 4 products each
  const categorySections: {
    name: string
    categoryId: number
    products: Awaited<ReturnType<typeof fetchEnrichedProducts>>["products"]
  }[] = []

  for (const cat of categories.slice(0, 2)) {
    const subcatIds = subcategories
      .filter((sc) => sc.base_category_id === cat.id)
      .map((sc) => sc.id)

    let baseIds: number[] | null = null
    if (subcatIds.length > 0) {
      const { data: bases } = await supabase
        .from("bases")
        .select("id")
        .in("base_subcategory_id", subcatIds)
      baseIds = (bases ?? []).map((b) => b.id)
    } else {
      baseIds = []
    }

    const { products } = await fetchEnrichedProducts(supabase, {
      baseIds,
      limit: 4,
    })

    if (products.length > 0) {
      categorySections.push({ name: cat.name, categoryId: cat.id, products })
    }
  }

  const benefits = [
    { icon: <Zap className="size-5" />, color: "bg-primary", title: UA.store.benefitFastTitle, desc: UA.store.benefitFastDesc },
    { icon: <Shield className="size-5" />, color: "bg-accent", title: UA.store.benefitQualityTitle, desc: UA.store.benefitQualityDesc },
    { icon: <Palette className="size-5" />, color: "bg-primary", title: UA.store.benefitDesignTitle, desc: UA.store.benefitDesignDesc },
    { icon: <Truck className="size-5" />, color: "bg-accent", title: UA.store.benefitDeliveryTitle, desc: UA.store.benefitDeliveryDesc },
  ]

  return (
    <>
      {/* Hero */}
      <section className="border-b bg-card">
        <div className="mx-auto grid max-w-[1360px] items-center gap-10 px-6 py-12 md:grid-cols-2 md:px-16 md:py-20">
          <div>
            <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {UA.store.heroLabel}
            </span>
            <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-foreground md:text-[56px] md:leading-[1.1]">
              {UA.store.heroTitle}
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              {UA.store.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 rounded-2xl bg-muted px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70"
              >
                {UA.store.heroCatalogBtn}
              </Link>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                {UA.store.heroConstructorBtn}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
          <div className="hidden aspect-[4/3] rounded-3xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 md:block" />
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16">
        <div className="mx-auto max-w-[1360px] px-6 md:px-16">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-heading text-3xl font-bold tracking-tight md:text-[40px]">
                {UA.store.benefitsTitle}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {UA.store.benefitsSubtitle}
              </p>
            </div>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              {UA.store.benefitsMore}
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b, i) => (
              <div
                key={i}
                className="flex flex-col rounded-3xl border bg-card p-6"
              >
                <div className={`mb-4 flex size-10 items-center justify-center rounded-full ${b.color} text-white`}>
                  {b.icon}
                </div>
                <h3 className="font-heading text-lg font-bold">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Category Sections */}
      {categorySections.map((section) => (
        <section key={section.categoryId} className="py-12">
          <div className="mx-auto max-w-[1360px] px-6 md:px-16">
            <div className="mb-8 flex items-end justify-between">
              <h2 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
                {section.name}
              </h2>
              <Link
                href={`/catalog?category=${section.categoryId}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                {UA.store.viewAll}
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {section.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA Banner */}
      <section className="py-16">
        <div className="mx-auto max-w-[1360px] px-6 md:px-16">
          <div className="rounded-3xl bg-gradient-to-r from-primary via-accent to-secondary px-8 py-14 text-center text-white md:px-16">
            <h2 className="font-heading text-3xl font-bold tracking-tight md:text-[40px]">
              {UA.store.ctaTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-white/80">
              {UA.store.ctaSubtitle}
            </p>
            <Link
              href="/create"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-3 text-sm font-semibold text-foreground shadow transition-colors hover:bg-white/90"
            >
              {UA.store.ctaButton}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
