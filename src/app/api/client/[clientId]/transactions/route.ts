/**
 * GET /api/client/[clientId]/transactions
 * → CLIENT — ses transactions filtrées (clientVisible = true, client_user_id = clientId)
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireClientAccess } from "@/lib/reporting/auth"
import { toClientView } from "@/lib/reporting/types"
import { rowToTransaction, type AlphaTransactionRow } from "@/lib/reporting/db"

type Params = { params: Promise<{ clientId: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { clientId } = await params

  const authResult = await requireClientAccess(clientId)
  if (authResult instanceof NextResponse) return authResult

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("alpha_transactions")
    .select("*")
    .eq("client_user_id", clientId)
    .eq("client_visible", true)          // filtre OBLIGATOIRE
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const clientTransactions = (data as AlphaTransactionRow[])
    .map(rowToTransaction)
    .map(toClientView)
    .filter(Boolean)

  return NextResponse.json(clientTransactions)
}
