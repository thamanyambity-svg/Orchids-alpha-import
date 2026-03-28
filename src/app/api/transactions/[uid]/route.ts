/**
 * GET /api/transactions/[uid]  → ADMIN — détail complet
 * PUT /api/transactions/[uid]  → ADMIN — mise à jour complète
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/reporting/auth"
import { TransactionSchema } from "@/lib/reporting/types"
import { rowToTransaction, transactionToRow, type AlphaTransactionRow } from "@/lib/reporting/db"

type Params = { params: Promise<{ uid: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const authResult = await requireAdmin()
  if (authResult instanceof NextResponse) return authResult

  const { uid } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("alpha_transactions")
    .select("*")
    .eq("uid", uid)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Transaction introuvable." }, { status: 404 })
  }

  return NextResponse.json(rowToTransaction(data as AlphaTransactionRow))
}

export async function PUT(request: NextRequest, { params }: Params) {
  const authResult = await requireAdmin()
  if (authResult instanceof NextResponse) return authResult

  const { uid } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 })
  }

  const parsed = TransactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 422 })
  }

  const supabase = await createClient()
  const dbRow = transactionToRow(parsed.data)

  const { data, error } = await supabase
    .from("alpha_transactions")
    .update(dbRow)
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
