"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  Package,
  TrendingUp,
  Star,
  ArrowRight,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard/header"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

const statusColors: Record<string, string> = {
  PENDING: "bg-secondary text-secondary-foreground",
  VALIDATED: "bg-primary/10 text-primary",
  EXECUTING: "bg-blue-500/10 text-blue-500",
  SHIPPED: "bg-purple-500/10 text-purple-500",
  DELIVERED: "bg-green-500/10 text-green-500",
    CLOSED: "bg-green-600/10 text-green-600",
    CANCELLED: "bg-destructive/10 text-destructive",
  }
  
  const statusLabels: Record<string, string> = {
    PENDING: "En attente",
    VALIDATED: "À traiter",
    EXECUTING: "En cours",
    SHIPPED: "Expédié",
    DELIVERED: "Livré",
    CLOSED: "Terminé",
    CANCELLED: "Annulé",
  }

export default function PartnerDashboardPage() {
  const [requests, setRequests] = useState<{
    id: string
    reference: string
    status: string
    product_name: string
    quantity: string
    budget: number
    created_at: string
    buyer_profiles?: { full_name: string; company_name: string }
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    assigned: 0,
    inProgress: 0,
    completed: 0,
    performance: "98%"
  })
  const supabase = createClient()

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: partner } = await supabase
          .from('partner_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (!partner) return

        const { data, error } = await supabase
          .from('import_requests')
          .select(`
            *,
            buyer_profiles (
              full_name,
              company_name
            )
          `)
          .eq('assigned_partner_id', partner.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        
        setRequests(data || [])
        
        // Calculate stats
        const assigned = data?.length || 0
        const inProgress = data?.filter(r => ['VALIDATED', 'EXECUTING', 'SHIPPED'].includes(r.status)).length || 0
        const completed = data?.filter(r => r.status === 'CLOSED').length || 0
        
        setStats({
          assigned,
          inProgress,
          completed,
          performance: "98%" // Keep static for now or calculate from feedback table if exists
        })

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const statItems = [
    { label: "Dossiers assignés", value: stats.assigned.toString(), icon: FileText, trend: "+0 cette semaine" },
    { label: "En cours", value: stats.inProgress.toString(), icon: Clock, color: "text-warning" },
    { label: "Complétés", value: stats.completed.toString(), icon: CheckCircle2, color: "text-success" },
    { label: "Performance", value: stats.performance, icon: Star, color: "text-primary" },
  ]

  return (
    <div>
      <DashboardHeader 
        title="Espace Partenaire" 
        subtitle="Gérez vos dossiers assignés"
      />

      <div className="p-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statItems.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-5 rounded-xl bg-card border border-border"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color || "text-primary"}`} />
                </div>
                {stat.trend && (
                  <div className="flex items-center gap-1 text-xs text-success">
                    <TrendingUp className="w-3 h-3" />
                    {stat.trend}
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="rounded-xl bg-card border border-border">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold">Dossiers récents</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/partner/requests" className="flex items-center gap-1">
                    Voir tout
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
              <div className="divide-y divide-border">
                {loading ? (
                  <div className="p-10 text-center text-muted-foreground">Chargement...</div>
                ) : requests.length > 0 ? (
                  requests.slice(0, 5).map((request) => (
                    <Link 
                      key={request.id} 
                      href={`/partner/requests/${request.id}`}
                      className="flex items-center gap-4 p-5 hover:bg-accent/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-muted-foreground">{request.reference}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${statusColors[request.status]}`}>
                            {statusLabels[request.status]}
                          </span>
                        </div>
                        <p className="font-medium truncate">{request.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.buyer_profiles?.company_name || request.buyer_profiles?.full_name} • {request.quantity}
                        </p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="font-semibold">
                          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(request.budget)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), "d MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  ))
                ) : (
                  <div className="p-10 text-center">
                    <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Aucun dossier assigné pour le moment.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl bg-card border border-border p-5">
              <h3 className="font-semibold mb-4">Performance</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span>Taux de réussite</span>
                    <span className="font-semibold">98%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-success rounded-full" style={{ width: "98%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span>Respect des délais</span>
                    <span className="font-semibold">95%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "95%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span>Satisfaction acheteurs</span>
                    <span className="font-semibold">4.8/5</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-chart-2 rounded-full" style={{ width: "96%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 p-5">
              <h3 className="font-semibold mb-2">Fournisseurs actifs</h3>
              <p className="text-3xl font-bold text-primary mb-4">12</p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/partner/suppliers">
                  Gérer les fournisseurs
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
