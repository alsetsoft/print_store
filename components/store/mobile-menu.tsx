"use client"

import Link from "next/link"
import { Paintbrush, Shirt, Pencil, Menu, User, LogIn } from "lucide-react"
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

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="flex size-9 items-center justify-center rounded-md border">
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shirt className="size-4" />
            </div>
            {"\u041f\u0440\u0438\u043d\u0442\u041c\u0430\u0440\u043a\u0435\u0442"}
          </SheetTitle>
        </SheetHeader>

        <div className="px-4">
          <GlobalSearch />
        </div>

        <nav className="flex flex-col gap-1 px-4">
          <SheetClose asChild>
            <Link
              href="/catalog"
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              {UA.store.catalog}
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link
              href="/prints"
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <Paintbrush className="size-4" />
              {UA.store.prints}
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link
              href="/bases"
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <Shirt className="size-4" />
              {UA.store.bases}
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link
              href="/create"
              className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <Pencil className="size-4" />
              {"\u041a\u043e\u043d\u0441\u0442\u0440\u0443\u043a\u0442\u043e\u0440"}
            </Link>
          </SheetClose>

          {/* Auth links */}
          <div className="mt-4 border-t pt-4">
            {user ? (
              <>
                <SheetClose asChild>
                  <Link
                    href="/account"
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <User className="size-4" />
                    {"\u041e\u0441\u043e\u0431\u0438\u0441\u0442\u0438\u0439 \u043a\u0430\u0431\u0456\u043d\u0435\u0442"}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <button
                    onClick={() => signOut()}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-accent"
                  >
                    {"\u0412\u0438\u0439\u0442\u0438"}
                  </button>
                </SheetClose>
              </>
            ) : (
              <>
                <SheetClose asChild>
                  <Link
                    href="/login"
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <LogIn className="size-4" />
                    {"\u0423\u0432\u0456\u0439\u0442\u0438"}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/register"
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <User className="size-4" />
                    {"\u0417\u0430\u0440\u0435\u0454\u0441\u0442\u0440\u0443\u0432\u0430\u0442\u0438\u0441\u044f"}
                  </Link>
                </SheetClose>
              </>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
