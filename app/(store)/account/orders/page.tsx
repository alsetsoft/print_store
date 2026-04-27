import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Package } from "lucide-react"

const statusLabels: Record<string, string> = {
  pending: "\u041d\u043e\u0432\u0435",
  confirmed: "\u041f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043d\u043e",
  production: "\u0423 \u0432\u0438\u0440\u043e\u0431\u043d\u0438\u0446\u0442\u0432\u0456",
  shipped: "\u0412\u0456\u0434\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e",
  delivered: "\u0414\u043e\u0441\u0442\u0430\u0432\u043b\u0435\u043d\u043e",
  cancelled: "\u0421\u043a\u0430\u0441\u043e\u0432\u0430\u043d\u043e",
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  production: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/account/orders")

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1", 10))
  const perPage = 10
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data: orders, count } = await supabase
    .from("orders")
    .select("id, order_number, status, total_amount, np_city_name, np_warehouse_name, created_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to)

  const totalPages = Math.ceil((count ?? 0) / perPage)

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{"\u0406\u0441\u0442\u043e\u0440\u0456\u044f \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u044c"}</h2>

      {(!orders || orders.length === 0) ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Package className="mb-3 size-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{"\u0417\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u044c \u0449\u0435 \u043d\u0435\u043c\u0430\u0454"}</p>
          <Link href="/catalog" className="mt-2 text-sm text-primary hover:underline">
            {"\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u0434\u043e \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0443"}
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="block rounded-lg border bg-card p-4 transition-colors hover:border-primary hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{order.order_number}</span>
                    <span className="ml-3 text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("uk-UA", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[order.status] ?? "bg-gray-100 text-gray-800"}`}>
                      {statusLabels[order.status] ?? order.status}
                    </span>
                    <span className="text-sm font-bold">{order.total_amount} {"\u0433\u0440\u043d"}</span>
                  </div>
                </div>
                {order.np_city_name && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {order.np_city_name}
                    {order.np_warehouse_name && `, ${order.np_warehouse_name}`}
                  </p>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {page > 1 && (
                <Link
                  href={`/account/orders?page=${page - 1}`}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                >
                  {"\u2190"}
                </Link>
              )}
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/account/orders?page=${page + 1}`}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                >
                  {"\u2192"}
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
