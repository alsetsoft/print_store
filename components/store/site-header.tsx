import Link from "next/link"
import { Shirt, Pencil } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { UA } from "@/lib/translations"
import { CatalogMenu } from "./catalog-menu"
import { PrintsMenu } from "./prints-menu"
import { MobileMenu } from "./mobile-menu"
import { CartButton } from "./cart-button"
import { AuthButton } from "./auth-button"
import { GlobalSearch } from "./global-search"

export async function SiteHeader() {
  const supabase = await createClient()

  const [categoriesRes, subcategoriesRes, groupsRes, printCategoriesRes, printSubcategoriesRes] = await Promise.all([
    supabase.from("base_categories").select("id, name").order("id"),
    supabase.from("base_subcategories").select("id, name, base_category_id").order("id"),
    supabase.from("groups").select("id, name, base_category_id, base_subcategory_id").order("name"),
    supabase.from("print_categories").select("id, name").order("name"),
    supabase.from("print_subcategories").select("id, name, print_category_id").order("name"),
  ])

  const categories = categoriesRes.data ?? []
  const subcategories = subcategoriesRes.data ?? []
  const groups = groupsRes.data ?? []
  const printCategories = printCategoriesRes.data ?? []
  const printSubcategories = printSubcategoriesRes.data ?? []

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shirt className="size-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            {"\u041f\u0440\u0438\u043d\u0442\u041c\u0430\u0440\u043a\u0435\u0442"}
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          <CatalogMenu
            categories={categories}
            subcategories={subcategories}
            groups={groups}
          />
          <PrintsMenu
            printCategories={printCategories}
            printSubcategories={printSubcategories}
          />
          <Link
            href="/bases"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            <Shirt className="size-4" />
            {UA.store.bases}
          </Link>
          <Link
            href="/create"
            className="ml-2 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Pencil className="size-4" />
            {"\u041a\u043e\u043d\u0441\u0442\u0440\u0443\u043a\u0442\u043e\u0440"}
          </Link>
        </nav>

        {/* Search + Cart */}
        <div className="hidden items-center gap-3 md:flex">
          <GlobalSearch />
          <AuthButton />
          <CartButton />
        </div>

        {/* Mobile menu */}
        <MobileMenu
          categories={categories}
          subcategories={subcategories}
          groups={groups}
          printCategories={printCategories}
          printSubcategories={printSubcategories}
        />
      </div>
    </header>
  )
}
