import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { initiateRetryForFailedSEPA } from "@/lib/payments/sepa-admin.utils"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { transactionId } = await req.json()
    if (!transactionId) {
      return NextResponse.json({ error: "transactionId requis" }, { status: 400 })
    }

    const result = await initiateRetryForFailedSEPA(transactionId, user.id)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("SEPA retry error:", error)
    return NextResponse.json({ error: error.message || "Erreur interne" }, { status: 500 })
  }
}
