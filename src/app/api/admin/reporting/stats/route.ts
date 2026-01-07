import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  try {
    // 1. Total Volume (sum of budget_max for requests not draft/rejected)
    const { data: volumeData, error: volumeError } = await supabase
      .from('import_requests')
      .select('budget_max')
      .not('status', 'in', '("DRAFT", "REJECTED")')

    if (volumeError) throw volumeError
    const totalVolume = volumeData.reduce((acc, curr) => acc + (Number(curr.budget_max) || 0), 0)

    // 2. Active Requests (not closed/rejected/draft)
    const { count: activeCount, error: activeError } = await supabase
      .from('import_requests')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("DRAFT", "REJECTED", "CLOSED")')

    if (activeError) throw activeError

    // 3. Status Distribution
    const { data: statusData, error: statusError } = await supabase
      .from('import_requests')
      .select('status')

    if (statusError) throw statusError
    const statusDistribution = statusData.reduce((acc: any, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1
      return acc
    }, {})

    // 4. Financial Ledger Stats (Total Paid)
    const { data: financialData, error: financialError } = await supabase
      .from('financial_ledger')
      .select('amount')
      .eq('status', 'COMPLETED')

    if (financialError) throw financialError
    const totalTransactions = financialData.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)

    // 5. Recent Audit Logs
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select(`
        *,
        actor:profiles(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (auditError) throw auditError

    return NextResponse.json({
      stats: {
        totalVolume,
        activeRequests: activeCount,
        totalTransactions,
        statusDistribution
      },
      auditLogs
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
