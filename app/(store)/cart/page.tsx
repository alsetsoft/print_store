import type { Metadata } from "next"
import { StoreBreadcrumb } from "@/components/store/store-breadcrumb"
import { CartPageClient } from "./cart-client"

export const metadata: Metadata = {
  title: "\u041a\u043e\u0448\u0438\u043a",
  description: "\u0412\u0430\u0448 \u043a\u043e\u0448\u0438\u043a \u0442\u043e\u0432\u0430\u0440\u0456\u0432",
}

export default function CartPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <StoreBreadcrumb items={[{ label: "\u041a\u043e\u0448\u0438\u043a" }]} />
      <CartPageClient />
    </div>
  )
}
