"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  return (
    <div className="admin-theme flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex">
        <AdminSidebar />
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <AdminSidebar onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="font-semibold text-foreground">{"\u0410\u0434\u043c\u0456\u043d\u002d\u043f\u0430\u043d\u0435\u043b\u044c"}</span>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
