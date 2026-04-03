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

interface CartContextValue {
  items: CartItem[]
  totalItems: number
  totalPrice: number
  addItem: (item: Omit<CartItem, "quantity">) => void
  removeItem: (id: string, type: CartItemType) => void
  updateQuantity: (id: string, type: CartItemType, quantity: number) => void
  updateItem: (id: string, type: CartItemType, updates: Partial<Omit<CartItem, "quantity">>) => void
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
    return raw ? JSON.parse(raw) : []
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

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id && i.type === item.type)
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && i.type === item.type
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }, [])

  const removeItem = useCallback((id: string, type: CartItemType) => {
    setItems((prev) => prev.filter((i) => !(i.id === id && i.type === type)))
  }, [])

  const updateQuantity = useCallback((id: string, type: CartItemType, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => !(i.id === id && i.type === type)))
      return
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === id && i.type === type ? { ...i, quantity } : i
      )
    )
  }, [])

  const updateItem = useCallback((id: string, type: CartItemType, updates: Partial<Omit<CartItem, "quantity">>) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id && i.type === type ? { ...i, ...updates } : i
      )
    )
  }, [])

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
