"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, ShoppingBag } from "lucide-react"
import { getMyDropPayload } from "./actions"

export function OrderSuccessClient() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get("order")
  const loggedRef = useRef(false)

  useEffect(() => {
    if (!orderNumber || loggedRef.current) return
    loggedRef.current = true
    getMyDropPayload(orderNumber)
      .then((payload) => {
        if (payload) console.log("[MyDrop POST candidate]:", payload)
        else console.warn("[MyDrop POST candidate]: order not found", orderNumber)
      })
      .catch((err) => console.error("[MyDrop POST candidate] error:", err))
  }, [orderNumber])

  return (
    <div className="flex flex-col items-center text-center">
      <CheckCircle2 className="mb-6 size-20 text-green-500" />

      <h1 className="text-2xl font-bold text-foreground">
        {"\u0414\u044f\u043a\u0443\u0454\u043c\u043e \u0437\u0430 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f!"}
      </h1>

      {orderNumber && (
        <p className="mt-3 text-lg text-muted-foreground">
          {"\u041d\u043e\u043c\u0435\u0440 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f: "}
          <span className="font-semibold text-foreground">{orderNumber}</span>
        </p>
      )}

      <p className="mt-4 max-w-md text-sm text-muted-foreground">
        {"\u041c\u0438 \u043e\u0431\u0440\u043e\u0431\u0438\u043c\u043e \u0432\u0430\u0448\u0435 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f \u0442\u0430 \u0437\u0432'\u044f\u0436\u0435\u043c\u043e\u0441\u044f \u0437 \u0432\u0430\u043c\u0438 \u0434\u043b\u044f \u043f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043d\u043d\u044f."}
      </p>

      <div className="mt-8 flex gap-4">
        <Link
          href="/catalog"
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ShoppingBag className="size-4" />
          {"\u041f\u0440\u043e\u0434\u043e\u0432\u0436\u0438\u0442\u0438 \u043f\u043e\u043a\u0443\u043f\u043a\u0438"}
        </Link>
      </div>
    </div>
  )
}
