import type { SupabaseClient } from "@supabase/supabase-js"
import { findRegionUaName } from "@/lib/nova-poshta"

const KYIV_DATETIME_FMT = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Kyiv",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
})

function formatKyivTimestamp(iso: string | null | undefined): string {
  if (!iso) return ""
  return KYIV_DATETIME_FMT.format(new Date(iso)).replace("T", " ")
}

// `orders.np_warehouse_name` is stored as "<shortName>, <address>" (the picker
// joins them with ", "). MyDrop wants "<shortName>: <address>" — convert the
// first comma to a colon while preserving any commas inside the address.
function formatReceivePoint(warehouseName: string | null | undefined): string {
  if (!warehouseName) return ""
  const idx = warehouseName.indexOf(",")
  if (idx === -1) return warehouseName
  const left = warehouseName.slice(0, idx).trim()
  const right = warehouseName.slice(idx + 1).trim()
  return right ? `${left}: ${right}` : left
}

type OrderRow = {
  id: string
  customer_name: string | null
  customer_phone: string | null
  np_city_name: string | null
  np_warehouse_ref: string | null
  np_warehouse_name: string | null
  total_amount: number | null
  created_at: string | null
  updated_at: string | null
}

type OrderItemRow = {
  item_type: string
  item_id: string
  name: string
  price: number
  quantity: number
  image_url: string | null
  color_name: string | null
  size_name: string | null
  preview_data: { dataUrl?: string; baseId?: number } | null
}

export type AttachmentSource =
  | { kind: "url"; url: string; filename: string }
  | { kind: "dataUrl"; dataUrl: string; filename: string }

export interface BuiltMyDropOrder {
  payload: MyDropPayload
  attachments: AttachmentSource[]
}

function filenameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname
    const base = path.substring(path.lastIndexOf("/") + 1)
    return decodeURIComponent(base) || "attachment"
  } catch {
    return "attachment"
  }
}

export interface MyDropPayload {
  source_id: number
  buyer_comment: string
  manager_id: number
  manager_comment: string
  is_gift: boolean
  gift_wrap: boolean
  ordered_at: string
  buyer: { full_name: string; phone: string }
  shipping: {
    delivery_service_id: number
    shipping_address_city: string
    shipping_address_country: string
    shipping_address_region: string
    shipping_receive_point: string
    recipient_full_name: string
    recipient_phone: string
    warehouse_ref: string
  }
  products: Array<{
    sku: string
    price: number
    purchased_price: number
    quantity: number
    name: string
    picture: string | null
    properties: Array<{ name: string; value: string }>
  }>
  payments: Array<{
    payment_method_id: number
    payment_method: string
    amount: number
    description: string
    payment_date: string
    status: string
  }>
}

