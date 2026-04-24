import { NextRequest, NextResponse } from "next/server"
import { verifyLiqPayCallback } from "@/lib/liqpay"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const data = formData.get("data") as string
    const signature = formData.get("signature") as string

    if (!data || !signature) {
      return NextResponse.json({ error: "Missing data or signature" }, { status: 400 })
    }

    const payload = await verifyLiqPayCallback(data, signature)
    if (!payload) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
    }

    const status = payload.status as string
    const orderId = payload.order_id as string
    const paymentId = payload.payment_id as string | undefined

    // LiqPay sandbox returns "sandbox" for successful test payments
    const isPaid = status === "sandbox" || status === "success"

    // Create Supabase client without cookies (external callback)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )

    await supabase
      .from("orders")
      .update({
        liqpay_order_id: orderId,
        liqpay_status: status,
        liqpay_payment_id: paymentId ?? null,
        status: isPaid ? "paid" : status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (isPaid) {
      const { data: order } = await supabase
        .from("orders")
        .select(
          "id, order_number, status, customer_name, customer_phone, customer_email, comment, np_city_ref, np_city_name, np_warehouse_ref, np_warehouse_name, total_amount, liqpay_order_id, liqpay_status, liqpay_payment_id, created_at, updated_at, user_id"
        )
        .eq("id", orderId)
        .single()

      const { data: items } = await supabase
        .from("new_order_items")
        .select("item_type, item_id, name, price, quantity, image_url, color_name, size_name")
        .eq("order_id", orderId)

      const crmPayload = {
        order: {
          id: order?.id,
          number: order?.order_number,
          status: order?.status,
          total_amount: order?.total_amount,
          currency: "UAH",
          comment: order?.comment,
          created_at: order?.created_at,
          paid_at: order?.updated_at,
        },
        customer: {
          user_id: order?.user_id,
          name: order?.customer_name,
          phone: order?.customer_phone,
          email: order?.customer_email,
        },
        delivery: {
          provider: "nova_poshta",
          city_ref: order?.np_city_ref,
          city_name: order?.np_city_name,
          warehouse_ref: order?.np_warehouse_ref,
          warehouse_name: order?.np_warehouse_name,
        },
        payment: {
          provider: "liqpay",
          liqpay_order_id: order?.liqpay_order_id,
          liqpay_payment_id: order?.liqpay_payment_id,
          liqpay_status: order?.liqpay_status,
        },
        items: (items ?? []).map((it) => ({
          type: it.item_type,
          id: it.item_id,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          subtotal: Number(it.price) * it.quantity,
          image_url: it.image_url,
          color: it.color_name,
          size: it.size_name,
        })),
      }

      console.log("[CRM payload] POST candidate:", JSON.stringify(crmPayload, null, 2))
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("LiqPay callback error:", e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
