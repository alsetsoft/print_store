"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Paintbrush, Shirt, Pencil, Menu, User, LogIn, ArrowRight, Package, Ruler } from "lucide-react"
import { UA } from "@/lib/translations"
import { useAuth } from "@/lib/auth-context"
import { GlobalSearch } from "./global-search"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"

interface Category {
  id: number
  name: string
}

interface Subcategory {
  id: number
  name: string
  base_category_id: number
}

interface Group {
  id: number
  name: string
  base_subcategory_id: number | null
}

interface PrintCategory {
  id: number
  name: string
}

interface PrintSubcategory {
  id: number
  name: string
  print_category_id: number
}

interface MobileMenuProps {
  categories: Category[]
  subcategories: Subcategory[]
  groups: Group[]
  printCategories: PrintCategory[]
  printSubcategories: PrintSubcategory[]
}

export function MobileMenu({ categories, subcategories, groups, printCategories, printSubcategories }: MobileMenuProps) {
  const { user, signOut } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label={"\u041c\u0435\u043d\u044e"}
        className="flex size-9 items-center justify-center rounded-md border"
      >
        <Menu className="size-5" />
      </button>
    )
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={"\u041c\u0435\u043d\u044e"}
          className="flex size-9 items-center justify-center rounded-md border"
        >
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto border-r-0 p-0 pb-safe">
        {/* Header */}
        <SheetHeader className="border-b border-border bg-card/60 px-5 py-4">
          <SheetTitle className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Shirt className="size-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">{"\u041f\u0440\u0438\u043d\u0442\u041c\u0430\u0440\u043a\u0435\u0442"}</span>
          </SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="px-5 pt-4 pb-2">
          <GlobalSearch />
        </div>

        {/* Main navigation */}
        <nav className="flex flex-col gap-1 px-4 pt-2">
          <SheetClose asChild>
            <Link
              href="/catalog"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent active:bg-accent"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                <Package className="size-4" />
              </div>
              {UA.store.catalog}
              <ArrowRight className="ml-auto size-4 text-muted-foreground" />
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link
              href="/prints"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent active:bg-accent"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                <Paintbrush className="size-4" />
              </div>
              {UA.store.prints}
              <ArrowRight className="ml-auto size-4 text-muted-foreground" />
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link
              href="/bases"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent active:bg-accent"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                <Shirt className="size-4" />
              </div>
              {UA.store.bases}
              <ArrowRight className="ml-auto size-4 text-muted-foreground" />
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link
              href="/size-guide"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent active:bg-accent"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                <Ruler className="size-4" />
              </div>
              {UA.store.sizeGuide}
              <ArrowRight className="ml-auto size-4 text-muted-foreground" />
            </Link>
          </SheetClose>

          {/* Constructor CTA */}
          <SheetClose asChild>
            <Link
              href="/create"
              className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:bg-primary/80"
            >
              <Pencil className="size-4" />
              {"\u041a\u043e\u043d\u0441\u0442\u0440\u0443\u043a\u0442\u043e\u0440"}
            </Link>
          </SheetClose>
        </nav>

        {/* Auth section */}
        <div className="mx-4 mt-5 rounded-2xl border border-border bg-card/50 p-3">
          {user ? (
            <div className="flex flex-col gap-1">
              <SheetClose asChild>
                <Link
                  href="/account"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent active:bg-accent"
                >
                  <User className="size-4 text-primary" />
                  {"\u041e\u0441\u043e\u0431\u0438\u0441\u0442\u0438\u0439 \u043a\u0430\u0431\u0456\u043d\u0435\u0442"}
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 active:bg-destructive/10"
                >
                  <LogIn className="size-4" />
                  {"\u0412\u0438\u0439\u0442\u0438"}
                </button>
              </SheetClose>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <SheetClose asChild>
                <Link
                  href="/login"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent active:bg-accent"
                >
                  <LogIn className="size-4 text-primary" />
                  {"\u0423\u0432\u0456\u0439\u0442\u0438"}
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link
                  href="/register"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent active:bg-accent"
                >
                  <User className="size-4 text-primary" />
                  {"\u0417\u0430\u0440\u0435\u0454\u0441\u0442\u0440\u0443\u0432\u0430\u0442\u0438\u0441\u044f"}
                </Link>
              </SheetClose>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
