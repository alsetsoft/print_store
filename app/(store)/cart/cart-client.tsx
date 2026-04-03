"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, ShoppingCart, Pencil } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { CartItemPreview } from "@/components/store/cart-item-preview"

export function CartPageClient() {
  const router = useRouter()
  const { items, totalItems, totalPrice, updateQuantity, removeItem, clearCart } = useCart()

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShoppingBag className="mb-4 size-16 text-muted-foreground/20" />
        <h1 className="text-xl font-bold text-foreground">
          {"\u041a\u043e\u0448\u0438\u043a \u043f\u043e\u0440\u043e\u0436\u043d\u0456\u0439"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {"\u0414\u043e\u0434\u0430\u0439\u0442\u0435 \u0442\u043e\u0432\u0430\u0440\u0438 \u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0443, \u0449\u043e\u0431 \u043f\u043e\u0447\u0430\u0442\u0438"}
        </p>
        <Link
          href="/catalog"
          className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ArrowLeft className="size-4" />
          {"\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u0434\u043e \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0443"}
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">
        {"\u041a\u043e\u0448\u0438\u043a"}
      </h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* ── Left: Cart items ── */}
        <div className="flex-1">
          {/* Items header */}
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <p className="text-sm text-muted-foreground">
              {"\u0422\u043e\u0432\u0430\u0440\u0456\u0432 \u0443 \u043a\u043e\u0448\u0438\u043a\u0443:"}{" "}
              <span className="font-medium text-foreground">{totalItems}</span>
            </p>
            <button
              onClick={clearCart}
              className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-destructive hover:underline"
            >
              {"\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u0438 \u043a\u043e\u0448\u0438\u043a"}
            </button>
          </div>

          {/* Item list */}
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex gap-4 rounded-lg border border-border bg-card p-4"
              >
                {/* Image */}
                <div className="size-24 shrink-0 overflow-hidden rounded-lg bg-muted/30 sm:size-28">
                  <CartItemPreview item={item} size={224} className="size-full" />
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col min-w-0">
                  {/* Type badge + name */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {item.type === "product"
                        ? "\u0422\u043e\u0432\u0430\u0440"
                        : item.type === "custom"
                          ? "\u041a\u0430\u0441\u0442\u043e\u043c\u043d\u0438\u0439 \u0434\u0438\u0437\u0430\u0439\u043d"
                          : "\u041e\u0441\u043d\u043e\u0432\u0430"}
                    </span>
                    <h3 className="mt-0.5 text-sm font-medium text-foreground line-clamp-2 leading-snug">
                      {item.name}
                    </h3>
                  </div>

                  {/* Color / size metadata */}
                  {(item.colorName || item.sizeName) && (
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      {item.colorName && (
                        <span>{"\u041a\u043e\u043b\u0456\u0440 \u043e\u0441\u043d\u043e\u0432\u0438: "}<span className="text-foreground">{item.colorName}</span></span>
                      )}
                      {item.sizeName && (
                        <span>{"\u0420\u043e\u0437\u043c\u0456\u0440: "}<span className="text-foreground">{item.sizeName}</span></span>
                      )}
                    </div>
                  )}

                  {/* Price per unit */}
                  {item.price != null && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {"\u0426\u0456\u043d\u0430 \u0437\u0430 \u043e\u0434\u043d\u0443 \u0448\u0442\u0443\u043a\u0443: "}{item.price} {"\u0433\u0440\u043d"}
                    </p>
                  )}

                  {/* Bottom row: quantity + actions */}
                  <div className="mt-auto flex flex-wrap items-center gap-4 pt-3">
                    {/* Quantity */}
                    <div className="flex items-center gap-0">
                      <button
                        onClick={() => updateQuantity(item.id, item.type, item.quantity - 1)}
                        className="flex size-8 items-center justify-center rounded-l-md border border-border text-muted-foreground transition-colors hover:bg-muted"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="flex h-8 w-10 items-center justify-center border-y border-border text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.type, item.quantity + 1)}
                        className="flex size-8 items-center justify-center rounded-r-md border border-border text-muted-foreground transition-colors hover:bg-muted"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>

                    {/* Edit (custom designs only) */}
                    {item.type === "custom" && item.constructorState && (
                      <button
                        onClick={() => {
                          localStorage.setItem("printmarket_edit_item", JSON.stringify(item))
                          router.push("/create")
                        }}
                        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Pencil className="size-3.5" />
                        {"\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438"}
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => removeItem(item.id, item.type)}
                      className="flex items-center gap-1 text-xs text-destructive/70 transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                      {"\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438"}
                    </button>
                  </div>
                </div>

                {/* Price total for item */}
                <div className="shrink-0 text-right">
                  {item.price != null && (
                    <p className="text-base font-bold text-foreground">
                      {item.price * item.quantity} {"\u0433\u0440\u043d"}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Order summary ── */}
        <div className="w-full shrink-0 lg:w-80">
          <div className="sticky top-24 space-y-4">
            {/* Continue shopping */}
            <Link
              href="/catalog"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="size-4" />
              {"\u041f\u0440\u043e\u0434\u043e\u0432\u0436\u0438\u0442\u0438 \u043f\u043e\u043a\u0443\u043f\u043a\u0438"}
            </Link>

            {/* Summary card */}
            <div className="rounded-lg border border-border bg-card p-5">
              {/* Totals breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {"\u0422\u043e\u0432\u0430\u0440\u0456\u0432"}
                  </span>
                  <span className="text-foreground">{totalItems}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {"\u0412\u0430\u0440\u0442\u0456\u0441\u0442\u044c \u0431\u0435\u0437 \u0437\u043d\u0438\u0436\u043a\u0438"}
                  </span>
                  <span className="text-foreground">{totalPrice} {"\u0433\u0440\u043d"}</span>
                </div>

                {/* Divider */}
                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {"\u0420\u0430\u0437\u043e\u043c"}
                    </span>
                    <span className="text-xl font-bold text-foreground">
                      {totalPrice} {"\u0433\u0440\u043d"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Checkout button */}
              <button
                onClick={() => router.push("/checkout")}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <ShoppingCart className="size-4" />
                {"\u041e\u0444\u043e\u0440\u043c\u0438\u0442\u0438 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f"} ({totalPrice} {"\u0433\u0440\u043d"})
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
