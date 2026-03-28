import type { Metadata } from "next"
import { CheckoutClient } from "./checkout-client"

export const metadata: Metadata = {
  title: "\u041e\u0444\u043e\u0440\u043c\u043b\u0435\u043d\u043d\u044f \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f",
}

export default function CheckoutPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <CheckoutClient />
    </div>
  )
}
