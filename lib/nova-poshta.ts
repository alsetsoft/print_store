import { getSetting } from "@/lib/settings"

const API_URL = "https://api-stage.novapost.pl/v.1.0"

// ── Interfaces ──

export interface NPRegion {
  id: number
  name: string
  nameEn: string
}

export interface NPCity {
  id: number
  name: string
  regionName: string
  regionId: number
}

export interface NPWarehouse {
  id: number
  name: string
  shortName: string
  address: string
}

// ── JWT Auth ──

let jwtToken: string | null = null
let jwtExpiry = 0
let lastApiKey: string | null = null

async function getJwtToken(): Promise<string> {
  const apiKey = await getSetting("NOVA_POSHTA_API_KEY")
  if (!apiKey) throw new Error("Nova Poshta API key not configured")

  // Invalidate cache if key changed
  if (lastApiKey && lastApiKey !== apiKey) {
    jwtToken = null
    jwtExpiry = 0
  }
  lastApiKey = apiKey

  if (jwtToken && Date.now() < jwtExpiry) return jwtToken

  const res = await fetch(`${API_URL}/clients/authorization?apiKey=${apiKey}`)

  if (!res.ok) throw new Error(`Nova Poshta auth failed: ${res.status}`)
  const data = await res.json()
  jwtToken = data.jwt
  // Cache for 55 minutes (token expires at 1 hour)
  jwtExpiry = Date.now() + 55 * 60 * 1000
  return jwtToken!
}

// ── Generic request helper ──

async function npRequest<T>(path: string, params: Record<string, string | string[]> = {}): Promise<T> {
  const jwt = await getJwtToken()
  const url = new URL(`${API_URL}${path}`)

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((v) => url.searchParams.append(key, v))
    } else {
      url.searchParams.set(key, value)
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: jwt,
    },
  })

  if (!res.ok) throw new Error(`Nova Poshta API ${path}: ${res.status}`)
  return res.json()
}

// ── Hardcoded Ukrainian oblasts (stable political divisions) ──

const UA_REGIONS: NPRegion[] = [
  { id: 398, name: "\u0412\u0456\u043d\u043d\u0438\u0446\u044c\u043a\u0430", nameEn: "Vinnytska oblast" },
  { id: 399, name: "\u0412\u043e\u043b\u0438\u043d\u0441\u044c\u043a\u0430", nameEn: "Volynska oblast" },
  { id: 400, name: "\u0414\u043d\u0456\u043f\u0440\u043e\u043f\u0435\u0442\u0440\u043e\u0432\u0441\u044c\u043a\u0430", nameEn: "Dnipropetrovska oblast" },
  { id: 401, name: "\u0414\u043e\u043d\u0435\u0446\u044c\u043a\u0430", nameEn: "Donetska oblast" },
  { id: 402, name: "\u0416\u0438\u0442\u043e\u043c\u0438\u0440\u0441\u044c\u043a\u0430", nameEn: "Zhytomyrska oblast" },
  { id: 403, name: "\u0417\u0430\u043a\u0430\u0440\u043f\u0430\u0442\u0441\u044c\u043a\u0430", nameEn: "Zakarpatska oblast" },
  { id: 404, name: "\u0417\u0430\u043f\u043e\u0440\u0456\u0437\u044c\u043a\u0430", nameEn: "Zaporizka oblast" },
  { id: 405, name: "\u0406\u0432\u0430\u043d\u043e-\u0424\u0440\u0430\u043d\u043a\u0456\u0432\u0441\u044c\u043a\u0430", nameEn: "Ivano-Frankivska oblast" },
  { id: 406, name: "\u041a\u0438\u0457\u0432\u0441\u044c\u043a\u0430", nameEn: "Kyivska oblast" },
  { id: 407, name: "\u041a\u0456\u0440\u043e\u0432\u043e\u0433\u0440\u0430\u0434\u0441\u044c\u043a\u0430", nameEn: "Kirovohradska oblast" },
  { id: 408, name: "\u041b\u0443\u0433\u0430\u043d\u0441\u044c\u043a\u0430", nameEn: "Luhanska oblast" },
  { id: 409, name: "\u041b\u044c\u0432\u0456\u0432\u0441\u044c\u043a\u0430", nameEn: "Lvivska oblast" },
  { id: 410, name: "\u041c\u0438\u043a\u043e\u043b\u0430\u0457\u0432\u0441\u044c\u043a\u0430", nameEn: "Mykolaivska oblast" },
  { id: 411, name: "\u041e\u0434\u0435\u0441\u044c\u043a\u0430", nameEn: "Odeska oblast" },
  { id: 412, name: "\u041f\u043e\u043b\u0442\u0430\u0432\u0441\u044c\u043a\u0430", nameEn: "Poltavska oblast" },
  { id: 413, name: "\u0420\u0456\u0432\u043d\u0435\u043d\u0441\u044c\u043a\u0430", nameEn: "Rivnenska oblast" },
  { id: 414, name: "\u0421\u0443\u043c\u0441\u044c\u043a\u0430", nameEn: "Sumska oblast" },
  { id: 415, name: "\u0422\u0435\u0440\u043d\u043e\u043f\u0456\u043b\u044c\u0441\u044c\u043a\u0430", nameEn: "Ternopilska oblast" },
  { id: 416, name: "\u0425\u0430\u0440\u043a\u0456\u0432\u0441\u044c\u043a\u0430", nameEn: "Kharkivska oblast" },
  { id: 417, name: "\u0425\u0435\u0440\u0441\u043e\u043d\u0441\u044c\u043a\u0430", nameEn: "Khersonska oblast" },
  { id: 418, name: "\u0425\u043c\u0435\u043b\u044c\u043d\u0438\u0446\u044c\u043a\u0430", nameEn: "Khmelnytska oblast" },
  { id: 419, name: "\u0427\u0435\u0440\u043a\u0430\u0441\u044c\u043a\u0430", nameEn: "Cherkaska oblast" },
  { id: 420, name: "\u0427\u0435\u0440\u043d\u0456\u0432\u0435\u0446\u044c\u043a\u0430", nameEn: "Chernivetska oblast" },
  { id: 421, name: "\u0427\u0435\u0440\u043d\u0456\u0433\u0456\u0432\u0441\u044c\u043a\u0430", nameEn: "Chernihivska oblast" },
]

