"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CartItemType = "product" | "base" | "custom"

export interface ConstructorState {
  baseId: string
  colorId: string | null
  sizeId: string | null
  imgIndex: number
  elements: Array<{
    id: string
    type: string
    zoneId: string
    position: { x: number; y: number }
    scale: number
    flipped: boolean
    imageUrl?: string
    text?: string
    textColor?: string
    fontFamily?: string
    textAlign?: string
  }>
}

export interface CartItem {
  id: string
  type: CartItemType
  // Composite per-variant key. Two items with the same product id but different
  // color/size are different lines and must have different lineKeys.
  lineKey: string
  name: string
  price: number | null
  imageUrl: string | null
  quantity: number
  // Product composite preview data (base + print)
  printImageUrl?: string | null
  zones?: { id: string; x: number; y: number; width: number; height: number }[]
  placements?: Record<string, { x: number; y: number; scale: number; is_mirrored: boolean; printImageUrl?: string }>
  // Custom design metadata
  colorName?: string
  sizeName?: string
  previewDataUrl?: string
  constructorState?: ConstructorState
}

function makeLineKey(
  type: CartItemType,
  id: string,
  colorName?: string,
  sizeName?: string,
): string {
  return `${type}:${id}:${colorName ?? ""}:${sizeName ?? ""}`
}

interface CartContextValue {
  items: CartItem[]
  totalItems: number
  totalPrice: number
  addItem: (item: Omit<CartItem, "quantity" | "lineKey">) => void
  removeItem: (lineKey: string) => void
  updateQuantity: (lineKey: string, quantity: number) => void
  updateItem: (lineKey: string, updates: Partial<Omit<CartItem, "quantity" | "lineKey">>) => void
  clearCart: () => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const CartContext = createContext<CartContextValue | null>(null)

const STORAGE_KEY = "printmarket_cart"

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<Partial<CartItem> & { id: string; type: CartItemType }>
    // Backfill lineKey for carts saved before this field existed.
    return parsed.map((i) => ({
      ...(i as CartItem),
      lineKey:
        i.lineKey ?? makeLineKey(i.type, i.id, i.colorName, i.sizeName),
    }))
  } catch {
    return []
  }
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage
  useEffect(() => {
    setItems(loadCart())
    setHydrated(true)
  }, [])

  // Persist on change (skip initial hydration)
  useEffect(() => {
    if (hydrated) saveCart(items)
  }, [items, hydrated])

  const addItem = useCallback((item: Omit<CartItem, "quantity" | "lineKey">) => {
    const lineKey = makeLineKey(item.type, item.id, item.colorName, item.sizeName)
    setItems((prev) => {
      const existing = prev.find((i) => i.lineKey === lineKey)
      if (existing) {
        return prev.map((i) =>
          i.lineKey === lineKey ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, lineKey, quantity: 1 }]
    })
  }, [])

  const removeItem = useCallback((lineKey: string) => {
    setItems((prev) => prev.filter((i) => i.lineKey !== lineKey))
  }, [])

  const updateQuantity = useCallback((lineKey: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.lineKey !== lineKey))
      return
    }
    setItems((prev) =>
      prev.map((i) => (i.lineKey === lineKey ? { ...i, quantity } : i))
    )
  }, [])

  const updateItem = useCallback(
    (lineKey: string, updates: Partial<Omit<CartItem, "quantity" | "lineKey">>) => {
      setItems((prev) =>
        prev.map((i) => {
          if (i.lineKey !== lineKey) return i
          const next = { ...i, ...updates }
          // If color/size changed, recompute the lineKey so the line stays unique
          // against other variants.
          if (updates.colorName !== undefined || updates.sizeName !== undefined) {
            next.lineKey = makeLineKey(next.type, next.id, next.colorName, next.sizeName)
          }
          return next
        })
      )
    },
    [],
  )

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        totalPrice,
        addItem,
        removeItem,
        updateQuantity,
        updateItem,
        clearCart,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
