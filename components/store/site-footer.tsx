import Link from "next/link"
import { Shirt } from "lucide-react"
import { UA } from "@/lib/translations"

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto max-w-[1360px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Logo + tagline */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="mb-3 flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Shirt className="size-4" />
              </div>
              <span className="font-heading text-sm font-semibold">
                {"\u041f\u0440\u0438\u043d\u0442\u041c\u0430\u0440\u043a\u0435\u0442"}
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {UA.store.footerTagline}
            </p>
          </div>

          {/* Каталог */}
          <div>
            <h4 className="mb-3 font-heading text-sm font-bold text-foreground">
              {UA.store.footerCatalog}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/catalog" className="transition-colors hover:text-foreground">{UA.store.footerTShirts}</Link></li>
              <li><Link href="/catalog" className="transition-colors hover:text-foreground">{UA.store.footerHoodies}</Link></li>
              <li><Link href="/catalog" className="transition-colors hover:text-foreground">{UA.store.footerMugs}</Link></li>
              <li><Link href="/create" className="transition-colors hover:text-foreground">{UA.store.footerConstructor}</Link></li>
            </ul>
          </div>

          {/* Сервіс */}
          <div>
            <h4 className="mb-3 font-heading text-sm font-bold text-foreground">
              {UA.store.footerService}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="transition-colors hover:text-foreground">{UA.store.footerDelivery}</Link></li>
              <li><Link href="/" className="transition-colors hover:text-foreground">{UA.store.footerReturns}</Link></li>
              <li><Link href="/" className="transition-colors hover:text-foreground">{UA.store.footerFaq}</Link></li>
            </ul>
          </div>

          {/* Компанія */}
          <div>
            <h4 className="mb-3 font-heading text-sm font-bold text-foreground">
              {UA.store.footerCompany}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="transition-colors hover:text-foreground">{UA.store.footerAbout}</Link></li>
              <li><Link href="/" className="transition-colors hover:text-foreground">{UA.store.footerBlog}</Link></li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {year} {"\u041f\u0440\u0438\u043d\u0442\u041c\u0430\u0440\u043a\u0435\u0442"}. {UA.store.allRightsReserved}.
          </p>
        </div>
      </div>
    </footer>
  )
}
