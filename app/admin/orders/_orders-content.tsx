"use client"

import { ShoppingCart } from "lucide-react"

export default function OrdersContent() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">
          {"\u0417\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f"}
        </h1>
        <p className="text-muted-foreground">
          {"\u0423\u043f\u0440\u0430\u0432\u043b\u044f\u0439\u0442\u0435 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f\u043c\u0438 \u043a\u043b\u0456\u0454\u043d\u0442\u0456\u0432"}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent">
            <ShoppingCart className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-foreground">
            {"\u0417\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f \u0449\u0435 \u043d\u0435 \u043d\u0430\u0434\u0456\u0439\u0448\u043b\u0438"}
          </h3>
          <p className="text-center text-sm text-muted-foreground">
            {"\u0422\u0443\u0442 \u0437\u2019\u044f\u0432\u043b\u044f\u0442\u044c\u0441\u044f \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f, \u043a\u043e\u043b\u0438 \u043a\u043b\u0456\u0454\u043d\u0442\u0438 \u043f\u043e\u0447\u043d\u0443\u0442\u044c \u043a\u0443\u043f\u0443\u0432\u0430\u0442\u0438 \u0442\u043e\u0432\u0430\u0440\u0438"}
          </p>
        </div>
      </div>
    </div>
  )
}
