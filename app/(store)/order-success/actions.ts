"use server"

import { createClient } from "@/lib/supabase/server"
import { buildMyDropPayloadByOrderNumber, type MyDropPayload } from "@/lib/mydrop-payload"

export async function getMyDropPayload(orderNumber: string): Promise<MyDropPayload | null> {
  if (!orderNumber) return null
  const supabase = await createClient()
  return buildMyDropPayloadByOrderNumber(supabase, orderNumber)
}
