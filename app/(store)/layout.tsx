import type { Metadata } from "next"
import { SiteHeader } from "@/components/store/site-header"
import { SiteFooter } from "@/components/store/site-footer"
import { AuthProvider } from "@/lib/auth-context"
import { CartProvider } from "@/lib/cart-context"

export const metadata: Metadata = {
  title: {
    default: "\u041f\u0440\u0438\u043d\u0442\u041c\u0430\u0440\u043a\u0435\u0442 \u2014 \u0421\u0442\u0432\u043e\u0440\u0456\u0442\u044c \u0443\u043d\u0456\u043a\u0430\u043b\u044c\u043d\u0438\u0439 \u0434\u0438\u0437\u0430\u0439\u043d",
    template: "%s | \u041f\u0440\u0438\u043d\u0442\u041c\u0430\u0440\u043a\u0435\u0442",
  },
  description:
    "\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043e\u0441\u043d\u043e\u0432\u0443, \u0434\u043e\u0434\u0430\u0439\u0442\u0435 \u043f\u0440\u0438\u043d\u0442 \u2014 \u043c\u0438 \u043d\u0430\u0434\u0440\u0443\u043a\u0443\u0454\u043c\u043e \u0442\u0430 \u0434\u043e\u0441\u0442\u0430\u0432\u0438\u043c\u043e. \u041f\u0440\u0438\u043d\u0442 \u043d\u0430 \u0444\u0443\u0442\u0431\u043e\u043b\u043a\u0430\u0445, \u0445\u0443\u0434\u0456, \u0447\u0430\u0448\u043a\u0430\u0445 \u0442\u0430 \u0456\u043d\u0448\u043e\u043c\u0443.",
  openGraph: {
    type: "website",
    locale: "uk_UA",
    siteName: "\u041f\u0440\u0438\u043d\u0442\u041c\u0430\u0440\u043a\u0435\u0442",
  },
}

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </CartProvider>
    </AuthProvider>
  )
}
