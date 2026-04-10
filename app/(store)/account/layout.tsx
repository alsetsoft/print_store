import Link from "next/link"
import { User, Package, Settings, ArrowLeft } from "lucide-react"

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {"\u041d\u0430 \u0433\u043e\u043b\u043e\u0432\u043d\u0443"}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{"\u041e\u0441\u043e\u0431\u0438\u0441\u0442\u0438\u0439 \u043a\u0430\u0431\u0456\u043d\u0435\u0442"}</h1>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        {/* Sidebar nav */}
        <nav className="flex shrink-0 flex-row gap-1 md:w-48 md:flex-col">
          <Link
            href="/account"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <User className="size-4" />
            {"\u041f\u0440\u043e\u0444\u0456\u043b\u044c"}
          </Link>
          <Link
            href="/account/orders"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Package className="size-4" />
            {"\u0417\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f"}
          </Link>
          <Link
            href="/account/settings"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Settings className="size-4" />
            {"\u041d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f"}
          </Link>
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
