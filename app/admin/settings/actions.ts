"use server"

import { createClient } from "@/lib/supabase/server"

const SETTING_KEYS = [
  "LIQPAY_PUBLIC_KEY",
  "LIQPAY_PRIVATE_KEY",
  "NOVA_POSHTA_API_KEY",
  "OPENAI_API_KEY",
] as const

type SettingKey = (typeof SETTING_KEYS)[number]

interface SettingInfo {
  key: SettingKey
  source: "db" | "env" | "none"
  maskedValue: string
}

function maskValue(value: string): string {
  if (value.length <= 8) return "\u2022".repeat(value.length)
  return value.slice(0, 4) + "\u2022".repeat(value.length - 8) + value.slice(-4)
}

export async function getSettings(): Promise<SettingInfo[]> {
  const supabase = await createClient()

  const { data: dbSettings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", SETTING_KEYS as unknown as string[])

  const dbMap = new Map(dbSettings?.map((s) => [s.key, s.value]) ?? [])

  return SETTING_KEYS.map((key) => {
    const dbValue = dbMap.get(key)
    if (dbValue) {
      return { key, source: "db" as const, maskedValue: maskValue(dbValue) }
    }
    const envValue = process.env[key]
    if (envValue) {
      return { key, source: "env" as const, maskedValue: maskValue(envValue) }
    }
    return { key, source: "none" as const, maskedValue: "" }
  })
}

export async function saveSetting(key: SettingKey, value: string) {
  if (!SETTING_KEYS.includes(key)) throw new Error("Invalid setting key")
  if (!value.trim()) throw new Error("Value cannot be empty")

  const supabase = await createClient()

  const { error } = await supabase
    .from("settings")
    .upsert({ key, value: value.trim(), updated_at: new Date().toISOString() }, { onConflict: "key" })

  if (error) throw new Error("Failed to save setting")
}

export async function deleteSetting(key: SettingKey) {
  if (!SETTING_KEYS.includes(key)) throw new Error("Invalid setting key")

  const supabase = await createClient()

  const { error } = await supabase.from("settings").delete().eq("key", key)

  if (error) throw new Error("Failed to delete setting")
}
