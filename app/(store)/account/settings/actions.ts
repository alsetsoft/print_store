"use server"

import { createClient } from "@/lib/supabase/server"

interface UpdateProfileData {
  fullName: string
  phone: string
  email: string
  npRegionRef: string | null
  npRegionName: string | null
  npCityRef: string | null
  npCityName: string | null
  npWarehouseRef: string | null
  npWarehouseName: string | null
}

export async function updateProfile(data: UpdateProfileData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("customer_profiles")
    .update({
      full_name: data.fullName,
      phone: data.phone,
      email: data.email,
      np_region_ref: data.npRegionRef,
      np_region_name: data.npRegionName,
      np_city_ref: data.npCityRef,
      np_city_name: data.npCityName,
      np_warehouse_ref: data.npWarehouseRef,
      np_warehouse_name: data.npWarehouseName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) throw new Error("Failed to update profile")
}
