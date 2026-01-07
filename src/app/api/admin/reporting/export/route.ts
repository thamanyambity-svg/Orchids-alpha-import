import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: requests, error } = await supabase
      .from('import_requests')
      .select(`
        reference,
        status,
        budget_max,
        created_at,
        buyer:profiles!buyer_id(full_name, email),
        partner:profiles!assigned_partner_id(full_name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Generate CSV
    const headers = ["Référence", "Date", "Client", "Email Client", "Statut", "Budget Max", "Partenaire"]
    const rows = requests.map(r => [
      r.reference,
      new Date(r.created_at).toLocaleDateString(),
      (r.buyer as any)?.full_name || 'N/A',
      (r.buyer as any)?.email || 'N/A',
      r.status,
      r.budget_max,
      (r.partner as any)?.full_name || 'Non assigné'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=alpha-import-report.csv'
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
