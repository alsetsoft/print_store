import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSetting } from "@/lib/settings"

const RATE_LIMIT = 30
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000
const ipRequests = new Map<string, number[]>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const timestamps = (ipRequests.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (timestamps.length >= RATE_LIMIT) {
    ipRequests.set(ip, timestamps)
    return false
  }
  timestamps.push(now)
  ipRequests.set(ip, timestamps)
  return true
}

const bodySchema = z.object({
  photoBase64: z.string().optional(),
  height: z.number().min(100).max(250).optional(),
  weight: z.number().min(30).max(200).optional(),
  gender: z.enum(["male", "female", "unisex"]).optional(),
  category: z.string().max(50).optional(),
  fitPreference: z.enum(["slim", "regular", "oversize"]).optional(),
  brand: z.string().max(50).optional(),
  measurements: z.record(z.string(), z.number()).optional(),
})

type Body = z.infer<typeof bodySchema>

const MAX_PHOTO_BYTES = 7 * 1024 * 1024

const SYSTEM_PROMPT = [
  "\u0422\u0438 \u0435\u043a\u0441\u043f\u0435\u0440\u0442 \u0437 \u043f\u0456\u0434\u0431\u043e\u0440\u0443 \u0440\u043e\u0437\u043c\u0456\u0440\u0443 \u043e\u0434\u044f\u0433\u0443 \u0434\u043b\u044f \u0443\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u043e\u0433\u043e \u043c\u0430\u0433\u0430\u0437\u0438\u043d\u0443.",
  "\u041f\u043e\u0432\u0435\u0440\u0442\u0430\u0439 \u0422\u0406\u041b\u042c\u041a\u0418 JSON \u0431\u0435\u0437 \u0436\u043e\u0434\u043d\u043e\u0433\u043e \u0442\u0435\u043a\u0441\u0442\u0443 \u0434\u043e\u0432\u043a\u043e\u043b\u0430.",
  "\u0421\u0445\u0435\u043c\u0430 \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u0456:",
  "{",
  '  "recommended_size": "XS|S|M|L|XL|XXL \u0430\u0431\u043e EU/UA \u0440\u043e\u0437\u043c\u0456\u0440",',
  '  "alternative_size": "\u0430\u043b\u044c\u0442\u0435\u0440\u043d\u0430\u0442\u0438\u0432\u0430 \u0430\u0431\u043e null",',
  '  "fit_explanation": "\u043a\u043e\u0440\u043e\u0442\u043a\u0435 \u043f\u043e\u044f\u0441\u043d\u0435\u043d\u043d\u044f \u0443\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u043e\u044e",',
  '  "confidence": 0.0-1.0,',
  '  "confidence_level": "low|medium|high",',
  '  "assumptions": ["\u043f\u0440\u0438\u043f\u0443\u0449\u0435\u043d\u043d\u044f 1", ...],',
  '  "missing_data": ["\u0447\u043e\u0433\u043e \u043d\u0435 \u0432\u0438\u0441\u0442\u0430\u0447\u0430\u0454", ...],',
  '  "disclaimer": "\u0434\u0438\u0441\u043a\u043b\u0435\u0439\u043c\u0435\u0440 \u0443\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u043e\u044e"',
  "}",
  "\u0412\u0435\u0441\u044c \u0442\u0435\u043a\u0441\u0442\u043e\u0432\u0438\u0439 \u0432\u043c\u0456\u0441\u0442 \u2014 \u0443\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u043e\u044e \u043c\u043e\u0432\u043e\u044e. \u0411\u0443\u0434\u044c \u043a\u043e\u043d\u043a\u0440\u0435\u0442\u043d\u0438\u043c \u0442\u0430 \u043e\u0431\u0435\u0440\u0435\u0436\u043d\u0438\u043c, \u0432\u043a\u0430\u0437\u0443\u0439 \u043e\u0431\u043c\u0435\u0436\u0435\u043d\u043d\u044f.",
].join("\n")

