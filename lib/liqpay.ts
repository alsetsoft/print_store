import crypto from "crypto"

const PUBLIC_KEY = process.env.LIQPAY_PUBLIC_KEY!
const PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY!

interface LiqPayParams {
  orderId: string
  orderNumber: string
  amount: number
  description: string
  resultUrl: string
  serverUrl: string
}

export function generateLiqPayData(params: LiqPayParams): { data: string; signature: string } {
  const payload = {
    public_key: PUBLIC_KEY,
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
    .update(PRIVATE_KEY + data + PRIVATE_KEY)
    .digest("base64")

  return { data, signature }
}

export function verifyLiqPayCallback(
  data: string,
  signature: string
): Record<string, unknown> | null {
  const expectedSignature = crypto
    .createHash("sha1")
    .update(PRIVATE_KEY + data + PRIVATE_KEY)
    .digest("base64")

  if (signature !== expectedSignature) return null

  try {
    return JSON.parse(Buffer.from(data, "base64").toString("utf-8"))
  } catch {
    return null
  }
}
