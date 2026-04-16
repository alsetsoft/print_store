"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutGrid,
  ShoppingCart,
  Layers,
  Palette,
  Package,
  Settings,
  Home,
  ShoppingBag,
  Wand2,
  FolderTree,
  LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

// All Ukrainian strings as Unicode escapes to prevent SSR byte corruption
const T = {
  adminPanel:    "\u0410\u0434\u043c\u0456\u043d\u002d\u043f\u0430\u043d\u0435\u043b\u044c",
  manageCatalog: "\u0423\u043f\u0440\u0430\u0432\u043b\u0456\u043d\u043d\u044f\u00a0\u043a\u0430\u0442\u0430\u043b\u043e\u0433\u043e\u043c",
  navigation:    "\u041d\u0430\u0432\u0456\u0433\u0430\u0446\u0456\u044f",
  parameters:    "\u041f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u0438",
  prints:        "\u041f\u0440\u0438\u043d\u0442\u0438",
  bases:         "\u041e\u0441\u043d\u043e\u0432\u0438",
  products:      "\u0422\u043e\u0432\u0430\u0440\u0438",
  generate:      "\u0413\u0435\u043d\u0435\u0440\u0443\u0432\u0430\u0442\u0438\u00a0\u0442\u043e\u0432\u0430\u0440",
  backToShop:    "\u041f\u043e\u0432\u0435\u0440\u043d\u0443\u0442\u0438\u0441\u044c\u00a0\u0434\u043e\u00a0\u043c\u0430\u0433\u0430\u0437\u0438\u043d\u0443",
  logout:        "\u0412\u0438\u0439\u0442\u0438",
  overview:      "\u041e\u0433\u043b\u044f\u0434",
  orders:        "\u0417\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f",
  groups:        "\u0413\u0440\u0443\u043f\u0438",
  settings:      "\u041d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f",
}

const navigation = [
  { name: T.overview,    href: "/admin",            icon: LayoutGrid },
  { name: T.orders,      href: "/admin/orders",     icon: ShoppingCart },
  { name: T.products,    href: "/admin/products",   icon: ShoppingBag },
  { name: T.groups,      href: "/admin/groups",     icon: FolderTree },
  { name: T.generate,    href: "/admin/generate",   icon: Wand2 },
  { name: T.parameters,  href: "/admin/parameters", icon: Layers },
  { name: T.prints,      href: "/admin/prints",     icon: Palette },
  { name: T.bases,       href: "/admin/bases",      icon: Package },
  { name: T.settings,    href: "/admin/settings",   icon: Settings },
]

interface AdminSidebarProps {
  onNavigate?: () => void
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
          <Settings className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground" suppressHydrationWarning>{T.adminPanel}</h1>
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>{T.manageCatalog}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-primary/70" suppressHydrationWarning>
          {T.navigation}
        </p>
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary border-l-2 border-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    isActive ? "bg-accent text-primary" : "text-muted-foreground"
                  )}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span suppressHydrationWarning>{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4 space-y-2">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-primary font-medium hover:bg-accent/50 transition-colors"
          suppressHydrationWarning
        >
          <Home className="h-4 w-4" />
          <span suppressHydrationWarning>{T.backToShop}</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          suppressHydrationWarning
        >
          <LogOut className="h-4 w-4" />
          <span suppressHydrationWarning>{T.logout}</span>
        </button>
      </div>
    </aside>
  )
}
