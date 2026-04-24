"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, ShoppingCart, Loader2, ChevronDown, ChevronUp, Package, User, Phone, Mail, MapPin, MessageSquare, CreditCard } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateOrderStatus } from "./actions"
import { OrderItemPreview } from "./_order-item-preview"
import { toast } from "sonner"

interface OrderItem {
  id: string
  item_type: string
  item_id: string
  name: string
  price: number
  quantity: number
  image_url: string | null
  color_name: string | null
  size_name: string | null
  preview_data: { dataUrl?: string } | null
}

interface Order {
  id: string
  order_number: string
  status: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  comment: string | null
  np_city_name: string | null
  np_warehouse_name: string | null
  total_amount: number
  liqpay_status: string | null
  liqpay_payment_id: string | null
  created_at: string
  updated_at: string
  items: OrderItem[]
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "\u041e\u0447\u0456\u043a\u0443\u0454", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  paid: { label: "\u041e\u043f\u043b\u0430\u0447\u0435\u043d\u043e", className: "bg-green-100 text-green-800 border-green-200" },
  processing: { label: "\u0412 \u043e\u0431\u0440\u043e\u0431\u0446\u0456", className: "bg-blue-100 text-blue-800 border-blue-200" },
  shipped: { label: "\u0412\u0456\u0434\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e", className: "bg-purple-100 text-purple-800 border-purple-200" },
  completed: { label: "\u0412\u0438\u043a\u043e\u043d\u0430\u043d\u043e", className: "bg-gray-100 text-gray-800 border-gray-200" },
  cancelled: { label: "\u0421\u043a\u0430\u0441\u043e\u0432\u0430\u043d\u043e", className: "bg-red-100 text-red-800 border-red-200" },
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  product: "\u0422\u043e\u0432\u0430\u0440",
  base: "\u041e\u0441\u043d\u043e\u0432\u0430",
  custom: "\u041a\u043e\u043d\u0441\u0442\u0440\u0443\u043a\u0442\u043e\u0440",
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, className: "bg-gray-100 text-gray-800 border-gray-200" }
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>
}

function ItemTypeBadge({ type }: { type: string }) {
  const label = ITEM_TYPE_LABELS[type] || type
  const className = type === "custom"
    ? "bg-orange-100 text-orange-800 border-orange-200"
    : type === "base"
      ? "bg-cyan-100 text-cyan-800 border-cyan-200"
      : "bg-gray-100 text-gray-800 border-gray-200"
  return <Badge variant="outline" className={className}>{label}</Badge>
}

