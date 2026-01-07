"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Package, 
  User, 
  Calendar, 
  DollarSign, 
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  ExternalLink,
  Shield,
  Truck,
  Building2,
  Phone,
  Mail,
  XCircle,
  History
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard/header"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

const statusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  ANALYSIS: "En analyse",
  VALIDATED: "Validée",
  REJECTED: "Refusée",
  AWAITING_DEPOSIT: "Attente Acompte",
  EXECUTING: "Exécution",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CLOSED: "Clôturée",
  INCIDENT: "Incident",
}

const documentTypeLabels: Record<string, string> = {
  PROFORMA_INVOICE: "Facture Proforma",
  COMMERCIAL_INVOICE: "Facture Commerciale",
  PACKING_LIST: "Packing List",
  INSPECTION_REPORT: "Rapport d'inspection",
  BILL_OF_LADING: "Bill of Lading / LTA",
  CERTIFICATE_ORIGIN: "Certificat d'Origine",
  OTHER: "Autre document",
}

export default function AdminRequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [request, setRequest] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      try {
        const [requestRes, docsRes, orderRes] = await Promise.all([
          supabase
            .from('import_requests')
            .select(`
              *,
              buyer:profiles!import_requests_buyer_id_fkey(*),
              assigned_partner:partner_profiles (
                *,
                user:profiles(*)
              ),
              country:countries(*)
            `)
            .eq('id', params.id)
            .single(),
          supabase
            .from('request_documents')
            .select('*')
            .eq('request_id', params.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('orders')
            .select('*')
            .eq('request_id', params.id)
            .single()
        ])

        if (requestRes.error) throw requestRes.error
        setRequest(requestRes.data)
        setDocuments(docsRes.data || [])
        setOrder(orderRes.data)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error("Erreur lors de la récupération des données")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) fetchData()
  }, [params.id])

  const handleAction = async (action: string, data?: any) => {
    setUpdating(true)
    try {
      const response = await fetch('/api/admin/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, requestId: params.id, data })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Action failed')

      toast.success("Opération réussie")
      router.refresh()
      // Re-fetch data
      const { data: updatedReq } = await supabase
        .from('import_requests')
        .select('*, buyer:profiles!import_requests_buyer_id_fkey(*), assigned_partner:partner_profiles(*)')
        .eq('id', params.id)
        .single()
      setRequest(updatedReq)
    } catch (error: any) {
      toast.error("Erreur: " + error.message)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Clock className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="p-8 text-center min-h-screen">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Dossier non trouvé</h2>
        <Button asChild variant="outline">
          <Link href="/admin/requests">Retour à la liste</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/admin/requests" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
          </Link>
        </Button>
      </div>

      <DashboardHeader 
        title={request.category}
        subtitle={`Référence: ${request.reference}`}
      >
        <div className="flex items-center gap-3">
          {request.status === "ANALYSIS" && (
            <>
              <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleAction('REJECT')}>
                Refuser
              </Button>
              <Button onClick={() => handleAction('VALIDATE')}>
                Valider la demande
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Actions
                <MoreVertical className="ml-2 w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleAction('SET_STATUS', { status: 'INCIDENT' })} className="text-destructive">
                Signaler un incident
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction('SET_STATUS', { status: 'CLOSED' })}>
                Clôturer le dossier
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </DashboardHeader>

      <div className="p-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info */}
          <div className="rounded-2xl bg-card border border-border p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Détails de la demande
            </h3>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Produit</p>
                <p className="font-medium">{request.product_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Catégorie</p>
                <p className="font-medium">{request.category}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Quantité</p>
                <p className="font-medium">{request.quantity} {request.unit}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Budget Max</p>
                <p className="font-medium text-lg text-primary">
                  ${request.budget_max?.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-8 p-4 rounded-xl bg-muted/50">
              <p className="text-sm text-muted-foreground mb-2">Description / Spécifications</p>
              <p className="text-sm whitespace-pre-wrap">{request.specifications?.description || "Aucune description fournie."}</p>
            </div>
          </div>

          {/* Documents */}
          <div className="rounded-2xl bg-card border border-border p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Documents partagés
            </h3>

            <div className="space-y-3">
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <div 
                    key={doc.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border group hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">
                          {documentTypeLabels[doc.type] || doc.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(doc.created_at), "d MMM yyyy", { locale: fr })} • {doc.service}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild className="gap-2">
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                        Voir
                      </a>
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground">Aucun document téléversé</p>
                </div>
              )}
            </div>
          </div>

          {/* Financial Info if exists */}
          {order && (
            <div className="rounded-2xl bg-card border border-border p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Shield className="w-24 h-24" />
              </div>
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Détails Financiers
              </h3>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Acompte (60%)</p>
                  <p className="text-2xl font-bold">${order.deposit_amount?.toLocaleString()}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {order.deposit_paid ? (
                      <Badge className="bg-success/20 text-success border-success/30">Payé</Badge>
                    ) : (
                      <Badge variant="outline">En attente</Badge>
                    )}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Solde (40%)</p>
                  <p className="text-2xl font-bold">${order.balance_amount?.toLocaleString()}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {order.balance_paid ? (
                      <Badge className="bg-success/20 text-success border-success/30">Payé</Badge>
                    ) : (
                      <Badge variant="outline">En attente</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Status Card */}
          <div className="rounded-2xl bg-card border border-border p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Statut Actuel
            </h3>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wider">{statusLabels[request.status]}</p>
                <p className="text-xs text-muted-foreground">Maj le {format(new Date(request.updated_at || request.created_at), "d MMM à HH:mm")}</p>
              </div>
            </div>
          </div>

          {/* Buyer Info */}
          <div className="rounded-2xl bg-card border border-border p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Acheteur
            </h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xl font-bold uppercase">
                {request.buyer?.full_name?.charAt(0)}
              </div>
              <div>
                <p className="font-bold">{request.buyer?.full_name}</p>
                <p className="text-xs text-muted-foreground">{request.buyer?.email}</p>
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Entreprise</span>
                <span className="font-medium">{request.buyer?.company_name || 'Particulier'}</span>
              </div>
            </div>
          </div>

          {/* Partner Info */}
          <div className="rounded-2xl bg-card border border-border p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Partenaire Local
            </h3>
            {request.assigned_partner ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{request.assigned_partner.user?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{request.assigned_partner.company_name}</p>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    {request.assigned_partner.phone}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    {request.assigned_partner.email}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 bg-muted/30 rounded-xl border border-dashed border-border">
                <p className="text-xs text-muted-foreground mb-3">Aucun partenaire assigné</p>
                <Button size="sm" variant="outline">Assigner maintenant</Button>
              </div>
            )}
          </div>

          {/* Country/Origin */}
          <div className="rounded-2xl bg-card border border-border p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Origine
            </h3>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <span className="text-3xl">{request.country?.flag}</span>
              <div>
                <p className="font-bold">{request.country?.name}</p>
                <p className="text-xs text-muted-foreground">Sourcing local certifié</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
