"use client"

import { motion } from "framer-motion"
import { 
  Users, 
  UserCheck, 
  FileText, 
  Wallet,
  TrendingUp,
  AlertTriangle,
  Globe2,
  CheckCircle2,
  Clock,
  Ship,
  ChevronRight,
  Filter,
  Star,
  History,
  Activity,
  Loader2
} from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils"

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalFunds: 0,
    shipments: 0,
    fees: 0,
    partners: 0
  })
  const [partners, setPartners] = useState([])
  const [requests, setRequests] = useState([])
  const [logs, setLogs] = useState([])
  const [alerts, setAlerts] = useState([])

  const supabase = createClient()

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true)
      try {
        // Fetch Stats
        const { data: payments } = await supabase.from('payments').select('amount').eq('status', 'COMPLETED')
        const totalFunds = payments?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0

        const { count: shipments } = await supabase.from('import_requests').select('*', { count: 'exact', head: true })
        const { count: partnersCount } = await supabase.from('partner_profiles').select('*', { count: 'exact', head: true })

        setStats({
          totalFunds,
          shipments: shipments || 0,
          fees: totalFunds * 0.05, // Mock 5% commission for now
          partners: partnersCount || 0
        })

        // Fetch Partners
        const { data: activePartners } = await supabase
          .from('partner_profiles')
          .select(`
            id,
            performance_score,
            deposit_amount,
            contract_status,
            profiles:user_id (full_name),
            countries:country_id (name)
          `)
          .limit(4)
        
        setPartners(activePartners?.map(p => ({
          name: p.profiles?.full_name || "Anonyme",
          country: p.countries?.name || "N/A",
          rating: Math.round(Number(p.performance_score) / 20) || 5,
          progress: Number(p.performance_score) || 80,
          amount: formatCurrency(Number(p.deposit_amount)),
          status: p.contract_status === 'ACTIVE' ? 'Actif' : 'En attente'
        })) || [])

        // Fetch Requests
        const { data: recentRequests } = await supabase
          .from('import_requests')
          .select(`
            reference,
            category,
            status,
            assigned_partner:assigned_partner_id (profiles:user_id (full_name))
          `)
          .order('created_at', { ascending: false })
          .limit(4)

        setRequests(recentRequests?.map(r => ({
          id: r.reference || "N/A",
          name: r.category || "Importation",
          supplier: r.assigned_partner?.profiles?.full_name || "Non assigné",
          status: r.status,
          statusColor: r.status === 'COMPLETED' ? 'text-emerald-400 bg-emerald-400/10' : 'text-blue-400 bg-blue-400/10'
        })) || [])

        // Fetch Logs
        const { data: auditLogs } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4)
        
        setLogs(auditLogs?.map(l => ({
          action: l.action,
          user: l.user_email || "System",
          status: "Terminé",
          time: new Date(l.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
        })) || [])

        // Mock Alerts for UI consistency with image
        setAlerts([
          { country: "Turquie", message: "Turquie Import LT suspecté", time: "12:34", type: "error" },
          { country: "Émirats", message: "Souci logistique via OrientTrade", time: "12:24", type: "warning" },
        ])

      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  const statCards = [
    { label: "Total Funds controlled", value: formatCurrency(stats.totalFunds), icon: Wallet, trend: "", trendType: "neutral" },
    { label: "Shipments this month", value: stats.shipments.toString(), icon: Ship, trend: "7%", trendType: "positive" },
    { label: "Fees commission", value: formatCurrency(stats.fees), icon: TrendingUp, trend: "", trendType: "neutral" },
    { label: "Partners on Board", value: stats.partners.toString(), icon: UserCheck, trend: "19", trendType: "positive" },
  ]

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Tableau de Bord</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="bg-white/5 border-white/10">
            <Filter className="w-4 h-4 mr-2" />
            Régler les...
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/20 transition-all group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-colors">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground truncate">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold">{stat.value}</h3>
                  {stat.trend && (
                    <span className={`text-xs font-medium ${stat.trendType === 'positive' ? 'text-emerald-400' : 'text-primary'}`}>
                      {stat.trendType === 'positive' && '+'}{stat.trend}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-primary/40 w-2/3 rounded-full" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Map Section */}
      <div className="relative aspect-[21/9] rounded-3xl bg-white/[0.02] border border-white/5 overflow-hidden group">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="relative w-full h-full opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700">
            <Globe2 className="w-full h-full text-primary/20 stroke-[0.5]" />
            
            <div className="absolute top-[35%] left-[75%] flex flex-col items-center">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
              <span className="text-[10px] font-bold mt-1">Chine 6</span>
            </div>
            <div className="absolute top-[45%] left-[65%] flex flex-col items-center">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
              <span className="text-[10px] font-bold mt-1">Dubai 3</span>
            </div>
            <div className="absolute top-[38%] left-[60%] flex flex-col items-center">
              <div className="w-2 h-2 bg-primary/60 rounded-full" />
              <span className="text-[10px] font-bold mt-1">Turquie 6</span>
            </div>
            <div className="absolute top-[55%] left-[78%] flex flex-col items-center">
              <div className="w-2 h-2 bg-primary/60 rounded-full" />
              <span className="text-[10px] font-bold mt-1">Thaïlande 2</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              PARTENAIRES ACTIFS
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </h2>
          </div>
          
          <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] border-b border-white/5">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Partenaire</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Pays</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {partners.length > 0 ? partners.map((partner, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="font-medium">{partner.name}</div>
                      <div className="flex items-center gap-0.5 mt-1">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} className={`w-3 h-3 ${j < partner.rating ? 'text-primary fill-primary' : 'text-white/10'}`} />
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary/40" />
                        {partner.country}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5 w-32">
                        <div className="flex items-center justify-between text-[10px]">
                          <span>{partner.amount}</span>
                        </div>
                        <Progress value={partner.progress} className="h-1 bg-white/5" />
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary">
                        {partner.status}
                      </Badge>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground italic">Aucun partenaire actif pour le moment.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              DEMANDES EN COURS
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </h2>
          </div>

          <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
            <div className="p-4 bg-white/[0.03] border-b border-white/5 grid grid-cols-4 text-xs font-medium text-muted-foreground">
              <span>ID</span>
              <span>Demande</span>
              <span>Assigné</span>
              <span className="text-right">Statut</span>
            </div>
            <div className="divide-y divide-white/5">
              {requests.length > 0 ? requests.map((req, i) => (
                <div key={i} className="p-4 grid grid-cols-4 items-center hover:bg-white/[0.02] transition-colors">
                  <span className="text-xs font-mono text-muted-foreground">#{req.id.slice(0, 6)}</span>
                  <span className="font-medium truncate pr-2">{req.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{req.supplier}</span>
                  <div className="flex justify-end">
                    <Badge variant="secondary" className={`text-[10px] border-none shadow-none ${req.statusColor}`}>
                      {req.status}
                    </Badge>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-muted-foreground italic">Aucune demande en cours.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              JOURNAL D'AUDIT
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                {logs.length}
              </Badge>
            </h2>
          </div>

          <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
            <div className="divide-y divide-white/5">
              {logs.length > 0 ? logs.map((log, i) => (
                <div key={i} className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                    <History className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.action}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{log.user}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-[10px] border-white/10">{log.status}</Badge>
                    <p className="text-[10px] text-muted-foreground mt-1">{log.time}</p>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-muted-foreground italic">Aucun log récent.</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              ALERTES CRITIQUES
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">2</Badge>
            </h2>
          </div>

          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4 group hover:border-destructive/30 transition-all">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                  alert.type === 'error' ? 'bg-destructive/10 border-destructive/20' : 'bg-warning/10 border-warning/20'
                }`}>
                  <AlertTriangle className={`w-6 h-6 ${alert.type === 'error' ? 'text-destructive' : 'text-warning'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm">{alert.country}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">{alert.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">{alert.time}</span>
                    <Button variant="link" size="sm" className="h-auto p-0 text-[10px] text-primary">Détails</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
