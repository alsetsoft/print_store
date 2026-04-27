"use server"

import { createClient } from "@/lib/supabase/server"
import { buildMyDropPayloadByOrderNumber, type MyDropPayload } from "@/lib/mydrop-payload"
import { submitOrderToKeyCrm } from "@/lib/keycrm"

export async function getMyDropPayload(orderNumber: string): Promise<MyDropPayload | null> {
  if (!orderNumber) return null
  const supabase = await createClient()
  const built = await buildMyDropPayloadByOrderNumber(supabase, orderNumber)

  console.log("[order-success] payload built for", orderNumber, "->", built ? "ok" : "not found")

  if (!built) return null

  // Atomic transition guards against double-submit (refresh, dev callback race).
  const { data: transitioned, error: updateError } = await supabase
    .from("orders")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("order_number", orderNumber)
    .neq("status", "paid")
    .select("id")
    .maybeSingle()

  if (updateError) {
    console.error("[order-success] failed to mark order paid:", updateError)
  }

  if (transitioned) {
    console.log(
      "[order-success] sending to KeyCRM:",
      orderNumber,
      `(${built.attachments.length} attachments)`,
    )
    try {
      await submitOrderToKeyCrm(built.payload, built.attachments)
      console.log("[order-success] KeyCRM submit ok:", orderNumber)
    } catch (err) {
      console.error("[order-success] KeyCRM submit failed:", err)
    }
  } else {
    console.log("[order-success] already submitted, skipping KeyCRM:", orderNumber)
  }

  return built.payload
}
