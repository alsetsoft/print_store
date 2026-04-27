import { Buffer } from "node:buffer"
import type { AttachmentSource, MyDropPayload } from "@/lib/mydrop-payload"

const DEFAULT_API_URL = "http://localhost:3001/v1"
const DEFAULT_TOKEN = "ODBkZjVkYWFiMGZjYjYxM2E0Mzk1Njk5ZmE2Y2Y0MzZlNTAxMjVlNQ"

function apiUrl(): string {
  return (process.env.KEYCRM_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, "")
}

function authHeader(): string {
  return `Bearer ${process.env.KEYCRM_API_TOKEN ?? DEFAULT_TOKEN}`
}

async function readErrorText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ""
  }
}

export async function createKeyCrmOrder(payload: MyDropPayload): Promise<{ id: number }> {
  const res = await fetch(`${apiUrl()}/order`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`KeyCRM /order failed ${res.status}: ${await readErrorText(res)}`)
  const json = (await res.json()) as { id: number }
  return { id: json.id }
}

export async function uploadFileToKeyCrm(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<{ id: number }> {
  const form = new FormData()
  form.append("file", new Blob([buffer], { type: mimeType }), filename)

  const res = await fetch(`${apiUrl()}/storage/upload`, {
    method: "POST",
    headers: { Authorization: authHeader() },
    body: form,
  })
  if (!res.ok) throw new Error(`KeyCRM /storage/upload failed ${res.status}: ${await readErrorText(res)}`)
  const json = (await res.json()) as { id: number }
  return { id: json.id }
}

export async function attachFileToKeyCrmOrder(orderId: number, fileId: number): Promise<void> {
  const res = await fetch(`${apiUrl()}/order/${orderId}/attachment/${fileId}`, {
    method: "POST",
    headers: { Authorization: authHeader() },
  })
  if (!res.ok) {
    throw new Error(
      `KeyCRM /order/${orderId}/attachment/${fileId} failed ${res.status}: ${await readErrorText(res)}`,
    )
  }
}

function dedupKey(a: AttachmentSource): string {
  if (a.kind === "url") return `url:${a.url}`
  return `data:${a.dataUrl.length}:${a.dataUrl.slice(0, 64)}`
}

function decodeDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string } {
  const match = /^data:([^;]+);base64,(.*)$/i.exec(dataUrl)
  if (!match) throw new Error("Invalid data URL")
  return { mimeType: match[1] || "image/png", buffer: Buffer.from(match[2], "base64") }
}

export async function submitOrderToKeyCrm(
  payload: MyDropPayload,
  attachments: AttachmentSource[],
): Promise<void> {
  const { id: orderId } = await createKeyCrmOrder(payload)

  const seen = new Set<string>()
  const unique = attachments.filter((a) => {
    const key = dedupKey(a)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  for (const att of unique) {
    try {
      console.log(`[KeyCRM submit] uploading ${att.filename} (${att.kind})`)
      let buffer: Buffer
      let mimeType: string

      if (att.kind === "url") {
        const fileRes = await fetch(att.url)
        if (!fileRes.ok) {
          console.warn(`[KeyCRM submit] skip ${att.url}: download ${fileRes.status}`)
          continue
        }
        buffer = Buffer.from(await fileRes.arrayBuffer())
        mimeType = fileRes.headers.get("content-type") ?? "application/octet-stream"
      } else {
        const decoded = decodeDataUrl(att.dataUrl)
        buffer = decoded.buffer
        mimeType = decoded.mimeType
      }

      const { id: fileId } = await uploadFileToKeyCrm(buffer, att.filename, mimeType)
      await attachFileToKeyCrmOrder(orderId, fileId)
    } catch (err) {
      console.warn(`[KeyCRM submit] attachment failed for ${att.filename}:`, err)
    }
  }
}
