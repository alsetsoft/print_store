"use server"

import { createClient } from "@/lib/supabase/server"

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const supabase = await createClient()

  const validStatuses = ["pending", "paid", "processing", "shipped", "completed", "cancelled"]
  if (!validStatuses.includes(newStatus)) {
    throw new Error("Invalid status")
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", orderId)

  if (error) throw new Error("Failed to update order status")

  return { success: true }
}
