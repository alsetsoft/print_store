"use server"

import { createClient } from "@/lib/supabase/server"
import { getRegions, searchCities, getWarehouses } from "@/lib/nova-poshta"
import { generateLiqPayData } from "@/lib/liqpay"
import { headers } from "next/headers"

export async function getNovaPoshtaRegions() {
  return getRegions()
}

export async function searchNovaPoshtaCities(query: string) {
  return searchCities(query)
}

export async function getNovaPoshtaWarehouses(settlementId: number) {
  return getWarehouses(settlementId)
}

interface OrderFormData {
  customerName: string
  customerPhone: string
  customerEmail?: string
  comment?: string
  npCityRef: string
  npCityName: string
  npWarehouseRef: string
  npWarehouseName: string
}

interface CartItemForOrder {
  id: string
  type: string
  name: string
  price: number | null
  imageUrl: string | null
  quantity: number
  colorName?: string
  sizeName?: string
  previewDataUrl?: string
  constructorBaseId?: string
}

export async function createOrder(formData: OrderFormData, cartItems: CartItemForOrder[]) {
  const supabase = await createClient()

  // Get authenticated user (if any). Tolerate a stale refresh token so guest
  // checkout still works when the browser has an invalidated session cookie.
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  // Generate order number
  const { data: seqData, error: seqError } = await supabase.rpc("nextval_order_number")

  let orderNumber: string
  if (seqError) {
    // Fallback: use timestamp-based number
    orderNumber = `PM-${Date.now().toString().slice(-6)}`
  } else {
    orderNumber = `PM-${String(seqData).padStart(6, "0")}`
  }

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0)

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_name: formData.customerName,
      customer_phone: formData.customerPhone,
      customer_email: formData.customerEmail || null,
      comment: formData.comment || null,
      np_city_ref: formData.npCityRef,
      np_city_name: formData.npCityName,
      np_warehouse_ref: formData.npWarehouseRef,
      np_warehouse_name: formData.npWarehouseName,
      total_amount: totalAmount,
      user_id: user?.id ?? null,
    })
    .select("id, order_number")
    .single()

  if (error || !order) throw new Error("Failed to create order")

  // Insert order items. Stash constructorBaseId in preview_data for custom
  // items so the paid-order callback can resolve bases.sku without a join
  // through any client-only state.
  const items = cartItems.map((item) => {
    const constructorBaseIdInt = item.constructorBaseId ? parseInt(item.constructorBaseId) : NaN
    const previewData =
      item.previewDataUrl || Number.isFinite(constructorBaseIdInt)
        ? {
            ...(item.previewDataUrl ? { dataUrl: item.previewDataUrl } : {}),
            ...(Number.isFinite(constructorBaseIdInt) ? { baseId: constructorBaseIdInt } : {}),
          }
        : null

    return {
      order_id: order.id,
      item_type: item.type,
      item_id: item.id,
      name: item.name,
      price: item.price ?? 0,
      quantity: item.quantity,
      image_url: item.imageUrl,
      color_name: item.colorName || null,
      size_name: item.sizeName || null,
      preview_data: previewData,
    }
  })

  const { error: itemsError } = await supabase.from("new_order_items").insert(items)
  if (itemsError) throw new Error("Failed to save order items")

  return { orderId: order.id, orderNumber: order.order_number }
}

export interface CartDebugItem {
  lineKey: string
  id: string
  type: string
  name: string
  price: number | null
  quantity: number
  colorName?: string
  sizeName?: string
  constructorBaseId?: string
}

export interface CartDebugInfo {
  lineKey: string
  type: string
  name: string
  price: number | null
  quantity: number
  colorName?: string
  sizeName?: string
  product?: { id: number; url: string }
  base?: { id: number; name: string | null; url: string; imageUrl: string | null }
  print?: { id: number; name: string | null; url: string; imageUrl: string | null }
}

