"use server"

import { headers } from "next/headers"

// Rate limit: 10 requests per IP per 24 hours
const RATE_LIMIT = 10
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

export async function generateDalleImage(prompt: string): Promise<{ imageUrl: string } | { error: string }> {
  // Rate limit by IP
  const h = await headers()
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown"
  if (!checkRateLimit(ip)) {
    return { error: "\u0412\u0438 \u0432\u0438\u0447\u0435\u0440\u043f\u0430\u043b\u0438 \u043b\u0456\u043c\u0456\u0442 \u0433\u0435\u043d\u0435\u0440\u0430\u0446\u0456\u0439 (10 \u043d\u0430 \u0434\u0435\u043d\u044c). \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0437\u0430\u0432\u0442\u0440\u0430." }
  }

  // Validate input
  if (!prompt || prompt.trim().length < 3) {
    return { error: "\u041f\u0440\u043e\u043c\u043f\u0442 \u043c\u0430\u0454 \u043c\u0456\u0441\u0442\u0438\u0442\u0438 \u043c\u0456\u043d\u0456\u043c\u0443\u043c 3 \u0441\u0438\u043c\u0432\u043e\u043b\u0438" }
  }
  if (prompt.length > 1000) {
    return { error: "\u041f\u0440\u043e\u043c\u043f\u0442 \u043d\u0435 \u043c\u043e\u0436\u0435 \u043f\u0435\u0440\u0435\u0432\u0438\u0449\u0443\u0432\u0430\u0442\u0438 1000 \u0441\u0438\u043c\u0432\u043e\u043b\u0456\u0432" }
  }

  const { getSetting } = await import("@/lib/settings")
  const apiKey = await getSetting("OPENAI_API_KEY")
  if (!apiKey) {
    return { error: "\u041a\u043b\u044e\u0447 OpenAI API \u043d\u0435 \u043d\u0430\u043b\u0430\u0448\u0442\u043e\u0432\u0430\u043d\u043e" }
  }

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: `Create an isolated object/character with NO background. The image must have a completely transparent background (alpha channel). Do not add any background color, scenery, shadows on the ground, or decorative elements behind the subject. The subject should float on a clean transparent canvas like a sticker or cutout. Subject: ${prompt.trim()}`,
        n: 1,
        size: "1024x1024",
        quality: "medium",
        output_format: "png",
        background: "transparent",
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => null)
      const rawMessage = err?.error?.message || ""
      console.error("DALL-E API error:", response.status, rawMessage, err)
      const detail = rawMessage
        ? `: ${rawMessage.slice(0, 200)}`
        : ""
      const safeMessage = response.status === 401
        ? "\u041d\u0435\u0432\u0456\u0440\u043d\u0438\u0439 API-\u043a\u043b\u044e\u0447 OpenAI. \u041f\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u043d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f."
        : response.status === 429
        ? "\u0417\u0430\u0431\u0430\u0433\u0430\u0442\u043e \u0437\u0430\u043f\u0438\u0442\u0456\u0432. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u0456\u0437\u043d\u0456\u0448\u0435."
        : `\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0433\u0435\u043d\u0435\u0440\u0430\u0446\u0456\u0457 (HTTP ${response.status})${detail}`
      return { error: safeMessage }
    }

    const data = await response.json()
    const b64 = data.data?.[0]?.b64_json
    if (!b64) {
      return { error: "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u043e\u0442\u0440\u0438\u043c\u0430\u0442\u0438 \u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u043d\u044f" }
    }

    return { imageUrl: `data:image/png;base64,${b64}` }
  } catch (err) {
    console.error("DALL-E generation failed:", err)
    return { error: "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0437\u0433\u0435\u043d\u0435\u0440\u0443\u0432\u0430\u0442\u0438 \u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u043d\u044f. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u0456\u0437\u043d\u0456\u0448\u0435." }
  }
}
