import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  try {
    // 1. Stats
    // Total Volume (sum of budget_max for requests not draft/rejected)
    const { data: volumeData } = await supabase
      .from('import_requests')
      .select('budget_max')
      .not('status', 'in', '(DRAFT,REJECTED)')

    const totalFunds = volumeData?.reduce((acc, curr) => acc + (Number(curr.budget_max) || 0), 0) || 0

    // Active Requests (not closed/rejected/draft)
    const { count: activeRequests } = await supabase
      .from('import_requests')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '(DRAFT,REJECTED,CLOSED)')

    // Shipping in progress (sum of budget_max for SHIPPED requests)
    const { data: shippingData } = await supabase
      .from('import_requests')
      .select('budget_max')
      .eq('status', 'SHIPPED')

    const totalShipping = shippingData?.reduce((acc, curr) => acc + (Number(curr.budget_max) || 0), 0) || 0

    // Partners count
    const { count: partnersCount } = await supabase
      .from('partner_profiles')
      .select('*', { count: 'exact', head: true })

    // 2. Partners List
    const { data: partners } = await supabase
      .from('partner_profiles')
      .select(`
        *,
        profile:profiles(full_name, avatar_url),
        country:countries(name)
      `)
      .order('performance_score', { ascending: false })
      .limit(4)

    // 3. Recent Requests
    const { data: recentRequests } = await supabase
      .from('import_requests')
      .select(`
        *,
        country:countries(name),
        partner:profiles!assigned_partner_id(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(4)

    // 4. Audit Logs
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select(`
        *,
        actor:profiles(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(3)

    // 5. Critical Alerts
    const { data: criticalAlerts } = await supabase
      .from('incidents')
      .select(`
        *,
        order:orders(reference)
      `)
      .eq('status', 'OPEN')
      .order('created_at', { ascending: false })
      .limit(2)

    return NextResponse.json({
      stats: [
        { label: "Total Funds contrôlés", value: `${totalFunds.toLocaleString()}$`, icon: "Wallet", trend: null, color: "text-[#ffd700]" },
        { label: "Demandes en cours", value: activeRequests?.toString() || "0", icon: "FileText", trend: null, color: "text-blue-400" },
        { label: "Fret maritime en cours", value: `${totalShipping.toLocaleString()}$`, icon: "Ship", trend: null, color: "text-orange-400" },
        { label: "Partenaires à bord", value: partnersCount?.toString() || "0", icon: "UserCheck", trend: null, color: "text-emerald-400" },
      ],
      partners: partners?.map(p => ({
        name: p.profile?.full_name || "Anonyme",
        country: p.country?.name || "N/A",
        rating: 5, // We don't have a rating system yet, use 5 as default
        performance: Number(p.performance_score) || 0,
        volume: `${(Number(p.deposit_amount) || 0).toLocaleString()}$`, // Using deposit as a proxy for volume for now
        status: p.contract_status === 'ACTIVE' ? 'Actif' : 'Inactif'
      })) || [],
      recentRequests: recentRequests?.map(r => ({
        id: r.reference || r.id.slice(0, 6),
        realId: r.id,
        product: r.product_name || r.category,
        partner: (r.partner as any)?.full_name || "Non assigné",
        status: r.status,
        statusColor: getStatusColor(r.status)
      })) || [],
      auditLogs: auditLogs?.map(log => ({
        action: log.action,
        target: log.target_type,
        user: log.actor?.full_name || "Système",
        status: "Validé",
        time: formatTimeAgo(new Date(log.created_at))
      })) || [],
      criticalAlerts: criticalAlerts?.map(alert => ({
        title: alert.type,
        location: alert.order?.reference || "N/A",
        time: formatTimeAgo(new Date(alert.created_at))
      })) || []
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'ANALYSIS': return "text-blue-400 bg-blue-400/10"
    case 'PENDING': return "text-emerald-400 bg-emerald-400/10"
    case 'VALIDATED': return "text-purple-400 bg-purple-400/10"
    case 'SHIPPED': return "text-orange-400 bg-orange-400/10"
    default: return "text-white/40 bg-white/5"
  }
}

function formatTimeAgo(date: Date) {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  if (diffInHours < 1) return "À l'instant"
  return `${diffInHours}h ago`
}
