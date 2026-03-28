/**
 * GET /api/client/[clientId]/export/xlsx
 * → CLIENT — export Excel (vue filtrée, 2 onglets)
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireClientAccess } from "@/lib/reporting/auth"
import { toClientView } from "@/lib/reporting/types"
import { rowToTransaction, type AlphaTransactionRow } from "@/lib/reporting/db"
import { buildClientWorkbook } from "@/lib/reporting/excel"

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
    .eq("client_visible", true)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const clientTransactions = (data as AlphaTransactionRow[])
    .map(rowToTransaction)
    .map(toClientView)
    .filter(Boolean) as NonNullable<ReturnType<typeof toClientView>>[]

  const buffer = await buildClientWorkbook(clientTransactions)

  const exportDate = new Date().toISOString().slice(0, 10)
  const fileName   = `alpha-import-client-${exportDate}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  })
}
