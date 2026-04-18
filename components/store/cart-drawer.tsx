"use client"

import { useRouter } from "next/navigation"
import { ShoppingCart, Minus, Plus, Trash2, ShoppingBag, Pencil } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { CartItemPreview } from "@/components/store/cart-item-preview"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"

export function CartDrawer() {
  const { items, totalItems, totalPrice, isOpen, setIsOpen, updateQuantity, removeItem } = useCart()
  const router = useRouter()

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="size-5" />
            {"\u041a\u043e\u0448\u0438\u043a"}
            {totalItems > 0 && (
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({totalItems})
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {"\u0412\u0430\u0448 \u043a\u043e\u0448\u0438\u043a"}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <ShoppingBag className="size-12 opacity-20" />
            <p className="text-sm font-medium">{"\u041a\u043e\u0448\u0438\u043a \u043f\u043e\u0440\u043e\u0436\u043d\u0456\u0439"}</p>
            <p className="text-xs">{"\u0414\u043e\u0434\u0430\u0439\u0442\u0435 \u0442\u043e\u0432\u0430\u0440\u0438 \u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0443"}</p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-4 px-4">
              <div className="flex flex-col gap-3 pb-4">
                {items.map((item) => (
                  <div
                    key={item.lineKey}
                    className="flex gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    {/* Image */}
                    <div className="size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                      <CartItemPreview item={item} size={128} className="size-full" />
                    </div>

                    {/* Info */}
                    <div className="flex flex-1 flex-col min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase text-muted-foreground">
                        {item.type === "product"
                          ? "\u0422\u043e\u0432\u0430\u0440"
                          : item.type === "custom"
                            ? "\u041a\u0430\u0441\u0442\u043e\u043c\u043d\u0438\u0439 \u0434\u0438\u0437\u0430\u0439\u043d"
                            : "\u041e\u0441\u043d\u043e\u0432\u0430"}
                      </p>

                      <div className="mt-auto flex items-center justify-between pt-2">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.lineKey, item.quantity - 1)}
                            className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted"
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.lineKey, item.quantity + 1)}
                            className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>

                        {/* Price + delete */}
                        <div className="flex items-center gap-2">
                          {item.price != null && item.price > 0 && (
                            <span className="text-sm font-bold text-foreground">
                              {item.price * item.quantity} {"\u0433\u0440\u043d"}
                            </span>
                          )}
                          {item.type === "custom" && item.constructorState && (
                            <button
                              onClick={() => {
                                localStorage.setItem("printmarket_edit_item", JSON.stringify(item))
                                setIsOpen(false)
                                router.push("/create")
                              }}
                              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => removeItem(item.lineKey)}
                            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <SheetFooter className="border-t border-border pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{"\u0412\u0441\u044c\u043e\u0433\u043e"}</span>
                <span className="text-lg font-bold text-foreground">{totalPrice} {"\u0433\u0440\u043d"}</span>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
