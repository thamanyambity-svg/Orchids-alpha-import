"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText,
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  XCircle,
  UserPlus,
  Clock,
  ArrowRight,
  Shield,
  AlertTriangle,
  Info,
  Wallet
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { DashboardHeader } from "@/components/dashboard/header"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import type { ImportRequest, RequestStatus, PartnerProfile, Profile } from "@/lib/types"

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<(ImportRequest & { buyer: Profile, partner?: Profile })[]>([])
  const [partners, setPartners] = useState<(PartnerProfile & { user: Profile })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "ALL">("ALL")
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch requests with buyer info
      const { data: reqData, error: reqError } = await supabase
        .from("import_requests")
        .select(`
          *,
          buyer:profiles!import_requests_buyer_id_fkey(*)
        `)
        .order("created_at", { ascending: false })

      if (reqError) throw reqError

      // Fetch partners info
      const { data: partData, error: partError } = await supabase
        .from("partner_profiles")
        .select(`
          *,
          user:profiles(*)
        `)

      if (partError) throw partError

      setRequests(reqData as any)
      setPartners(partData as any)
    } catch (error: any) {
      toast.error("Erreur lors du chargement des données: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdminAction(action: string, requestId: string, data?: any) {
    try {
      const response = await fetch('/api/admin/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, requestId, data })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Action failed')

      toast.success("Opération réussie")
      fetchData()
    } catch (error: any) {
      toast.error("Erreur: " + error.message)
    }
  }

  async function handleAssignPartner(requestId: string, partnerId: string) {
    await handleAdminAction('ASSIGN_PARTNER', requestId, { partnerId })
  }

  async function handleValidateRequest(requestId: string) {
    await handleAdminAction('VALIDATE', requestId)
  }

  async function handleRejectRequest(requestId: string) {
    await handleAdminAction('REJECT', requestId)
  }

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.buyer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "ALL" || req.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case "DRAFT": return <Badge variant="outline">Brouillon</Badge>
      case "ANALYSIS": return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Analyse</Badge>
      case "VALIDATED": return <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">Validée</Badge>
      case "REJECTED": return <Badge variant="destructive">Refusée</Badge>
      case "AWAITING_DEPOSIT": return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Attente Acompte</Badge>
      case "EXECUTING": return <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Exécution</Badge>
      case "SHIPPED": return <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20">Expédiée</Badge>
      case "DELIVERED": return <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">Livrée</Badge>
      case "CLOSED": return <Badge variant="outline">Clôturée</Badge>
      case "INCIDENT": return <Badge variant="destructive">Incident</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Gestion des Demandes"
        subtitle="Suivez et validez les flux d'importation"
      />

      <div className="p-6 space-y-6">
        {/* Workflow Visualization (Simplified) */}
        <div className="grid grid-cols-7 gap-2 mb-8 bg-card border border-border p-4 rounded-xl">
          {[
            { label: "Création", icon: FileText, active: true },
            { label: "Assignation", icon: UserPlus, active: true },
            { label: "Validation", icon: Shield, active: true },
            { label: "Acompte 60%", icon: Wallet, active: false },
            { label: "Exécution", icon: Clock, active: false },
            { label: "Solde 40%", icon: Wallet, active: false },
            { label: "Clôture", icon: CheckCircle2, active: false },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <step.icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{step.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher une demande..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-card border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <Button variant="outline" size="sm" onClick={() => setStatusFilter("ALL")} className={statusFilter === "ALL" ? "bg-primary/10 text-primary border-primary/20" : ""}>
              Tous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setStatusFilter("ANALYSIS")} className={statusFilter === "ANALYSIS" ? "bg-primary/10 text-primary border-primary/20" : ""}>
              En Analyse
            </Button>
            <Button variant="outline" size="sm" onClick={() => setStatusFilter("VALIDATED")} className={statusFilter === "VALIDATED" ? "bg-primary/10 text-primary border-primary/20" : ""}>
              Validées
            </Button>
            <Button variant="outline" size="sm" onClick={() => setStatusFilter("INCIDENT")} className={statusFilter === "INCIDENT" ? "bg-primary/10 text-primary border-primary/20" : ""}>
              Incidents
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Référence / Date</th>
                <th className="px-6 py-4">Acheteur</th>
                <th className="px-6 py-4">Catégorie / Pays</th>
                <th className="px-6 py-4">Partenaire</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8">
                      <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <Info className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    Aucune demande trouvée
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm font-semibold">{req.reference}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{req.buyer?.full_name || "N/A"}</div>
                      <div className="text-xs text-muted-foreground">{req.buyer?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{req.category}</div>
                      <div className="text-xs text-muted-foreground">Source: {req.country_id ? "Chine" : "N/A"}</div>
                    </td>
                    <td className="px-6 py-4">
                      {req.assigned_partner_id ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserPlus className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-xs font-medium">
                            {partners.find(p => p.id === req.assigned_partner_id)?.user?.full_name || "Partenaire"}
                          </span>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 text-xs text-primary hover:text-primary">
                              <UserPlus className="w-3 h-3 mr-1" />
                              Assigner
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            {partners.map(p => (
                              <DropdownMenuItem key={p.id} onClick={() => handleAssignPartner(req.id, p.id)}>
                                {p.user?.full_name} ({p.user?.country_id})
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/requests/${req.id}`} className="flex items-center">
                              <Search className="w-4 h-4 mr-2" />
                              Détails
                            </Link>
                          </DropdownMenuItem>
                          {req.status === "ANALYSIS" && (
                            <>
                              <DropdownMenuItem onClick={() => handleValidateRequest(req.id)} className="text-success">
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Valider la demande
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRejectRequest(req.id)} className="text-destructive">
                                <XCircle className="w-4 h-4 mr-2" />
                                Refuser
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem className="text-warning">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Signaler Incident
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
