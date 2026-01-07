"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
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
  ExternalLink
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

const statusLabels: Record<string, string> = {
  PENDING: "En attente",
  VALIDATED: "À traiter",
  EXECUTING: "En cours d'exécution",
  SHIPPED: "Expédié",
  DELIVERED: "Livré",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
}

export default function PartnerRequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function fetchRequest() {
      try {
        const { data, error } = await supabase
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
          .single()

        if (error) throw error
        setRequest(data)
      } catch (error) {
        console.error('Error fetching request:', error)
        toast.error("Erreur lors de la récupération du dossier")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) fetchRequest()
  }, [params.id])

  const updateStatus = async (newStatus: string) => {
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('import_requests')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)

      if (error) throw error
      
      setRequest({ ...request, status: newStatus })
      toast.success(`Statut mis à jour : ${statusLabels[newStatus]}`)

      // Notification webhook call (Triggered by DB Webhook or manual call)
      // For now, we rely on Supabase DB webhooks if configured, 
      // or we can call the n8n webhook directly if needed.
      // Assuming DB webhooks are handled on the backend for status changes.

    } catch (error) {
      console.error('Error updating status:', error)
      toast.error("Erreur lors de la mise à jour du statut")
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
        title={request.product_name}
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
                Marquer comme "En cours"
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus('SHIPPED')}>
                Marquer comme "Expédié"
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus('DELIVERED')}>
                Marquer comme "Livré"
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
                <p className="text-sm text-muted-foreground">Produit</p>
                <p className="font-medium">{request.product_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Quantité</p>
                <p className="font-medium">{request.quantity}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Budget cible</p>
                <p className="font-medium text-lg text-primary">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(request.budget)}
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
              <Button size="sm" variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border group hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Facture Proforma</p>
                    <p className="text-xs text-muted-foreground">Ajouté le 05 Jan 2024</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Acheteur */}
          <div className="rounded-2xl bg-card border border-border p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Client
            </h3>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xl font-bold">
                {request.buyer_profiles?.full_name?.charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{request.buyer_profiles?.full_name}</p>
                <p className="text-xs text-muted-foreground">{request.buyer_profiles?.company_name}</p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Type d'activité</span>
                <span className="font-medium">{request.buyer_profiles?.activity_type || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pays destination</span>
                <span className="font-medium">RD Congo</span>
              </div>
            </div>
          </div>

          {/* Statut actuel */}
          <div className="rounded-2xl bg-card border border-border p-6">
            <h3 className="text-lg font-semibold mb-4">État d'avancement</h3>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 mb-6">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{statusLabels[request.status]}</p>
                <p className="text-xs text-muted-foreground">Dernière mise à jour: {format(new Date(request.updated_at || request.created_at), "HH:mm")}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-0.5 h-10 bg-primary/30 relative mt-2 ml-2">
                  <div className="absolute top-0 -left-[3px] w-2 h-2 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Assignation partenaire</p>
                  <p className="text-xs text-muted-foreground">Effectuée le {format(new Date(request.created_at), "d MMM")}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-0.5 h-10 bg-border relative mt-2 ml-2">
                  <div className="absolute top-0 -left-[3px] w-2 h-2 rounded-full bg-border" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sourcing & Saisie</p>
                  <p className="text-xs text-muted-foreground">En attente</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
