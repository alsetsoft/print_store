import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/account/settings")

  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  const hasPasswordAuth = user.app_metadata?.providers?.includes("email") ?? !!user.email

  return (
    <SettingsClient
      profile={profile}
      userEmail={user.email ?? ""}
      hasPasswordAuth={hasPasswordAuth}
    />
  )
}
