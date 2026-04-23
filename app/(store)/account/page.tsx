import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Package, ArrowRight } from "lucide-react"

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

export default async function AccountPage() {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }
  if (!user) redirect("/login?next=/account")

  const [profileRes, ordersRes] = await Promise.all([
    supabase.from("customer_profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("orders")
      .select("id, order_number, status, total_amount, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const profile = profileRes.data
  const orders = ordersRes.data ?? []

  return (
    <div className="space-y-6">
      {/* Profile summary */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 text-base font-semibold">{"\u041f\u0440\u043e\u0444\u0456\u043b\u044c"}</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">{"\u0406\u043c'\u044f: "}</span>
            {profile?.full_name || "\u2014"}
          </div>
          <div>
            <span className="text-muted-foreground">Email: </span>
            {profile?.email || user.email || "\u2014"}
          </div>
          <div>
            <span className="text-muted-foreground">{"\u0422\u0435\u043b\u0435\u0444\u043e\u043d: "}</span>
            {profile?.phone || "\u2014"}
          </div>
          {profile?.np_city_name && (
            <div>
              <span className="text-muted-foreground">{"\u041c\u0456\u0441\u0442\u043e: "}</span>
              {profile.np_city_name}
            </div>
          )}
        </div>
        <Link
          href="/account/settings"
          className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          {"\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438"}
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Recent orders */}
      <div className="rounded-lg border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{"\u041e\u0441\u0442\u0430\u043d\u043d\u0456 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f"}</h2>
          {orders.length > 0 && (
            <Link href="/account/orders" className="text-sm text-primary hover:underline">
              {"\u0412\u0441\u0456 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f"}
            </Link>
          )}
        </div>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Package className="mb-2 size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{"\u0417\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u044c \u0449\u0435 \u043d\u0435\u043c\u0430\u0454"}</p>
            <Link href="/catalog" className="mt-2 text-sm text-primary hover:underline">
              {"\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u0434\u043e \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0443"}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-md border px-4 py-3">
                <div>
                  <span className="text-sm font-medium">{order.order_number}</span>
                  <span className="ml-3 text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("uk-UA")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[order.status] ?? "bg-gray-100 text-gray-800"}`}>
                    {statusLabels[order.status] ?? order.status}
                  </span>
                  <span className="text-sm font-semibold">{order.total_amount} {"\u0433\u0440\u043d"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
