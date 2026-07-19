import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { processAutomaticDebit } from "@/lib/payments/auto-debit.service"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

    const { orderId, paymentType } = await req.json()
    if (!orderId || !paymentType) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
    }

    const pct = paymentType === "DEPOSIT_60" ? 0.6 as const : 0.4 as const

    const result = await processAutomaticDebit(orderId, pct)

    return NextResponse.json({
      success: result.status === "succeeded",
      paymentIntentId: result.paymentIntentId,
      status: result.status,
      amount: result.amount,
    })
  } catch (error: any) {
    console.error("process-sepa-debit error:", error)
    return NextResponse.json({ error: error.message || "Erreur interne" }, { status: 500 })
  }
}
