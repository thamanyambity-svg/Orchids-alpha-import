/**
 * GET /api/client/[clientId]/transactions/[uid]
 * → CLIENT — détail filtré d'une transaction
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireClientAccess } from "@/lib/reporting/auth"
import { toClientView } from "@/lib/reporting/types"
import { rowToTransaction, type AlphaTransactionRow } from "@/lib/reporting/db"

type Params = { params: Promise<{ clientId: string; uid: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { clientId, uid } = await params

  const authResult = await requireClientAccess(clientId)
  if (authResult instanceof NextResponse) return authResult

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("alpha_transactions")
    .select("*")
    .eq("uid", uid)
    .eq("client_user_id", clientId)
    .eq("client_visible", true)          // filtre OBLIGATOIRE
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Transaction introuvable." }, { status: 404 })
  }

  const clientTx = toClientView(rowToTransaction(data as AlphaTransactionRow))
  if (!clientTx) {
    return NextResponse.json({ error: "Transaction introuvable." }, { status: 404 })
  }

  return NextResponse.json(clientTx)
}
