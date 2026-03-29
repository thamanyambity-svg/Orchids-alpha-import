"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  Search, 
  Filter, 
  Package, 
  ArrowRight,
  Clock,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

export default function PartnerRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const supabase = createClient()

  useEffect(() => {
    async function fetchRequests() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get partner profile id
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
      } catch (error) {
        console.error('Error fetching requests:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRequests()
  }, [])

  const filteredRequests = requests.filter(req => 
    req.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      <DashboardHeader 
        title="Dossiers assignés" 
        subtitle="Gérez et suivez l'avancement de vos importations"
      />

      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par référence ou produit..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtres
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredRequests.length > 0 ? (
          <div className="grid gap-4">
            {filteredRequests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link 
                  href={`/partner/requests/${request.id}`}
                  className="flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">{request.reference}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[request.status]}`}>
                        {statusLabels[request.status]}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg mb-1 truncate">{request.product_name}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{request.buyer_profiles?.company_name || request.buyer_profiles?.full_name}</span>
                      <span>•</span>
                      <span>{request.quantity}</span>
                      <span>•</span>
                      <span>Budget: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(request.budget)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:flex-col md:items-end gap-2 shrink-0 border-t md:border-t-0 pt-4 md:pt-0">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {format(new Date(request.created_at), "d MMM yyyy", { locale: fr })}
                    </div>
                    <div className="flex items-center gap-2 text-primary font-medium">
                      Gérer
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucun dossier trouvé</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Vous n&apos;avez pas encore de dossiers assignés ou aucun ne correspond à votre recherche.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
