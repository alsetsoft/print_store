import Link from "next/link"
import { Shirt } from "lucide-react"
import { UA } from "@/lib/translations"

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Shirt className="size-4" />
          </div>
          <span className="text-sm font-semibold">
            {"\u041f\u0440\u0438\u043d\u0442\u041c\u0430\u0440\u043a\u0435\u0442"}
          </span>
        </Link>
        <p className="text-xs text-muted-foreground">
          &copy; {year} {"\u041f\u0440\u0438\u043d\u0442\u041c\u0430\u0440\u043a\u0435\u0442"}. {UA.store.allRightsReserved}.
        </p>
      </div>
    </footer>
  )
}
