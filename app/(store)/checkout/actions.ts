"use server"

import { createClient } from "@/lib/supabase/server"
import { searchCities as npSearchCities, getWarehouses as npGetWarehouses } from "@/lib/nova-poshta"
import { generateLiqPayData } from "@/lib/liqpay"
import { headers } from "next/headers"

export async function searchNovaPoshtaCities(query: string) {
  return npSearchCities(query)
}

export async function getNovaPoshtaWarehouses(cityRef: string) {
  return npGetWarehouses(cityRef)
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
}

export async function createOrder(formData: OrderFormData, cartItems: CartItemForOrder[]) {
  const supabase = await createClient()

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
    })
    .select("id, order_number")
    .single()

  if (error || !order) throw new Error("Failed to create order")

  // Insert order items
  const items = cartItems.map((item) => ({
    order_id: order.id,
    item_type: item.type,
    item_id: item.id,
    name: item.name,
    price: item.price ?? 0,
    quantity: item.quantity,
    image_url: item.imageUrl,
    color_name: item.colorName || null,
    size_name: item.sizeName || null,
    preview_data: item.previewDataUrl ? { dataUrl: item.previewDataUrl } : null,
  }))

  const { error: itemsError } = await supabase.from("new_order_items").insert(items)
  if (itemsError) throw new Error("Failed to save order items")

  return { orderId: order.id, orderNumber: order.order_number }
}

export async function generatePaymentData(orderId: string, orderNumber: string, amount: number) {
  const h = await headers()
  const host = h.get("host") ?? "localhost:3000"
  const protocol = h.get("x-forwarded-proto") ?? "http"
  const baseUrl = `${protocol}://${host}`

  const { data, signature } = generateLiqPayData({
    orderId,
    orderNumber,
    amount,
    description: `\u041e\u043f\u043b\u0430\u0442\u0430 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f ${orderNumber}`,
    resultUrl: `${baseUrl}/order-success?order=${orderNumber}`,
    serverUrl: `${baseUrl}/api/liqpay-callback`,
  })

  return { data, signature }
}
