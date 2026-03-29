"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Package, 
  FileText,
  Upload,
  Clock,
  AlertCircle,
  MoreVertical,
  ExternalLink,
  Trash2
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
import { DocumentUploadModal } from "@/components/partner/document-upload-modal"

interface BuyerProfileInfo {
  full_name: string | null
  company_name: string | null
  activity_type: string | null
}

interface PartnerRequest {
  id: string
  category: string
  reference: string
  quantity: number | null
  unit: string | null
  budget_min: number | null
  budget_max: number | null
  created_at: string
  description: string | null
  status: string
  buyer_profiles: BuyerProfileInfo | null
  [key: string]: unknown
}

interface RequestDocument {
  id: string
  type: string
  created_at: string
  service: string | null
  file_url: string
  [key: string]: unknown
}

const statusLabels: Record<string, string> = {
  PENDING: "En attente",
  VALIDATED: "À traiter",
  EXECUTING: "En cours d'exécution",
  SHIPPED: "Expédié",
  DELIVERED: "Livré",
  CLOSED: "Terminé",
  CANCELLED: "Annulé",
}

const documentTypeLabels: Record<string, string> = {
  PROFORMA_INVOICE: "Facture Proforma",
  COMMERCIAL_INVOICE: "Facture Commerciale",
  PACKING_LIST: "Packing List",
  INSPECTION_REPORT: "Rapport d'inspection",
  BILL_OF_LADING: "Bill of Lading / LTA",
  CERTIFICATE_ORIGIN: "Certificat d'Origine",
  PAYMENT_RECEIPT: "Reçu de Paiement (Alpha)",
  COMPLIANCE_REPORT: "Rapport de Conformité (Alpha)",
  OTHER: "Autre document",
}

export default function PartnerRequestDetailPage() {
  const params = useParams()
  const _router = useRouter()
  const [request, setRequest] = useState<PartnerRequest | null>(null)
  const [documents, setDocuments] = useState<RequestDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      try {
        const [requestRes, docsRes] = await Promise.all([
          supabase
            .from('import_requests')
            .select(`
              *,
              buyer_profiles (
                full_name,
                company_name,
                activity_type
              )
            `)
            .eq('id', params.id)
            .single(),
          supabase
            .from('request_documents')
            .select('*')
            .eq('request_id', params.id)
            .order('created_at', { ascending: false })
        ])

        if (requestRes.error) throw requestRes.error
        setRequest(requestRes.data as PartnerRequest)
        setDocuments((docsRes.data || []) as RequestDocument[])
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error("Erreur lors de la récupération des données")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) fetchData()
  }, [params.id])

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from('request_documents')
      .select('*')
      .eq('request_id', params.id)
      .order('created_at', { ascending: false })
    
    if (!error) setDocuments((data || []) as RequestDocument[])
  }

  const deleteDocument = async (id: string, url: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce document ?")) return

    try {
      // 1. Delete from storage (need to extract path from URL)
      const path = url.split('/storage/v1/object/public/documents/')[1]
      if (path) {
        await supabase.storage.from('documents').remove([path])
      }

      // 2. Delete from DB
      const { error } = await supabase
        .from('request_documents')
        .delete()
        .eq('id', id)

      if (error) throw error

      setDocuments(documents.filter(d => d.id !== id))
      toast.success("Document supprimé")
    } catch (_error) {
      toast.error("Erreur lors de la suppression")
    }
  }

  const updateStatus = async (newStatus: string) => {
    setUpdating(true)
    try {
      const response = await fetch('/api/partner/requests/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: params.id,
          status: newStatus
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update status')
      }
      
      const { data } = await response.json()
      setRequest({ ...request, status: data.status })
      toast.success(`Statut mis à jour : ${statusLabels[newStatus]}`)
    } catch (error: unknown) {
      console.error('Error updating status:', error)
      toast.error(`Erreur: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Clock className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Dossier non trouvé</h2>
        <Button asChild variant="outline">
          <Link href="/partner/requests">Retour à la liste</Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="px-6 pt-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/partner/requests" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour aux dossiers
          </Link>
        </Button>
      </div>

      <DashboardHeader 
        title={request.category}
        subtitle={`Référence: ${request.reference}`}
      >
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={updating}>
                {updating ? "Mise à jour..." : "Modifier le statut"}
                <MoreVertical className="ml-2 w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => updateStatus('EXECUTING')}>
                Marquer comme &quot;En cours&quot;
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus('SHIPPED')}>
                Marquer comme &quot;Expédié&quot;
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus('DELIVERED')}>
                Marquer comme &quot;Livré&quot;
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </DashboardHeader>

      <div className="p-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Informations principales */}
          <div className="rounded-2xl bg-card border border-border p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Détails de la marchandise
            </h3>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Catégorie</p>
                <p className="font-medium">{request.category}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Quantité</p>
                <p className="font-medium">{request.quantity} {request.unit}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Budget cible</p>
                <p className="font-medium text-lg text-primary">
                  {request.budget_min && request.budget_max ? (
                    `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(request.budget_min)} - ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(request.budget_max)}`
                  ) : request.budget_max ? (
                    `Max: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(request.budget_max)}`
                  ) : "Non spécifié"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Date de création</p>
                <p className="font-medium">
                  {format(new Date(request.created_at), "d MMMM yyyy", { locale: fr })}
                </p>
              </div>
            </div>

            <div className="mt-8 p-4 rounded-xl bg-muted/50">
              <p className="text-sm text-muted-foreground mb-2">Description / Instructions</p>
              <p className="text-sm whitespace-pre-wrap">{request.description || "Aucune description fournie."}</p>
            </div>
          </div>

            {/* Documents */}
            <div className="rounded-2xl bg-card border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Documents du dossier
                </h3>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => setUploadModalOpen(true)}
                >
                  <Upload className="w-4 h-4" />
                  Ajouter
                </Button>
              </div>

              <div className="space-y-3">
                {documents.length > 0 ? (
                  documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border group hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {documentTypeLabels[doc.type] || doc.type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(doc.created_at), "d MMM yyyy", { locale: fr })} • {doc.service}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" asChild title="Ouvrir">
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteDocument(doc.id, doc.file_url)}
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
                    <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">Aucun document téléversé</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DocumentUploadModal
          requestId={params.id as string}
          open={uploadModalOpen}
          onOpenChange={setUploadModalOpen}
          onSuccess={fetchDocuments}
        />
      </div>
    )
  }

