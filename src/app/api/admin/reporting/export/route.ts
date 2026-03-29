import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Escape a cell value for safe CSV inclusion (semicolon-separated, Excel-compatible)
function csvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  // Escape double-quotes and wrap every cell in double-quotes
  return `"${str.replace(/"/g, '""')}"`
}

// Build a CSV row padded to `colCount` columns, with specific values at given indices.
// All other cells are empty.
function paddedRow(colCount: number, SEP: string, values: Record<number, unknown>): string {
  return Array.from({ length: colCount }, (_, i) => csvCell(values[i] ?? '')).join(SEP)
}

// Human-readable label for workflow statuses
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING: 'En attente',
  ANALYSIS: 'En analyse',
  NEGOTIATION: 'Négociation',
  VALIDATED: 'Validé',
  IN_PROGRESS: 'En cours',
  AWAITING_DEPOSIT: 'Attente acompte',
  FUNDED: 'Financé',
  SHIPPED: 'Expédié',
  DELIVERED: 'Livré',
  CLOSED: 'Clôturé',
  REJECTED: 'Rejeté',
}

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: requests, error } = await supabase
      .from('import_requests')
      .select(`
        reference,
        status,
        budget_max,
        budget_min,
        buyer_country,
        product_name,
        created_at,
        updated_at,
        buyer:profiles!buyer_id(full_name, email, phone),
        partner:profiles!assigned_partner_id(full_name, email)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    const exportDate = new Date().toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
    const exportFileName = `alpha-import-rapport-${new Date().toISOString().slice(0, 10)}.csv`

    // --- Build rows ---
    const dataRows = (requests ?? []).map(r => {
      const buyer = r.buyer as unknown as { full_name: string; email: string; phone: string } | null
      const partner = r.partner as unknown as { full_name: string; email: string } | null
      const currency = 'USD'
      const budgetMax = r.budget_max != null ? Number(r.budget_max).toLocaleString('fr-FR') : 'N/A'
      const budgetMin = r.budget_min != null ? Number(r.budget_min).toLocaleString('fr-FR') : 'N/A'

      return [
        r.reference,
        new Date(r.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        new Date(r.updated_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        buyer?.full_name || 'N/A',
        buyer?.email || 'N/A',
        buyer?.phone || 'N/A',
        STATUS_LABELS[r.status] || r.status,
        `${budgetMin} ${currency}`,
        `${budgetMax} ${currency}`,
        r.buyer_country || 'N/A',
        r.product_name || '',
        partner?.full_name || 'Non assigné',
        partner?.email || 'N/A',
      ]
    })

    // Total volume encaissé (budget_max des dossiers non rejetés / non brouillons)
    const totalVolume = (requests ?? [])
      .filter(r => !['DRAFT', 'REJECTED'].includes(r.status))
      .reduce((sum, r) => sum + (Number(r.budget_max) || 0), 0)

    // Column headers (defined early so header block and total row can reference headers.length)
    const headers = [
      'Référence',
      'Date de création',
      'Dernière mise à jour',
      'Client',
      'Email client',
      'Téléphone client',
      'Statut',
      'Budget min',
      'Budget max',
      "Pays de l'acheteur",
      'Produit',
      'Partenaire assigné',
      'Email partenaire',
    ]
    const COL = headers.length // 13 — single source of truth

    // --- Assemble CSV lines ---
    // sep= hint tells Excel which separator to use when double-clicking the file
    const SEP = ';'
    const lines: string[] = []

    // Excel separator hint (must be the very first line, no BOM before it)
    lines.push(`sep=${SEP}`)

    // Company header block — use paddedRow so column count stays in sync with headers
    lines.push(paddedRow(COL, SEP, { 0: 'ALPHA IMPORT EXCHANGE RDC' }))
    lines.push(paddedRow(COL, SEP, { 0: 'A.Onoseke House Investment DRC' }))
    lines.push(paddedRow(COL, SEP, {
      0: `Exporté le : ${exportDate}`,
      [COL - 2]: `Total dossiers : ${(requests ?? []).length}`,
      [COL - 1]: `Volume projeté : ${totalVolume.toLocaleString('fr-FR')} USD`,
    }))
    lines.push('') // blank separator row

    lines.push(headers.map(csvCell).join(SEP))

    // Data rows
    for (const row of dataRows) {
      lines.push(row.map(csvCell).join(SEP))
    }

    lines.push('') // blank row before totals
    lines.push(paddedRow(COL, SEP, {
      0: 'TOTAL VOLUME PROJETÉ (hors brouillons & rejetés)',
      [COL - 1]: `${totalVolume.toLocaleString('fr-FR')} USD`,
    }))

    // BOM (\uFEFF) must come first for Excel to detect UTF-8 correctly
    const csvContent = '\uFEFF' + lines.join('\r\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${exportFileName}"`,
      },
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
