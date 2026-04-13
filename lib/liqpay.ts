import crypto from "crypto"
import { getSetting } from "@/lib/settings"

interface LiqPayParams {
  orderId: string
  orderNumber: string
  amount: number
  description: string
  resultUrl: string
  serverUrl: string
}

export async function generateLiqPayData(params: LiqPayParams): Promise<{ data: string; signature: string }> {
  const publicKey = await getSetting("LIQPAY_PUBLIC_KEY")
  const privateKey = await getSetting("LIQPAY_PRIVATE_KEY")

  if (!publicKey || !privateKey) throw new Error("LiqPay keys not configured")

  const payload = {
    public_key: publicKey,
    version: 3,
    action: "pay",
    amount: params.amount,
    currency: "UAH",
    description: params.description,
    order_id: params.orderId,
    sandbox: 1,
    result_url: params.resultUrl,
    server_url: params.serverUrl,
  }

  const data = Buffer.from(JSON.stringify(payload)).toString("base64")
  const signature = crypto
    .createHash("sha1")
    .update(privateKey + data + privateKey)
    .digest("base64")

  return { data, signature }
}

export async function verifyLiqPayCallback(
  data: string,
  signature: string
): Promise<Record<string, unknown> | null> {
  const privateKey = await getSetting("LIQPAY_PRIVATE_KEY")

  if (!privateKey) return null

  const expectedSignature = crypto
    .createHash("sha1")
    .update(privateKey + data + privateKey)
    .digest("base64")

  if (signature !== expectedSignature) return null

  try {
    return JSON.parse(Buffer.from(data, "base64").toString("utf-8"))
  } catch {
    return null
  }
}
