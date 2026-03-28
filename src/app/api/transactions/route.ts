/**
 * GET  /api/transactions  → ADMIN — liste toutes les transactions
 * POST /api/transactions  → ADMIN — créer une transaction
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/reporting/auth"
import { TransactionSchema } from "@/lib/reporting/types"
import { rowToTransaction, transactionToRow, type AlphaTransactionRow } from "@/lib/reporting/db"

export async function GET() {
  const authResult = await requireAdmin()
  if (authResult instanceof NextResponse) return authResult

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("alpha_transactions")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const transactions = (data as AlphaTransactionRow[]).map(rowToTransaction)
  return NextResponse.json(transactions)
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (authResult instanceof NextResponse) return authResult

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
    .insert(dbRow)
    .select("*")
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "UID déjà utilisé." }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(rowToTransaction(data as AlphaTransactionRow), { status: 201 })
}
