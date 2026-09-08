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
    // La colonne subscribed_at n'existe pas : la table porte created_at,
    // confirmed_at et unsubscribed_at. L'écrire faisait échouer chaque
    // inscription en 500, sur toute base construite depuis le dépôt.
    // created_at vaut NOW() par défaut et suffit à dater l'inscription ;
    // confirmed_at reste vide, il appartient au double opt-in.
    const { error } = await supabase.from("newsletter_subscribers").upsert(
      { email, source: source || "web" },
      { onConflict: "email" }
    )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Newsletter subscribe error:", error)
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
  }
}
