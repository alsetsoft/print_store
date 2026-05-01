import Link from "next/link"
import {
  ArrowRight,
  Zap,
  Shield,
  Palette,
  Truck,
  Gift,
  Sparkles,
  Flame,
  Star,
  Mail,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { fetchEnrichedProducts } from "@/lib/supabase/queries"
import { ProductCard } from "@/components/store/product-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UA } from "@/lib/translations"

// === MOCK DATA (visual prototype only) ===

const promoBanners = {
  hero: {
    title: "Знижка −30% на всі футболки",
    subtitle: "Тільки до неділі — поспішайте обрати свій дизайн",
    cta: "До акції",
    href: "/catalog",
  },
  shipping: {
    title: "Безкоштовна доставка",
    subtitle: "Від 1500₴ по всій Україні",
  },
  gift: {
    title: "Подарунок до замовлення",
    subtitle: "Стильна еко-сумка при першій покупці",
  },
}

const saleProducts = [
  { id: 1, name: "Оверсайз футболка «Retro Wave»", oldPrice: 890, newPrice: 623, gradient: "from-primary/30 to-accent/60" },
  { id: 2, name: "Гуді «Night City»", oldPrice: 1490, newPrice: 1043, gradient: "from-secondary/20 to-primary/30" },
  { id: 3, name: "Чашка «Morning Vibes»", oldPrice: 320, newPrice: 224, gradient: "from-accent to-primary/20" },
  { id: 4, name: "Лонгслів «Minimal Lines»", oldPrice: 1190, newPrice: 833, gradient: "from-primary/40 to-accent/30" },
  { id: 5, name: "Шопер «Botanical»", oldPrice: 590, newPrice: 413, gradient: "from-accent/80 to-primary/20" },
  { id: 6, name: "Футболка «Space Cat»", oldPrice: 790, newPrice: 553, gradient: "from-secondary/30 to-accent/50" },
  { id: 7, name: "Світшот «Mountains»", oldPrice: 1690, newPrice: 1183, gradient: "from-primary/20 to-secondary/30" },
  { id: 8, name: "Кепка «Surf Club»", oldPrice: 490, newPrice: 343, gradient: "from-accent/60 to-primary/40" },
]

const bestsellers = [
  { id: 101, name: "Футболка «Classic Logo»", price: 690, gradient: "from-primary/40 to-accent/40" },
  { id: 102, name: "Гуді «Everyday Heavy»", price: 1390, gradient: "from-accent/70 to-primary/30" },
  { id: 103, name: "Чашка «Black Matte»", price: 290, gradient: "from-secondary/40 to-primary/30" },
  { id: 104, name: "Тотебег «City Walk»", price: 590, gradient: "from-primary/30 to-accent/60" },
]

const trendingPrints = [
  { id: 201, name: "Retro Wave", gradient: "from-accent via-primary/40 to-secondary" },
  { id: 202, name: "Botanical", gradient: "from-accent to-primary" },
  { id: 203, name: "Space Cat", gradient: "from-secondary to-primary/60" },
  { id: 204, name: "Mountains", gradient: "from-primary to-accent" },
  { id: 205, name: "Minimal Lines", gradient: "from-accent/60 to-secondary/60" },
  { id: 206, name: "Night City", gradient: "from-secondary to-primary" },
]

const testimonials = [
  {
    name: "Ольга К.",
    city: "Київ",
    initials: "ОК",
    quote: "Замовляла футболку в подарунок — якість више очікувань, принт рівний, кольори соковиті. Буду замовляти ще.",
  },
  {
    name: "Андрій М.",
    city: "Львів",
    initials: "АМ",
    quote: "Конструктор бомба — за 5 хвилин зробив собі гуді з власним лого. Доставили за 3 дні.",
  },
  {
    name: "Марія С.",
    city: "Одеса",
    initials: "МС",
    quote: "Крутий вибір принтів і приємна підтримка. Допомогли підібрати розмір в чаті за пару хвилин.",
  },
]

const newsletter = {
  title: "Будьте в курсі новинок",
  subtitle: "Промокод −10% на перше замовлення для нових передплатників",
  placeholder: "your@email.com",
  cta: "Підписатись",
}

const labels = {
  promoTitle: "Спеціальні пропозиції",
  promoSubtitle: "Актуальні акції тижня",
  saleTitle: "Акційні товари",
  saleSubtitle: "Знижки до −30%",
  bestsellersTitle: "Хіти продажів",
  bestsellersSubtitle: "Товари, які обирають найчастіше",
  trendingTitle: "Топ-принти тижня",
  trendingSubtitle: "Найпопулярніші дизайни",
  reviewsTitle: "Що кажуть клієнти",
  reviewsSubtitle: "Відгуки реальних покупців",
  hitBadge: "Хіт",
  saleBadge: "−30%",
  uah: "₴",
}

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
        <div className="mx-auto grid max-w-[1360px] items-center gap-10 px-4 sm:px-6 py-12 md:grid-cols-2 md:px-16 md:py-20">
          <div>
            <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {UA.store.heroLabel}
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold leading-tight tracking-tight text-foreground md:text-[56px] md:leading-[1.1]">
              {UA.store.heroTitle}
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              {UA.store.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/catalog"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-muted px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70"
              >
                {UA.store.heroCatalogBtn}
              </Link>
              <Link
                href="/create"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
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

      {/* Promo Banners */}
      <section className="py-12">
        <div className="mx-auto max-w-[1360px] px-6 md:px-16">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
                {labels.promoTitle}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {labels.promoSubtitle}
              </p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Hero promo banner */}
            <Link
              href={promoBanners.hero.href}
              className="group relative flex min-h-[280px] flex-col justify-end overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-accent p-8 text-primary-foreground transition-transform hover:scale-[1.01] lg:col-span-2 lg:min-h-[340px]"
            >
              <Sparkles className="absolute right-8 top-8 size-12 opacity-30" />
              <Badge variant="secondary" className="mb-4 w-fit bg-white/20 text-primary-foreground backdrop-blur-sm">
                Акція тижня
              </Badge>
              <h3 className="font-heading text-3xl font-bold leading-tight md:text-4xl">
                {promoBanners.hero.title}
              </h3>
              <p className="mt-3 max-w-md text-sm text-primary-foreground/90 md:text-base">
                {promoBanners.hero.subtitle}
              </p>
              <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-foreground shadow transition-colors group-hover:bg-white/90">
                {promoBanners.hero.cta}
                <ArrowRight className="size-4" />
              </span>
            </Link>

            <div className="grid gap-4">
              {/* Shipping banner */}
              <div className="flex items-start gap-4 rounded-3xl bg-accent p-6 transition-colors hover:bg-accent/80">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Truck className="size-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-accent-foreground">
                    {promoBanners.shipping.title}
                  </h3>
                  <p className="mt-1 text-sm text-accent-foreground/80">
                    {promoBanners.shipping.subtitle}
                  </p>
                </div>
              </div>
              {/* Gift banner */}
              <div className="flex items-start gap-4 rounded-3xl border bg-card p-6 transition-colors hover:bg-muted">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Gift className="size-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold">
                    {promoBanners.gift.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {promoBanners.gift.subtitle}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sale Products */}
      <section className="py-12">
        <div className="mx-auto max-w-[1360px] px-6 md:px-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
                {labels.saleTitle}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {labels.saleSubtitle}
              </p>
            </div>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              {UA.store.viewAll}
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {saleProducts.map((p) => (
              <Link
                key={p.id}
                href="#"
                className="group flex flex-col gap-3"
              >
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${p.gradient} transition-transform duration-300 group-hover:scale-105`}
                  />
                  <Badge
                    variant="destructive"
                    className="absolute left-3 top-3 px-2 py-1 text-xs font-bold"
                  >
                    {labels.saleBadge}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="line-clamp-2 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                    {p.name}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-semibold text-primary">
                      {p.newPrice} {labels.uah}
                    </span>
                    <span className="text-sm text-muted-foreground line-through">
                      {p.oldPrice} {labels.uah}
                    </span>
                  </div>
                </div>
              </Link>
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

      {/* Bestsellers */}
      <section className="py-12">
        <div className="mx-auto max-w-[1360px] px-6 md:px-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
                {labels.bestsellersTitle}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {labels.bestsellersSubtitle}
              </p>
            </div>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              {UA.store.viewAll}
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {bestsellers.map((p) => (
              <Link
                key={p.id}
                href="#"
                className="group flex flex-col gap-3"
              >
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${p.gradient} transition-transform duration-300 group-hover:scale-105`}
                  />
                  <Badge className="absolute left-3 top-3 gap-1 px-2 py-1 text-xs font-bold">
                    <Flame className="size-3" />
                    {labels.hitBadge}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="line-clamp-2 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                    {p.name}
                  </h3>
                  <span className="text-base font-semibold text-primary">
                    {p.price} {labels.uah}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Prints */}
      <section className="py-12">
        <div className="mx-auto max-w-[1360px] px-6 md:px-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
                {labels.trendingTitle}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {labels.trendingSubtitle}
              </p>
            </div>
            <Link
              href="/prints"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              {UA.store.viewAll}
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="-mx-6 flex gap-4 overflow-x-auto px-6 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-6">
            {trendingPrints.map((print) => (
              <Link
                key={print.id}
                href="#"
                className="group flex w-40 shrink-0 flex-col gap-2 md:w-auto"
              >
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${print.gradient} transition-transform duration-300 group-hover:scale-110`}
                  />
                </div>
                <span className="text-center text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                  {print.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12">
        <div className="mx-auto max-w-[1360px] px-6 md:px-16">
          <div className="mb-10 text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight md:text-[40px]">
              {labels.reviewsTitle}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {labels.reviewsSubtitle}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="flex flex-col rounded-3xl border bg-card p-6"
              >
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="size-4 fill-primary text-primary"
                    />
                  ))}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-foreground">
                  «{t.quote}»
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                    {t.initials}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">
                      {t.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t.city}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-12">
        <div className="mx-auto max-w-[1360px] px-6 md:px-16">
          <div className="rounded-3xl border bg-card p-8 text-center md:p-12">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Mail className="size-6" />
            </div>
            <h2 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
              {newsletter.title}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground md:text-base">
              {newsletter.subtitle}
            </p>
            <form
              action="#"
              className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row"
            >
              <Input
                type="email"
                placeholder={newsletter.placeholder}
                aria-label="Email"
                className="flex-1 bg-background"
              />
              <Button type="submit" className="sm:w-auto">
                {newsletter.cta}
              </Button>
            </form>
          </div>
        </div>
      </section>

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
