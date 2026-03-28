/**
 * GET /api/admin/export/xlsx
 * → ADMIN — export Excel global (3 onglets : Admin, Client, Légende)
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/reporting/auth"
import { rowToTransaction, type AlphaTransactionRow } from "@/lib/reporting/db"
import { buildAdminWorkbook } from "@/lib/reporting/excel"

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
  const buffer       = await buildAdminWorkbook(transactions)

  const exportDate = new Date().toISOString().slice(0, 10)
  const fileName   = `alpha-import-admin-${exportDate}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  })
}
