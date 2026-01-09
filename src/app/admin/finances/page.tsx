"use client"

import { useEffect, useState } from "react"
import { 
  Wallet, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  Clock,
  CheckCircle2,
  Lock,
  Unlock,
  Info,
  MoreVertical
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { DashboardHeader } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { Order, Payment, Profile } from "@/lib/types"

export default function AdminFinancesPage() {
  const [orders, setOrders] = useState<(Order & { buyer: Profile })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = createClient()

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          request:import_requests(buyer:profiles(*))
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      
      const formattedData = data.map((item: any) => ({
        ...item,
        buyer: item.request?.buyer
      }))
      
      setOrders(formattedData)
    } catch (error: any) {
      toast.error("Erreur lors du chargement des finances: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleActivateEscrow(orderId: string) {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          escrow_activated: true,
          status: "FUNDED",
          deposit_paid: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId)

      if (error) throw error
      
      toast.success("Compte séquestre activé (Acompte 60% confirmé)")
      fetchOrders()
    } catch (error: any) {
      toast.error("Erreur: " + error.message)
    }
  }

  async function handleConfirmBalance(orderId: string) {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          balance_paid: true,
          status: "SHIPPED",
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId)

      if (error) throw error
      
      toast.success("Solde 40% confirmé. Commande passée en statut Expédiée.")
      fetchOrders()
    } catch (error: any) {
      toast.error("Erreur: " + error.message)
    }
  }

  const filteredOrders = orders.filter(order => 
    order.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.buyer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader 
        title="Flux Financiers" 
        subtitle="Gestion du compte séquestre et des paiements Alpha"
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Volume Séquestre</p>
                <p className="text-2xl font-bold">$45,200</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Fonds bloqués en attente de validation
            </div>
          </div>
          
          <div className="p-6 rounded-2xl bg-success/5 border border-success/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-success">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commissions Alpha</p>
                <p className="text-2xl font-bold">$4,520</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 text-success" />
              +15% ce mois
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paiements en attente</p>
                <p className="text-2xl font-bold">8</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="w-3 h-3" />
              Nécessite une vérification manuelle
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher une transaction..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-card border border-border focus:ring-2 focus:ring-primary/20 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Commande</th>
                <th className="px-6 py-4">Acheteur</th>
                <th className="px-6 py-4">Montant Total</th>
                <th className="px-6 py-4">Acompte (60%)</th>
                <th className="px-6 py-4">Solde (40%)</th>
                <th className="px-6 py-4">Statut Escrow</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center">Chargement...</td></tr>
              ) : filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-semibold">{order.reference}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {order.buyer?.full_name || "N/A"}
                  </td>
                  <td className="px-6 py-4 font-semibold">
                    ${order.total_amount?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">${order.deposit_amount?.toLocaleString()}</span>
                      {order.deposit_paid ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Attente</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">${order.balance_amount?.toLocaleString()}</span>
                      {order.balance_paid ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Attente</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {order.escrow_activated ? (
                      <Badge className="bg-success/10 text-success border-success/20">
                        <Lock className="w-3 h-3 mr-1" /> Séquestre Activé
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        <Unlock className="w-3 h-3 mr-1" /> Inactif
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!order.escrow_activated && (
                      <Button size="sm" onClick={() => handleActivateEscrow(order.id)}>
                        Confirmer Acompte
                      </Button>
                    )}
                    {order.escrow_activated && !order.balance_paid && (
                      <Button size="sm" variant="outline" onClick={() => handleConfirmBalance(order.id)}>
                        Confirmer Solde
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
