import { createServerClient } from "@supabase/ssr"

export async function getSetting(key: string): Promise<string | null> {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (serviceRoleKey && supabaseUrl) {
      const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
        cookies: { getAll: () => [], setAll: () => {} },
      })

      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", key)
        .single()

      if (data?.value) return data.value
    }
  } catch {
    // DB unavailable or table missing — fall through to env
  }

  return process.env[key] ?? null
}