function buildUserText(b: Body): string {
  const lines: string[] = []
  if (b.gender) lines.push(`\u0421\u0442\u0430\u0442\u044c: ${b.gender}`)
  if (b.category) lines.push(`\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044f: ${b.category}`)
  if (b.height) lines.push(`\u0417\u0440\u0456\u0441\u0442: ${b.height} \u0441\u043c`)
  if (b.weight) lines.push(`\u0412\u0430\u0433\u0430: ${b.weight} \u043a\u0433`)
  if (b.fitPreference) lines.push(`\u041f\u043e\u0441\u0430\u0434\u043a\u0430: ${b.fitPreference}`)
  if (b.brand) lines.push(`\u0411\u0440\u0435\u043d\u0434: ${b.brand}`)
  if (b.measurements) {
    for (const [k, v] of Object.entries(b.measurements)) {
      lines.push(`${k}: ${v}`)
    }
  }
  if (b.photoBase64) {
    lines.push("\u041d\u0430 \u0444\u043e\u0442\u043e \u2014 \u043b\u044e\u0434\u0438\u043d\u0430, \u0434\u043b\u044f \u044f\u043a\u043e\u0457 \u043f\u043e\u0442\u0440\u0456\u0431\u0435\u043d \u043f\u0456\u0434\u0431\u0456\u0440 \u0440\u043e\u0437\u043c\u0456\u0440\u0443. \u041e\u0446\u0456\u043d\u0438 \u0441\u0438\u043b\u0443\u0435\u0442 \u0432\u0456\u0437\u0443\u0430\u043b\u044c\u043d\u043e \u0442\u0430 \u043f\u043e\u0432\u0435\u0440\u043d\u0438 \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0456\u044e \u0437\u0430 \u0434\u043e\u043a\u043b\u0430\u0434\u0435\u043d\u043e\u044e \u0441\u0445\u0435\u043c\u043e\u044e.")
  }
  if (lines.length === 0) {
    lines.push("\u0414\u0430\u043d\u0456 \u043d\u0435 \u043d\u0430\u0434\u0430\u043d\u0456 \u2014 \u043f\u043e\u0432\u0435\u0440\u043d\u0438 \u043d\u0438\u0437\u044c\u043a\u0443 \u0432\u043f\u0435\u0432\u043d\u0435\u043d\u0456\u0441\u0442\u044c \u0442\u0430 \u0441\u043f\u0438\u0441\u043e\u043a missing_data.")
  }
  return lines.join("\n")
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "\u0417\u0430\u0431\u0430\u0433\u0430\u0442\u043e \u0437\u0430\u043f\u0438\u0442\u0456\u0432. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u0456\u0437\u043d\u0456\u0448\u0435." },
      { status: 429 },
    )
  }

  let parsed: Body
  try {
    const raw = await request.json()
    parsed = bodySchema.parse(raw)
  } catch {
    return NextResponse.json(
      { error: "\u041d\u0435\u0432\u0456\u0440\u043d\u0456 \u0432\u0445\u0456\u0434\u043d\u0456 \u0434\u0430\u043d\u0456" },
      { status: 400 },
    )
  }

  if (parsed.photoBase64) {
    const approxBytes = parsed.photoBase64.length * 0.75
    if (approxBytes > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { error: "\u0424\u0430\u0439\u043b \u0437\u0430\u043d\u0430\u0434\u0442\u043e \u0432\u0435\u043b\u0438\u043a\u0438\u0439" },
        { status: 413 },
      )
    }
    if (!parsed.photoBase64.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "\u041d\u0435\u0432\u0456\u0440\u043d\u0438\u0439 \u0444\u043e\u0440\u043c\u0430\u0442 \u0444\u043e\u0442\u043e" },
        { status: 400 },
      )
    }
  }

  const apiKey = await getSetting("OPENAI_API_KEY")
  if (!apiKey) {
    return NextResponse.json(
      { error: "\u041a\u043b\u044e\u0447 OpenAI API \u043d\u0435 \u043d\u0430\u043b\u0430\u0448\u0442\u043e\u0432\u0430\u043d\u043e" },
      { status: 500 },
    )
  }

  const userContent: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
    { type: "text", text: buildUserText(parsed) },
  ]
  if (parsed.photoBase64) {
    userContent.push({ type: "image_url", image_url: { url: parsed.photoBase64 } })
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 600,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => null)
      console.error("size-recommendation OpenAI error:", response.status, err)
      return NextResponse.json(
        { error: "\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" },
        { status: 502 },
      )
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content
    if (!raw || typeof raw !== "string") {
      return NextResponse.json(
        { error: "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u043e\u0431\u0440\u043e\u0431\u0438\u0442\u0438 \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u044c" },
        { status: 502 },
      )
    }

    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch {
      return NextResponse.json(
        { error: "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u043e\u0431\u0440\u043e\u0431\u0438\u0442\u0438 \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u044c" },
        { status: 502 },
      )
    }

    return NextResponse.json(json)
  } catch (e) {
    console.error("size-recommendation failed:", e)
    return NextResponse.json(
      { error: "\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" },
      { status: 500 },
    )
  }
}