export default function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchOrders = useCallback(async () => {
    setIsLoading(true)

    const { data: ordersData, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })

    if (error || !ordersData) {
      setOrders([])
      setIsLoading(false)
      return
    }

    const orderIds = ordersData.map((o) => o.id)

    const { data: itemsData } = await supabase
      .from("new_order_items")
      .select("*")
      .in("order_id", orderIds)

    const itemsByOrder: Record<string, OrderItem[]> = {}
    for (const item of itemsData || []) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = []
      itemsByOrder[item.order_id].push(item as OrderItem)
    }

    const enriched: Order[] = ordersData.map((o) => ({
      ...o,
      items: itemsByOrder[o.id] || [],
    })) as Order[]

    setOrders(enriched)
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingStatusId(orderId)
    try {
      await updateOrderStatus(orderId, newStatus)
      setOrders((prev) =>
        prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o)
      )
      toast.success("\u0421\u0442\u0430\u0442\u0443\u0441 \u043e\u043d\u043e\u0432\u043b\u0435\u043d\u043e")
    } catch {
      toast.error("\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u043e\u043d\u043e\u0432\u0438\u0442\u0438 \u0441\u0442\u0430\u0442\u0443\u0441")
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.customer_phone.includes(q)
    )
  })

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {"\u0417\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {"\u0423\u043f\u0440\u0430\u0432\u043b\u044f\u0439\u0442\u0435 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f\u043c\u0438 \u043a\u043b\u0456\u0454\u043d\u0442\u0456\u0432"}
          </p>
        </div>
        {orders.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {filteredOrders.length} {"\u0437 "} {orders.length}
          </div>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 border-b border-border bg-card px-6 py-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={"\u041f\u043e\u0448\u0443\u043a \u0437\u0430 \u043d\u043e\u043c\u0435\u0440\u043e\u043c, \u0456\u043c\u2019\u044f\u043c \u0430\u0431\u043e \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u043e\u043c..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-input bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{"\u0412\u0441\u0456 \u0441\u0442\u0430\u0442\u0443\u0441\u0438"}</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-background p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent">
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-foreground">
              {searchQuery || statusFilter !== "all"
                ? "\u0417\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u044c \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e"
                : "\u0417\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f \u0449\u0435 \u043d\u0435 \u043d\u0430\u0434\u0456\u0439\u0448\u043b\u0438"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "\u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0437\u043c\u0456\u043d\u0438\u0442\u0438 \u043f\u043e\u0448\u0443\u043a\u043e\u0432\u0438\u0439 \u0437\u0430\u043f\u0438\u0442 \u0430\u0431\u043e \u0444\u0456\u043b\u044c\u0442\u0440"
                : "\u0422\u0443\u0442 \u0437\u2019\u044f\u0432\u043b\u044f\u0442\u044c\u0441\u044f \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f, \u043a\u043e\u043b\u0438 \u043a\u043b\u0456\u0454\u043d\u0442\u0438 \u043f\u043e\u0447\u043d\u0443\u0442\u044c \u043a\u0443\u043f\u0443\u0432\u0430\u0442\u0438 \u0442\u043e\u0432\u0430\u0440\u0438"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id
              return (
                <div key={order.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                  {/* Order row */}
                  <button
                    type="button"
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    className="w-full px-5 py-4 text-left transition-colors hover:bg-accent/30"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4 w-full">
                      <div className="flex items-center justify-between sm:contents">
                        <div className="font-mono text-sm font-semibold text-foreground">
                          {order.order_number}
                        </div>
                        <StatusBadge status={order.status} />
                        <div className="sm:hidden">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm sm:contents">
                        <div className="flex flex-col sm:flex-col">
                          <span className="text-sm font-medium text-foreground">{order.customer_name}</span>
                          <span className="text-xs text-muted-foreground">{order.customer_phone}</span>
                        </div>
                        <div className="text-sm font-semibold text-foreground">
                          {Number(order.total_amount).toFixed(0)} {"\u20b4"}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Package className="h-3.5 w-3.5" />
                          {order.items.length}
                        </div>
                        <div className="ml-auto text-xs text-muted-foreground">
                          {formatDate(order.created_at)}
                        </div>
                      </div>
                      <div className="hidden sm:block ml-auto">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/30 px-5 py-5">
                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Customer info */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-foreground">
                            {"\u041a\u043b\u0456\u0454\u043d\u0442"}
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="h-4 w-4" />
                              <span>{order.customer_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{order.customer_phone}</span>
                            </div>
                            {order.customer_email && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                <span>{order.customer_email}</span>
                              </div>
                            )}
                          </div>

                          {(order.np_city_name || order.np_warehouse_name) && (
                            <>
                              <h4 className="text-sm font-semibold text-foreground">
                                {"\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430"}
                              </h4>
                              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                                <div>
                                  {order.np_city_name && <div>{order.np_city_name}</div>}
                                  {order.np_warehouse_name && <div>{order.np_warehouse_name}</div>}
                                </div>
                              </div>
                            </>
                          )}

                          {order.comment && (
                            <>
                              <h4 className="text-sm font-semibold text-foreground">
                                {"\u041a\u043e\u043c\u0435\u043d\u0442\u0430\u0440"}
                              </h4>
                              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{order.comment}</span>
                              </div>
                            </>
                          )}

                          {(order.liqpay_status || order.liqpay_payment_id) && (
                            <>
                              <h4 className="text-sm font-semibold text-foreground">
                                {"\u041e\u043f\u043b\u0430\u0442\u0430"}
                              </h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CreditCard className="h-4 w-4" />
                                <div>
                                  {order.liqpay_status && <span>LiqPay: {order.liqpay_status}</span>}
                                  {order.liqpay_payment_id && (
                                    <span className="ml-2 text-xs">ID: {order.liqpay_payment_id}</span>
                                  )}
                                </div>
                              </div>
                            </>
                          )}

                          {/* Status update */}
                          <div className="pt-2">
                            <h4 className="mb-2 text-sm font-semibold text-foreground">
                              {"\u0417\u043c\u0456\u043d\u0438\u0442\u0438 \u0441\u0442\u0430\u0442\u0443\u0441"}
                            </h4>
                            <Select
                              value={order.status}
                              onValueChange={(val) => handleStatusChange(order.id, val)}
                              disabled={updatingStatusId === order.id}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                                  <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-foreground">
                            {"\u0422\u043e\u0432\u0430\u0440\u0438"} ({order.items.length})
                          </h4>
                          <div className="space-y-3">
                            {order.items.map((item) => {
                              return (
                                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                                    <OrderItemPreview
                                      itemType={item.item_type}
                                      itemId={item.item_id}
                                      imageUrl={item.image_url}
                                      colorName={item.color_name}
                                      previewDataUrl={item.preview_data?.dataUrl ?? null}
                                      name={item.name}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
                                      <ItemTypeBadge type={item.item_type} />
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      {item.color_name && <span>{item.color_name}</span>}
                                      {item.color_name && item.size_name && <span>{"\u00b7"}</span>}
                                      {item.size_name && <span>{item.size_name}</span>}
                                    </div>
                                  </div>
                                  <div className="text-right text-sm">
                                    <div className="font-semibold text-foreground">
                                      {Number(item.price * item.quantity).toFixed(0)} {"\u20b4"}
                                    </div>
                                    {item.quantity > 1 && (
                                      <div className="text-xs text-muted-foreground">
                                        {Number(item.price).toFixed(0)} {"\u00d7"} {item.quantity}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          <div className="flex justify-end border-t border-border pt-3 text-sm">
                            <span className="text-muted-foreground">{"\u0412\u0441\u044c\u043e\u0433\u043e:"}</span>
                            <span className="ml-2 font-semibold text-foreground">
                              {Number(order.total_amount).toFixed(0)} {"\u20b4"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