export async function getCartDebugInfo(cartItems: CartDebugItem[]): Promise<CartDebugInfo[]> {
  const supabase = await createClient()

  const productIds = cartItems
    .filter((i) => i.type === "product")
    .map((i) => parseInt(i.id))
    .filter((n) => !isNaN(n))

  const baseIdsFromBase = cartItems
    .filter((i) => i.type === "base")
    .map((i) => parseInt(i.id))
    .filter((n) => !isNaN(n))
  const baseIdsFromCustom = cartItems
    .filter((i) => i.type === "custom" && i.constructorBaseId)
    .map((i) => parseInt(i.constructorBaseId!))
    .filter((n) => !isNaN(n))

  type ProductRow = {
    id: number
    base_id: number | null
    print_id: number | null
    bases: { id: number; name: string; image_url: string | null } | null
    print_designs: { id: number; name: string; image_url: string | null } | null
  }

  const productsMap = new Map<number, ProductRow>()
  if (productIds.length > 0) {
    const { data } = await supabase
      .from("products")
      .select(
        "id, base_id, print_id, bases:base_id(id, name, image_url), print_designs:print_id(id, name, image_url)",
      )
      .in("id", productIds)
    for (const p of (data ?? []) as unknown as ProductRow[]) productsMap.set(p.id, p)
  }

  const basesMap = new Map<number, { id: number; name: string; image_url: string | null }>()
  for (const p of productsMap.values()) {
    if (p.bases) basesMap.set(p.bases.id, p.bases)
  }
  const remainingBaseIds = [...new Set([...baseIdsFromBase, ...baseIdsFromCustom])].filter(
    (id) => !basesMap.has(id),
  )
  if (remainingBaseIds.length > 0) {
    const { data } = await supabase
      .from("bases")
      .select("id, name, image_url")
      .in("id", remainingBaseIds)
    for (const b of (data ?? []) as Array<{ id: number; name: string; image_url: string | null }>) {
      basesMap.set(b.id, b)
    }
  }

  return cartItems.map((item) => {
    const out: CartDebugInfo = {
      lineKey: item.lineKey,
      type: item.type,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      colorName: item.colorName,
      sizeName: item.sizeName,
    }

    if (item.type === "product") {
      const productId = parseInt(item.id)
      out.product = { id: productId, url: `/product/${productId}` }
      const prod = productsMap.get(productId)
      if (prod?.bases) {
        out.base = {
          id: prod.bases.id,
          name: prod.bases.name,
          url: `/base/${prod.bases.id}`,
          imageUrl: prod.bases.image_url,
        }
      }
      if (prod?.print_designs) {
        out.print = {
          id: prod.print_designs.id,
          name: prod.print_designs.name,
          url: `/print/${prod.print_designs.id}`,
          imageUrl: prod.print_designs.image_url,
        }
      }
    } else if (item.type === "base") {
      const baseId = parseInt(item.id)
      if (!isNaN(baseId)) {
        const b = basesMap.get(baseId)
        out.base = {
          id: baseId,
          name: b?.name ?? null,
          url: `/base/${baseId}`,
          imageUrl: b?.image_url ?? null,
        }
      }
    } else if (item.type === "custom" && item.constructorBaseId) {
      const baseId = parseInt(item.constructorBaseId)
      if (!isNaN(baseId)) {
        const b = basesMap.get(baseId)
        out.base = {
          id: baseId,
          name: b?.name ?? null,
          url: `/base/${baseId}`,
          imageUrl: b?.image_url ?? null,
        }
      }
    }

    return out
  })
}

export async function generatePaymentData(orderId: string, orderNumber: string, amount: number) {
  const h = await headers()
  const host = h.get("host") ?? "localhost:3000"
  const protocol = h.get("x-forwarded-proto") ?? "http"
  const baseUrl = `${protocol}://${host}`

  const { data, signature } = await generateLiqPayData({
    orderId,
    orderNumber,
    amount,
    description: `\u041e\u043f\u043b\u0430\u0442\u0430 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f ${orderNumber}`,
    resultUrl: `${baseUrl}/order-success?order=${orderNumber}`,
    serverUrl: `${baseUrl}/api/liqpay-callback`,
  })

  return { data, signature }
}
