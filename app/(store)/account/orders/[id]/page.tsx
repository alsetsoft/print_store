import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { ArrowLeft, MapPin, MessageSquare, Phone, Mail, User, CreditCard } from "lucide-react"
import { OrderItemsList, type OrderItemView } from "./order-detail-client"

const statusLabels: Record<string, string> = {
  pending: "Нове",
  confirmed: "Підтверджено",
  paid: "Оплачено",
  processing: "В обробці",
  production: "У виробництві",
  shipped: "Відправлено",
  delivered: "Доставлено",
  completed: "Виконано",
  cancelled: "Скасовано",
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  processing: "bg-blue-100 text-blue-800",
  production: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
}

const itemTypeLabels: Record<string, string> = {
  product: "Товар",
  base: "Основа",
  custom: "Власний дизайн",
}

interface OrderItemRow {
  id: string
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

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params
  if (!user) redirect(`/login?next=/account/orders/${id}`)

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, customer_name, customer_phone, customer_email, comment, np_city_name, np_warehouse_name, total_amount, liqpay_status, created_at, user_id",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!order) notFound()

  const { data: itemsData } = await supabase
    .from("new_order_items")
    .select(
      "id, item_type, item_id, name, price, quantity, image_url, color_name, size_name, preview_data",
    )
    .eq("order_id", order.id)
    .order("id")

  const items = (itemsData ?? []) as OrderItemRow[]

  const productIds = items
    .filter((i) => i.item_type === "product")
    .map((i) => parseInt(i.item_id))
    .filter((n) => !isNaN(n))

  type ProductMeta = {
    id: number
    base_id: number | null
    print_designs: { id: number; name: string | null } | null
  }

  const productMetaMap = new Map<number, ProductMeta>()
  if (productIds.length > 0) {
    const { data } = await supabase
      .from("products")
      .select("id, base_id, print_designs:print_id(id, name)")
      .in("id", productIds)
    for (const p of (data ?? []) as unknown as ProductMeta[]) {
      productMetaMap.set(p.id, p)
    }
  }

  const placementCountByProduct = new Map<number, number>()
  if (productIds.length > 0) {
    const { data: placements } = await supabase
      .from("product_print_placements")
      .select("product_id")
      .in("product_id", productIds)
    for (const pl of placements ?? []) {
      const pid = pl.product_id as number
      placementCountByProduct.set(pid, (placementCountByProduct.get(pid) ?? 0) + 1)
    }
  }

  const enrichedItems: OrderItemView[] = items.map((it) => {
    const productId = it.item_type === "product" ? parseInt(it.item_id) : NaN
    const meta = !isNaN(productId) ? productMetaMap.get(productId) : undefined
    const printName = meta?.print_designs?.name ?? null
    const zoneCount = !isNaN(productId)
      ? placementCountByProduct.get(productId) ?? 0
      : 0

    return {
      id: it.id,
      itemType: it.item_type,
      itemTypeLabel: itemTypeLabels[it.item_type] ?? it.item_type,
      name: it.name,
      price: it.price,
      quantity: it.quantity,
      imageUrl: it.image_url,
      previewDataUrl: it.preview_data?.dataUrl ?? null,
      colorName: it.color_name,
      sizeName: it.size_name,
      printName,
      zoneCount,
    }
  })

  const orderDate = new Date(order.created_at).toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {"До списку замовлень"}
        </Link>
      </div>

      {/* Header card */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{order.order_number}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{orderDate}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                statusColors[order.status] ?? "bg-gray-100 text-gray-800"
              }`}
            >
              {statusLabels[order.status] ?? order.status}
            </span>
            <span className="text-base font-bold">
              {order.total_amount} {"грн"}
            </span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">
          {"Товари"} ({enrichedItems.length})
        </h3>
        <OrderItemsList items={enrichedItems} />
      </div>

      {/* Delivery & contact */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <MapPin className="size-4 text-muted-foreground" />
            {"Доставка"}
          </h3>
          <div className="space-y-1.5 text-sm">
            <p>{order.np_city_name || "—"}</p>
            {order.np_warehouse_name && (
              <p className="text-muted-foreground">{order.np_warehouse_name}</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <User className="size-4 text-muted-foreground" />
            {"Отримувач"}
          </h3>
          <div className="space-y-1.5 text-sm">
            <p>{order.customer_name}</p>
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="size-3.5" />
              {order.customer_phone}
            </p>
            {order.customer_email && (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="size-3.5" />
                {order.customer_email}
              </p>
            )}
          </div>
        </div>
      </div>

      {order.comment && (
        <div className="rounded-lg border bg-card p-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="size-4 text-muted-foreground" />
            {"Коментар"}
          </h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{order.comment}</p>
        </div>
      )}

      {order.liqpay_status && (
        <div className="rounded-lg border bg-card p-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="size-4 text-muted-foreground" />
            {"Оплата"}
          </h3>
          <p className="text-sm text-muted-foreground">
            LiqPay: <span className="text-foreground">{order.liqpay_status}</span>
          </p>
        </div>
      )}
    </div>
  )
}
