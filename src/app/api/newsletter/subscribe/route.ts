import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { checkRateLimit } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown"
    const rateCheck = checkRateLimit(`newsletter:${ip}`, { maxRequests: 5, windowMs: 3600000 })
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Trop de tentatives" }, { status: 429 })
    }

    const { email, source } = await req.json()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from("newsletter_subscribers").upsert(
      { email, source: source || "web", subscribed_at: new Date().toISOString() },
      { onConflict: "email" }
    )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Newsletter subscribe error:", error)
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
  }
}
