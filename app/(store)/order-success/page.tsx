import { Suspense } from "react"
import type { Metadata } from "next"
import { OrderSuccessClient } from "./order-success-client"

export const metadata: Metadata = {
  title: "\u0417\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f \u043e\u0444\u043e\u0440\u043c\u043b\u0435\u043d\u043e",
}

export default function OrderSuccessPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <Suspense>
        <OrderSuccessClient />
      </Suspense>
    </div>
  )
}
