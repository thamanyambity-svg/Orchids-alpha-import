/**
 * PATCH /api/transactions/[uid]/payment  → ADMIN — mise à jour statut paiement
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/reporting/auth"
import { rowToTransaction, type AlphaTransactionRow } from "@/lib/reporting/db"

const PaymentSchema = z.object({
  depositStatus: z.enum(["Payé", "En attente", "Partiellement payé", "Annulé"]).optional(),
  balanceStatus: z.enum(["Payé", "En attente", "Partiellement payé", "Annulé"]).optional(),
}).refine(
  (v) => v.depositStatus !== undefined || v.balanceStatus !== undefined,
  { message: "Au moins un des champs depositStatus ou balanceStatus est requis." },
)

type Params = { params: Promise<{ uid: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const authResult = await requireAdmin()
  if (authResult instanceof NextResponse) return authResult

  const { uid } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 })
  }

  const parsed = PaymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 422 })
  }

  const updatePayload: Record<string, string> = {}
  if (parsed.data.depositStatus) updatePayload.deposit_status = parsed.data.depositStatus
  if (parsed.data.balanceStatus)  updatePayload.balance_status = parsed.data.balanceStatus

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("alpha_transactions")
    .update(updatePayload)
    .eq("uid", uid)
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: "Transaction introuvable." }, { status: 404 })
  }

  return NextResponse.json(rowToTransaction(data as AlphaTransactionRow))
}
