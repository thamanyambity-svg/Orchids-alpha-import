import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Escape a cell value for safe CSV inclusion (semicolon-separated, Excel-compatible)
function csvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  // Escape double-quotes and wrap every cell in double-quotes
  return `"${str.replace(/"/g, '""')}"`
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
        currency,
        origin_country,
        description,
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
      const buyer = r.buyer as any
      const partner = r.partner as any
      const currency = (r as any).currency || 'USD'
      const budgetMax = r.budget_max != null ? Number(r.budget_max).toLocaleString('fr-FR') : 'N/A'
      const budgetMin = (r as any).budget_min != null ? Number((r as any).budget_min).toLocaleString('fr-FR') : 'N/A'

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
        (r as any).origin_country || 'N/A',
        (r as any).description || '',
        partner?.full_name || 'Non assigné',
        partner?.email || 'N/A',
      ]
    })

    // Total volume encaissé (budget_max des dossiers non rejetés / non brouillons)
    const totalVolume = (requests ?? [])
      .filter(r => !['DRAFT', 'REJECTED'].includes(r.status))
      .reduce((sum, r) => sum + (Number(r.budget_max) || 0), 0)

    // --- Assemble CSV lines ---
    // sep= hint tells Excel which separator to use when double-clicking the file
    const SEP = ';'
    const lines: string[] = []

    // Excel separator hint (must be the very first line, no BOM before it)
    lines.push(`sep=${SEP}`)

    // Company header block
    lines.push(`${csvCell('ALPHA IMPORT EXCHANGE RDC')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}`)
    lines.push(`${csvCell('A.Onoseke House Investment DRC')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}`)
    lines.push(`${csvCell(`Exporté le : ${exportDate}`)}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell('')}${SEP}${csvCell(`Total dossiers : ${(requests ?? []).length}`)}${SEP}${csvCell(`Volume projeté : ${totalVolume.toLocaleString('fr-FR')} USD`)}`)
    lines.push('') // blank separator row

    // Column headers
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
      "Pays d'origine",
      'Description',
      'Partenaire assigné',
      'Email partenaire',
    ]
    lines.push(headers.map(csvCell).join(SEP))

    // Data rows
    for (const row of dataRows) {
      lines.push(row.map(csvCell).join(SEP))
    }

    lines.push('') // blank row before totals
    lines.push([
      csvCell('TOTAL VOLUME PROJETÉ (hors brouillons & rejetés)'),
      ...Array(11).fill(csvCell('')),
      csvCell(''),
      csvCell(`${totalVolume.toLocaleString('fr-FR')} USD`),
    ].join(SEP))

    // BOM (\uFEFF) must come first for Excel to detect UTF-8 correctly
    const csvContent = '\uFEFF' + lines.join('\r\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${exportFileName}"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
