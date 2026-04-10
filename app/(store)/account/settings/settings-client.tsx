"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, X } from "lucide-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { NPRegion, NPCity, NPWarehouse } from "@/lib/nova-poshta"
import { updateProfile } from "./actions"
import {
  getNovaPoshtaRegions,
  searchNovaPoshtaCities,
  getNovaPoshtaWarehouses,
} from "@/app/(store)/checkout/actions"

interface Props {
  profile: {
    id: string
    full_name: string | null
    phone: string | null
    email: string | null
    np_region_ref: string | null
    np_region_name: string | null
    np_city_ref: string | null
    np_city_name: string | null
    np_warehouse_ref: string | null
    np_warehouse_name: string | null
  } | null
  userEmail: string
  hasPasswordAuth: boolean
}

export function SettingsClient({ profile, userEmail, hasPasswordAuth }: Props) {
  const { refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)

  // Profile fields
  const [fullName, setFullName] = useState(profile?.full_name ?? "")
  const [phone, setPhone] = useState(profile?.phone ?? "")
  const [email, setEmail] = useState(profile?.email ?? userEmail)

  // Password change
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  // Nova Poshta
  const [regions, setRegions] = useState<NPRegion[]>([])
  const [selectedRegion, setSelectedRegion] = useState<NPRegion | null>(
    profile?.np_region_ref ? { id: Number(profile.np_region_ref), name: profile.np_region_name ?? "" } as NPRegion : null
  )
  const [regionOpen, setRegionOpen] = useState(false)
  const [regionSearch, setRegionSearch] = useState("")

  const [cities, setCities] = useState<NPCity[]>([])
  const [citySearch, setCitySearch] = useState("")
  const [selectedCity, setSelectedCity] = useState<NPCity | null>(
    profile?.np_city_ref ? { id: Number(profile.np_city_ref), name: profile.np_city_name ?? "", regionId: "" } as NPCity : null
  )
  const [cityOpen, setCityOpen] = useState(false)
  const [citiesLoading, setCitiesLoading] = useState(false)

  const [warehouses, setWarehouses] = useState<NPWarehouse[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<NPWarehouse | null>(
    profile?.np_warehouse_ref ? { id: Number(profile.np_warehouse_ref), name: profile.np_warehouse_name ?? "" } as NPWarehouse : null
  )
  const [warehouseOpen, setWarehouseOpen] = useState(false)
  const [warehousesLoading, setWarehousesLoading] = useState(false)
  const [warehouseSearch, setWarehouseSearch] = useState("")

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    getNovaPoshtaRegions().then(setRegions).catch(() => setRegions([]))
    // Mark as mounted after first render cycle
    requestAnimationFrame(() => { mountedRef.current = true })
  }, [])

  const handleCitySearch = useCallback((value: string) => {
    setCitySearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.length < 2) { setCities([]); return }
    debounceRef.current = setTimeout(async () => {
      setCitiesLoading(true)
      setCityOpen(true)
      try {
        const results = await searchNovaPoshtaCities(value)
        const filtered = selectedRegion ? results.filter((c) => c.regionId === selectedRegion.id) : results
        setCities(filtered)
      } catch { setCities([]) }
      finally { setCitiesLoading(false) }
    }, 300)
  }, [selectedRegion])

  // Reset city & warehouse when region changes (skip initial mount to preserve profile data)
  useEffect(() => {
    if (!mountedRef.current) return
    setSelectedCity(null)
    setCities([])
    setCitySearch("")
    setWarehouses([])
    setSelectedWarehouse(null)
    setWarehouseSearch("")
  }, [selectedRegion])

  // Load warehouses when city changes
  useEffect(() => {
    if (!selectedCity) {
      if (mountedRef.current) { setWarehouses([]); setSelectedWarehouse(null); setWarehouseSearch("") }
      return
    }
    let cancelled = false
    setWarehousesLoading(true)
    // Only clear selected warehouse when user actively changes city (not on mount)
    if (mountedRef.current) setSelectedWarehouse(null)
    getNovaPoshtaWarehouses(selectedCity.id)
      .then((d) => { if (!cancelled) setWarehouses(d) })
      .catch(() => { if (!cancelled) setWarehouses([]) })
      .finally(() => { if (!cancelled) setWarehousesLoading(false) })
    return () => { cancelled = true }
  }, [selectedCity])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile({
        fullName,
        phone,
        email,
        npRegionRef: selectedRegion ? String(selectedRegion.id) : null,
        npRegionName: selectedRegion?.name ?? null,
        npCityRef: selectedCity ? String(selectedCity.id) : null,
        npCityName: selectedCity?.name ?? null,
        npWarehouseRef: selectedWarehouse ? String(selectedWarehouse.id) : null,
        npWarehouseName: selectedWarehouse?.name ?? null,
      })
      await refreshProfile()
      toast.success("\u041f\u0440\u043e\u0444\u0456\u043b\u044c \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u043e")
    } catch {
      toast.error("\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u043d\u044f")
    }
    setSaving(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("\u041f\u0430\u0440\u043e\u043b\u0456 \u043d\u0435 \u0441\u043f\u0456\u0432\u043f\u0430\u0434\u0430\u044e\u0442\u044c")
      return
    }
    if (newPassword.length < 6) {
      toast.error("\u041f\u0430\u0440\u043e\u043b\u044c \u043c\u0430\u0454 \u043c\u0456\u0441\u0442\u0438\u0442\u0438 \u043c\u0456\u043d\u0456\u043c\u0443\u043c 6 \u0441\u0438\u043c\u0432\u043e\u043b\u0456\u0432")
      return
    }
    setChangingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast.error("\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0437\u043c\u0456\u043d\u0438 \u043f\u0430\u0440\u043e\u043b\u044e")
    } else {
      toast.success("\u041f\u0430\u0440\u043e\u043b\u044c \u0437\u043c\u0456\u043d\u0435\u043d\u043e")
      setNewPassword("")
      setConfirmPassword("")
    }
    setChangingPassword(false)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{"\u041d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f"}</h2>

      {/* Profile form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="rounded-lg border bg-card p-5">
          <h3 className="mb-4 text-base font-semibold">{"\u041e\u0441\u043e\u0431\u0438\u0441\u0442\u0456 \u0434\u0430\u043d\u0456"}</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="s-name">{"\u0406\u043c'\u044f \u0442\u0430 \u043f\u0440\u0456\u0437\u0432\u0438\u0449\u0435"}</Label>
              <Input id="s-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="s-phone">{"\u0422\u0435\u043b\u0435\u0444\u043e\u043d"}</Label>
              <Input id="s-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+380XXXXXXXXX" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="s-email">Email</Label>
              <Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
            </div>
          </div>
        </div>

        {/* Nova Poshta address */}
        <div className="rounded-lg border bg-card p-5">
          <h3 className="mb-4 text-base font-semibold">{"\u0410\u0434\u0440\u0435\u0441\u0430 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438"}</h3>
          <div className="space-y-4">
            {/* Region */}
            <div>
              <Label>{"\u041e\u0431\u043b\u0430\u0441\u0442\u044c"}</Label>
              <div className="relative mt-1.5">
                {selectedRegion ? (
                  <div className="flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm">
                    <span className="flex-1 truncate">{selectedRegion.name}</span>
                    <button type="button" onClick={() => setSelectedRegion(null)} className="ml-2 shrink-0 text-muted-foreground hover:text-foreground">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <Input
                    placeholder={"\u041f\u043e\u0448\u0443\u043a \u043e\u0431\u043b\u0430\u0441\u0442\u0456..."}
                    value={regionSearch}
                    onChange={(e) => setRegionSearch(e.target.value)}
                    onFocus={() => setRegionOpen(true)}
                    onBlur={() => setRegionOpen(false)}
                  />
                )}
                {regionOpen && (() => {
                  const filtered = regions.filter((r) => !regionSearch || r.name.toLowerCase().includes(regionSearch.toLowerCase()))
                  return filtered.length > 0 ? (
                    <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                      {filtered.map((region) => (
                        <button
                          key={region.id}
                          type="button"
                          className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setSelectedRegion(region); setRegionSearch(""); setRegionOpen(false) }}
                        >
                          {region.name}
                        </button>
                      ))}
                    </div>
                  ) : null
                })()}
              </div>
            </div>

            {/* City */}
            <div>
              <Label>{"\u041c\u0456\u0441\u0442\u043e"}</Label>
              <div className="relative mt-1.5">
                {selectedCity ? (
                  <div className="flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm">
                    <span className="flex-1 truncate">{selectedCity.name}</span>
                    <button type="button" onClick={() => setSelectedCity(null)} className="ml-2 shrink-0 text-muted-foreground hover:text-foreground">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <Input
                    placeholder={selectedRegion ? "\u041f\u043e\u0448\u0443\u043a \u043c\u0456\u0441\u0442\u0430..." : "\u0421\u043f\u043e\u0447\u0430\u0442\u043a\u0443 \u043e\u0431\u0435\u0440\u0456\u0442\u044c \u043e\u0431\u043b\u0430\u0441\u0442\u044c"}
                    disabled={!selectedRegion}
                    value={citySearch}
                    onChange={(e) => handleCitySearch(e.target.value)}
                    onFocus={() => { if (cities.length > 0) setCityOpen(true) }}
                    onBlur={() => setCityOpen(false)}
                  />
                )}
                {cityOpen && (citiesLoading || cities.length > 0 || (citySearch.length >= 2 && !citiesLoading)) && (
                  <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                    {citiesLoading && <div className="flex items-center justify-center py-3"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>}
                    {!citiesLoading && citySearch.length >= 2 && cities.length === 0 && (
                      <p className="px-2 py-1.5 text-sm text-muted-foreground">{"\u041c\u0456\u0441\u0442\u043e \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e"}</p>
                    )}
                    {!citiesLoading && cities.map((city) => (
                      <button
                        key={city.id}
                        type="button"
                        className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setSelectedCity(city); setCityOpen(false); setCitySearch("") }}
                      >
                        {city.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Warehouse */}
            <div>
              <Label>{"\u0412\u0456\u0434\u0434\u0456\u043b\u0435\u043d\u043d\u044f"}</Label>
              <div className="relative mt-1.5">
                {selectedWarehouse ? (
                  <div className="flex min-h-9 items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm">
                    <span className="flex-1 line-clamp-2">{selectedWarehouse.name}</span>
                    <button type="button" onClick={() => setSelectedWarehouse(null)} className="ml-2 shrink-0 text-muted-foreground hover:text-foreground">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : warehousesLoading ? (
                  <div className="flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {"\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f..."}
                  </div>
                ) : (
                  <Input
                    placeholder={selectedCity ? "\u041f\u043e\u0448\u0443\u043a \u0432\u0456\u0434\u0434\u0456\u043b\u0435\u043d\u043d\u044f..." : "\u0421\u043f\u043e\u0447\u0430\u0442\u043a\u0443 \u043e\u0431\u0435\u0440\u0456\u0442\u044c \u043c\u0456\u0441\u0442\u043e"}
                    disabled={!selectedCity}
                    value={warehouseSearch}
                    onChange={(e) => setWarehouseSearch(e.target.value)}
                    onFocus={() => setWarehouseOpen(true)}
                    onBlur={() => setWarehouseOpen(false)}
                  />
                )}
                {warehouseOpen && !selectedWarehouse && !warehousesLoading && (() => {
                  const filtered = warehouses.filter((w) => !warehouseSearch || w.name.toLowerCase().includes(warehouseSearch.toLowerCase()))
                  return filtered.length > 0 ? (
                    <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                      {filtered.map((wh) => (
                        <button
                          key={wh.id}
                          type="button"
                          className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setSelectedWarehouse(wh); setWarehouseOpen(false); setWarehouseSearch("") }}
                        >
                          {wh.name}
                        </button>
                      ))}
                    </div>
                  ) : null
                })()}
              </div>
            </div>
          </div>
        </div>

        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          {"\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438"}
        </Button>
      </form>

      {/* Change password */}
      {hasPasswordAuth && (
        <form onSubmit={handleChangePassword} className="rounded-lg border bg-card p-5">
          <h3 className="mb-4 text-base font-semibold">{"\u0417\u043c\u0456\u043d\u0438\u0442\u0438 \u043f\u0430\u0440\u043e\u043b\u044c"}</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="s-new-pw">{"\u041d\u043e\u0432\u0438\u0439 \u043f\u0430\u0440\u043e\u043b\u044c"}</Label>
              <Input id="s-new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={"\u041c\u0456\u043d\u0456\u043c\u0443\u043c 6 \u0441\u0438\u043c\u0432\u043e\u043b\u0456\u0432"} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="s-confirm-pw">{"\u041f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0456\u0442\u044c \u043f\u0430\u0440\u043e\u043b\u044c"}</Label>
              <Input id="s-confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1.5" />
            </div>
            <Button type="submit" variant="outline" disabled={changingPassword}>
              {changingPassword && <Loader2 className="mr-2 size-4 animate-spin" />}
              {"\u0417\u043c\u0456\u043d\u0438\u0442\u0438 \u043f\u0430\u0440\u043e\u043b\u044c"}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
