import { NextRequest, NextResponse } from "next/server"
import { verifyLiqPayCallback } from "@/lib/liqpay"
import { buildMyDropPayloadById } from "@/lib/mydrop-payload"
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
      { cookies: { getAll: () => [], setAll: () => {} } },
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
      const myDropPayload = await buildMyDropPayloadById(supabase, orderId)
      if (myDropPayload) {
        console.log("[MyDrop POST candidate]:", JSON.stringify(myDropPayload, null, 2))
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("LiqPay callback error:", e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
