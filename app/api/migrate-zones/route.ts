import { NextResponse } from "next/server"

export async function GET() {
  try {
    const connStr = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
    if (!connStr) {
      return NextResponse.json({ ok: false, error: "No POSTGRES_URL available" }, { status: 500 })
    }

    const { Client } = await import("pg")
    const client = new Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
    })
    await client.connect()
    await client.query(
      "ALTER TABLE image_zones ADD COLUMN IF NOT EXISTS is_max BOOLEAN DEFAULT FALSE"
    )
    await client.end()

    return NextResponse.json({ ok: true, message: "Migration applied: is_max column added" })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("already exists")) {
      return NextResponse.json({ ok: true, message: "Column already exists" })
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