// ── Exported functions ──

export async function getRegions(): Promise<NPRegion[]> {
  return UA_REGIONS
}

interface SettlementsResponse {
  items: Array<{
    id: number
    name: string
    alternativeNames: string[]
    region: {
      id: number
      name: string
      parent?: { id: number; name: string }
    }
  }>
  current_page: number
  last_page: number
  total: number
}

export async function searchCities(query: string): Promise<NPCity[]> {
  if (!query || query.length < 2) return []

  const data = await npRequest<SettlementsResponse>("/settlements", {
    "countryCodes[]": ["UA"],
    name: query,
    limit: "30",
    page: "1",
  })

  return (data.items ?? []).map((s) => {
    // alternativeNames is a flat string array; pick the Ukrainian one (contains cyrillic)
    const uaName = s.alternativeNames?.find((n) => /[\u0400-\u04FF]/.test(n)) ?? s.name
    // region.parent is the oblast; for Kyiv city it's null (region.name is "Kyivska oblast")
    const regionEngName = s.region?.parent?.name ?? s.region?.name ?? ""

    return {
      id: s.id,
      name: uaName,
      regionName: regionEngName,
      regionId: s.region?.parent?.id ?? s.region?.id ?? 0,
    }
  })
}

interface DivisionsResponse {
  items: Array<{
    id: number
    shortName: string
    address: string
    name: string
  }>
  current_page: number
  last_page: number
  total: number
}

export async function getWarehouses(settlementId: number): Promise<NPWarehouse[]> {
  const allWarehouses: NPWarehouse[] = []
  let page = 1
  let lastPage = 1

  while (page <= lastPage) {
    const data = await npRequest<DivisionsResponse>("/divisions", {
      "countryCodes[]": ["UA"],
      "statuses[]": ["Working"],
      "settlementIds[]": [String(settlementId)],
      "divisionCategories[]": ["PostBranch", "PUDO"],
      limit: "100",
      page: String(page),
    })

    for (const d of data.items ?? []) {
      allWarehouses.push({
        id: d.id,
        name: d.shortName ? `${d.shortName}, ${d.address}` : d.name,
        shortName: d.shortName ?? d.name,
        address: d.address ?? "",
      })
    }

    lastPage = data.last_page
    page++
  }

  return allWarehouses.sort((a, b) => a.name.localeCompare(b.name, "uk"))
}
