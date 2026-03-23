"use client"

import Link from "next/link"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/lib/cart-context"

export function CartButton() {
  const { totalItems } = useCart()

  return (
    <Link
      href="/cart"
      className="relative flex size-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted"
      aria-label={"\u041a\u043e\u0448\u0438\u043a"}
    >
      <ShoppingCart className="size-4" />
      {totalItems > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {totalItems > 99 ? "99+" : totalItems}
        </span>
      )}
    </Link>
  )
}
