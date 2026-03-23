import Link from "next/link"
import { ArrowRight, Shirt, Paintbrush, Layers } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { UA } from "@/lib/translations"

export default async function HomePage() {
  const supabase = await createClient()

  const [groupsRes, categoriesRes, subcategoriesRes] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, description, base_subcategory_id")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("base_categories").select("id, name").order("id"),
    supabase.from("base_subcategories").select("id, name, base_category_id").order("id"),
  ])

  const groups = groupsRes.data ?? []
  const categories = categoriesRes.data ?? []
  const subcategories = subcategoriesRes.data ?? []

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {UA.store.heroTitle}
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              {UA.store.heroSubtitle}
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                {UA.store.browseAll}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
        {/* Decorative background shapes */}
        <div className="pointer-events-none absolute -top-24 right-0 size-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-0 size-72 rounded-full bg-accent/20 blur-3xl" />
      </section>

      {/* Quick nav cards */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-3">
          <QuickNavCard
            href="/bases"
            icon={<Shirt className="size-6" />}
            title={UA.store.bases}
            description={"\u0424\u0443\u0442\u0431\u043e\u043b\u043a\u0438, \u0445\u0443\u0434\u0456, \u0447\u0430\u0448\u043a\u0438 \u0442\u0430 \u0456\u043d\u0448\u0435"}
          />
          <QuickNavCard
            href="/prints"
            icon={<Paintbrush className="size-6" />}
            title={UA.store.prints}
            description={"\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u0434\u0438\u0437\u0430\u0439\u043d\u0456\u0432 \u0434\u043b\u044f \u043d\u0430\u043d\u0435\u0441\u0435\u043d\u043d\u044f"}
          />
          <QuickNavCard
            href="#categories"
            icon={<Layers className="size-6" />}
            title={UA.store.catalog}
            description={"\u041f\u0435\u0440\u0435\u0433\u043b\u044f\u043d\u044c\u0442\u0435 \u0432\u0441\u0456 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u0457"}
          />
        </div>
      </section>

      {/* Popular groups */}
      {groups.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-2xl font-bold tracking-tight">
            {UA.store.popularGroups}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/group/${group.id}`}
                className="group rounded-lg border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors">
                  {group.name}
                </h3>
                {group.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {group.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Categories overview */}
      <section
        id="categories"
        className="border-t bg-muted/30 py-16"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-10 text-2xl font-bold tracking-tight">
            {UA.store.catalog}
          </h2>
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const subcats = subcategories.filter(
                (sc) => sc.base_category_id === cat.id
              )
              return (
                <div key={cat.id}>
                  <h3 className="mb-4 text-lg font-bold text-primary">
                    {cat.name}
                  </h3>
                  <ul className="space-y-2">
                    {subcats.map((sc) => (
                      <li key={sc.id}>
                        <Link
                          href={`/category/${cat.id}/${sc.id}`}
                          className="text-sm text-muted-foreground transition-colors hover:text-primary"
                        >
                          {sc.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}

function QuickNavCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-lg border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-card-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  )
}
