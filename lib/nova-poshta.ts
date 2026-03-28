const API_URL = "https://api.novaposhta.ua/v2.0/json/"
const API_KEY = process.env.NOVA_POSHTA_API_KEY!

interface NPCity {
  ref: string
  description: string
  region: string
}

interface NPWarehouse {
  ref: string
  description: string
}

async function npRequest(model: string, method: string, properties: Record<string, unknown> = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: API_KEY,
      modelName: model,
      calledMethod: method,
      methodProperties: properties,
    }),
  })

  if (!res.ok) throw new Error(`Nova Poshta API error: ${res.status}`)
  const json = await res.json()
  if (!json.success) throw new Error(`Nova Poshta API: ${JSON.stringify(json.errors)}`)
  return json.data
}

export async function searchCities(query: string): Promise<NPCity[]> {
  if (!query || query.length < 2) return []

  const data = await npRequest("Address", "searchSettlements", {
    CityName: query,
    Limit: "20",
    Page: "1",
  })

  const addresses = data?.[0]?.Addresses ?? []
  return addresses.map((a: Record<string, string>) => ({
    ref: a.DeliveryCity,
    description: a.Present,
    region: a.Region ?? "",
  }))
}

export async function getWarehouses(cityRef: string): Promise<NPWarehouse[]> {
  if (!cityRef) return []

  const data = await npRequest("Address", "getWarehouses", {
    CityRef: cityRef,
    Limit: "500",
    Page: "1",
  })

  return (data ?? []).map((w: Record<string, string>) => ({
    ref: w.Ref,
    description: w.Description,
  }))
}