async function buildFromOrder(
  supabase: SupabaseClient,
  order: OrderRow,
  items: OrderItemRow[],
): Promise<BuiltMyDropOrder> {
  // Resolve bases.sku per item. Custom items carry their underlying baseId
  // inside preview_data (set by checkout actions); product items resolve
  // through products.base_id; base items use item_id directly.
  const productIds = items
    .filter((it) => it.item_type === "product")
    .map((it) => parseInt(it.item_id))
    .filter((n) => !isNaN(n))

  const productToBase = new Map<number, number>()
  const productToPrint = new Map<number, number>()
  if (productIds.length > 0) {
    const { data: prodRows } = await supabase
      .from("products")
      .select("id, base_id, print_id")
      .in("id", productIds)
    for (const p of (prodRows ?? []) as Array<{
      id: number
      base_id: number | null
      print_id: number | null
    }>) {
      if (p.base_id != null) productToBase.set(p.id, p.base_id)
      if (p.print_id != null) productToPrint.set(p.id, p.print_id)
    }
  }

  const printIds = Array.from(new Set(productToPrint.values()))
  const printImageById = new Map<number, string>()
  if (printIds.length > 0) {
    const { data: printRows } = await supabase
      .from("print_designs")
      .select("id, image_url")
      .in("id", printIds)
    for (const r of (printRows ?? []) as Array<{ id: number; image_url: string | null }>) {
      if (r.image_url) printImageById.set(r.id, r.image_url)
    }
  }

  const baseIdForItem = (it: OrderItemRow): number | null => {
    if (it.item_type === "base") {
      const n = parseInt(it.item_id)
      return isNaN(n) ? null : n
    }
    if (it.item_type === "product") {
      const pid = parseInt(it.item_id)
      return isNaN(pid) ? null : productToBase.get(pid) ?? null
    }
    if (it.item_type === "custom") {
      const bid = it.preview_data?.baseId
      return typeof bid === "number" ? bid : null
    }
    return null
  }

  const baseIds = Array.from(
    new Set(items.map(baseIdForItem).filter((v): v is number => v !== null)),
  )

  const baseSkuById = new Map<number, string>()
  if (baseIds.length > 0) {
    const { data: baseRows } = await supabase
      .from("bases")
      .select("id, sku")
      .in("id", baseIds)
    for (const b of (baseRows ?? []) as Array<{ id: number; sku: string | null }>) {
      if (b.sku) baseSkuById.set(b.id, b.sku)
    }
  }

  const orderedAt = formatKyivTimestamp(order.created_at)
  const paymentDate = formatKyivTimestamp(order.updated_at)
  const regionUaName = await findRegionUaName(order.np_city_name ?? "")

  const attachments: AttachmentSource[] = []
  items.forEach((it, idx) => {
    if (it.item_type === "product") {
      const pid = parseInt(it.item_id)
      if (isNaN(pid)) {
        console.log(`[mydrop] item ${idx} product: bad item_id "${it.item_id}"`)
        return
      }
      const printId = productToPrint.get(pid)
      if (printId == null) {
        console.log(`[mydrop] item ${idx} product ${pid}: no print_id`)
        return
      }
      const url = printImageById.get(printId)
      if (!url) {
        console.log(`[mydrop] item ${idx} product ${pid}: print ${printId} has no image_url`)
        return
      }
      console.log(`[mydrop] item ${idx} product ${pid}: attach print ${printId} url=${url}`)
      attachments.push({ kind: "url", url, filename: filenameFromUrl(url) })
      return
    }
    if (it.item_type === "custom") {
      const dataUrl = it.preview_data?.dataUrl
      if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
        console.log(`[mydrop] item ${idx} custom: attach dataUrl (${dataUrl.length} chars)`)
        attachments.push({
          kind: "dataUrl",
          dataUrl,
          filename: `constructor-${order.id}-${idx}.png`,
        })
      } else {
        console.log(`[mydrop] item ${idx} custom: no preview_data.dataUrl`)
      }
    } else {
      console.log(`[mydrop] item ${idx} ${it.item_type}: skip (no attachment for type)`)
    }
  })
  console.log(`[mydrop] order ${order.id}: ${attachments.length} attachment(s)`)

  const payload: MyDropPayload = {
    source_id: 99,
    buyer_comment: "ТЕСТОВЕ замовлення з Print Website",
    manager_id: 26,
    manager_comment: "Дроппер: Любомир Любчинський",
    is_gift: false,
    gift_wrap: false,
    ordered_at: orderedAt,
    buyer: {
      full_name: order.customer_name ?? "",
      phone: order.customer_phone ?? "",
    },
    shipping: {
      delivery_service_id: 1,
      shipping_address_city: order.np_city_name ?? "",
      shipping_address_country: "Ukraine",
      shipping_address_region: regionUaName,
      shipping_receive_point: formatReceivePoint(order.np_warehouse_name),
      recipient_full_name: order.customer_name ?? "",
      recipient_phone: order.customer_phone ?? "",
      warehouse_ref: order.np_warehouse_ref ?? "",
    },
    products: items.map((it) => {
      const bid = baseIdForItem(it)
      const sku = bid != null ? baseSkuById.get(bid) ?? "" : ""
      const properties: Array<{ name: string; value: string }> = []
      if (it.color_name) properties.push({ name: "Колір", value: it.color_name })
      if (it.size_name) properties.push({ name: "Розмір", value: it.size_name })
      return {
        sku,
        price: Number(it.price),
        purchased_price: 0,
        quantity: it.quantity,
        name: it.name,
        picture: it.image_url,
        properties,
      }
    }),
    payments: [
      {
        payment_method_id: 47,
        payment_method: "Liqpay Голова",
        amount: Number(order.total_amount ?? 0),
        description: "Liqpay Голова",
        payment_date: paymentDate,
        status: "paid",
      },
    ],
  }

  return { payload, attachments }
}

const ORDER_COLUMNS =
  "id, customer_name, customer_phone, np_city_name, np_warehouse_ref, np_warehouse_name, total_amount, created_at, updated_at"
const ITEM_COLUMNS =
  "item_type, item_id, name, price, quantity, image_url, color_name, size_name, preview_data"

export async function buildMyDropPayloadById(
  supabase: SupabaseClient,
  orderId: string,
): Promise<BuiltMyDropOrder | null> {
  const { data: order } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", orderId)
    .single()
  if (!order) return null

  const { data: items } = await supabase
    .from("new_order_items")
    .select(ITEM_COLUMNS)
    .eq("order_id", orderId)

  return buildFromOrder(supabase, order as OrderRow, (items ?? []) as OrderItemRow[])
}

export async function buildMyDropPayloadByOrderNumber(
  supabase: SupabaseClient,
  orderNumber: string,
): Promise<BuiltMyDropOrder | null> {
  const { data: order } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("order_number", orderNumber)
    .single()
  if (!order) return null

  const { data: items } = await supabase
    .from("new_order_items")
    .select(ITEM_COLUMNS)
    .eq("order_id", order.id)

  return buildFromOrder(supabase, order as OrderRow, (items ?? []) as OrderItemRow[])
}
