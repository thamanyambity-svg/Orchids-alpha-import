/**
 * GET /api/admin/export/csv
 * → ADMIN — export CSV complet (toutes colonnes, séparateur virgule, UTF-8 BOM)
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/reporting/auth"
import { rowToTransaction, type AlphaTransactionRow } from "@/lib/reporting/db"
import { ADMIN_COLUMNS } from "@/lib/reporting/types"

// Escape a value for RFC 4180 CSV
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""'
  const str = String(value)
  return `"${str.replace(/"/g, '""')}"`
}

const COLUMN_LABELS: Record<string, string> = {
  uid:              "UID",
  clientReference:  "Client",
  isoTimestamp:     "Horodatage (UTC)",
  pol:              "POL",
  pod:              "POD",
  incoterm:         "Incoterm",
  valueFOB:         "Valeur FOB (USD)",
  alphaCommission:  "Commission Alpha (USD)",
  totalValue:       "Total (USD)",
  deposit60:        "Acompte 60%",
  balance40:        "Solde 40%",
  currency:         "Devise",
  depositStatus:    "Statut Acompte",
  balanceStatus:    "Statut Solde",
  currentStep:      "Étape Workflow",
  responsibleAgent: "Agent",
  trackingNumber:   "Tracking",
  priority:         "Priorité",
  incidentLog:      "Journal Incidents",
  clientVisible:    "Visible Client",
}

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

  const header = ADMIN_COLUMNS.map((k) => csvCell(COLUMN_LABELS[k] ?? k)).join(";")
  const rows   = transactions.map((tx) =>
    ADMIN_COLUMNS.map((k) => csvCell(tx[k as keyof typeof tx])).join(";"),
  )

  // UTF-8 BOM for proper Excel display of accented characters
  // sep= hint tells Excel (FR locale) which separator to use
  const csv = "\uFEFF" + "sep=;\r\n" + [header, ...rows].join("\r\n")

  const exportDate = new Date().toISOString().slice(0, 10)
  const fileName   = `alpha-import-admin-${exportDate}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  })
}
