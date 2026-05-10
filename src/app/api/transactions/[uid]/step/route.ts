/**
 * PATCH /api/transactions/[uid]/step  → ADMIN — mise à jour étape workflow
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/reporting/auth"
import { rowToTransaction, type AlphaTransactionRow } from "@/lib/reporting/db"

const StepSchema = z.object({
  currentStep: z.enum([
    "Assignation",
    "Validation",
    "Exécution",
    "En transit",
    "Dédouanement",
    "Livraison",
    "Clôturé",
  ]),
})

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

  const parsed = StepSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 422 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("alpha_transactions")
    .update({ current_step: parsed.data.currentStep })
    .eq("uid", uid)
    .select("*")
    .single()

  if (error) {
    // PGRST116 = no rows found by .single() — return 404 instead of 500
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Transaction introuvable." }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(rowToTransaction(data as AlphaTransactionRow))
}
