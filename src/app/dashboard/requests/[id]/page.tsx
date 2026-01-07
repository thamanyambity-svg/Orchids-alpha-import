"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { 
  ArrowLeft, 
  FileText, 
  Globe2, 
  Package, 
  Clock, 
  CheckCircle2, 
  Loader2,
  ShieldCheck,
  AlertCircle,
  CreditCard,
  Building2,
  Phone,
  Mail
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { PaymentButton } from "@/components/payment-button"

const statusLabels: Record<string, string> = {
  PENDING: "En attente",
  ANALYSIS: "En analyse",
  VALIDATED: "Validé",
  EXECUTING: "En exécution",
  SHIPPED: "Expédié",
  DELIVERED: "Livré",
  INCIDENT: "Incident",
  CLOSED: "Fermé",
}

const statusColors: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  ANALYSIS: "bg-primary/10 text-primary",
  VALIDATED: "bg-chart-2/10 text-chart-2",
  EXECUTING: "bg-chart-3/10 text-chart-3",
  SHIPPED: "bg-chart-4/10 text-chart-4",
  DELIVERED: "bg-success/10 text-success",
  INCIDENT: "bg-destructive/10 text-destructive",
  CLOSED: "bg-muted text-muted-foreground",
}

export default function RequestDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const [request, setRequest] = useState<any>(null)
    const [order, setOrder] = useState<any>(null)
    const [documents, setDocuments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const documentTypeLabels: Record<string, string> = {
      PROFORMA_INVOICE: "Facture Proforma",
      COMMERCIAL_INVOICE: "Facture Commerciale",
      PACKING_LIST: "Packing List",
      INSPECTION_REPORT: "Rapport d'inspection",
      BILL_OF_LADING: "Bill of Lading / LTA",
      CERTIFICATE_ORIGIN: "Certificat d'Origine",
      OTHER: "Autre document",
    }

    useEffect(() => {
      async function fetchData() {
        setLoading(true)
        const supabase = createClient()
        
        const [requestRes, orderRes, docsRes] = await Promise.all([
          supabase
            .from("import_requests")
            .select(`
              *,
              countries (name, flag),
              assigned_partner:partner_profiles (
                full_name,
                company_name,
                email,
                phone
              )
            `)
            .eq("id", id)
            .single(),
          supabase
            .from("orders")
            .select("*")
            .eq("request_id", id)
            .single(),
          supabase
            .from("request_documents")
            .select("*")
            .eq("request_id", id)
            .order('created_at', { ascending: false })
        ])

        if (requestRes.error) {
          console.error("Error fetching request:", requestRes.error)
        } else {
          setRequest(requestRes.data)
          setOrder(orderRes.data)
          setDocuments(docsRes.data || [])
        }
        setLoading(false)
      }

      if (id) fetchData()
    }, [id])


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="p-12 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="font-semibold mb-2">Demande introuvable</h3>
        <Button asChild variant="outline">
          <Link href="/dashboard/requests">Retour aux demandes</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/requests" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour aux demandes
          </Link>
        </Button>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[request.status]}`}>
          {statusLabels[request.status]}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            <section className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Détails du dossier
              </h2>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-muted-foreground">Catégorie</label>
                  <p className="font-semibold">{request.category}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Référence</label>
                  <p className="font-semibold">{request.reference}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Quantité</label>
                  <p className="font-semibold">{request.quantity} {request.unit}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Budget Max</label>
                  <p className="font-semibold">${request.budget_max?.toLocaleString()}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm text-muted-foreground">Spécifications</label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{request.specifications?.description}</p>
                </div>
              </div>
            </section>

            {order && (
              <section className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <ShieldCheck className="w-24 h-24" />
                </div>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Facturation & Paiement (Modèle 60/40)
                </h2>
                
                <div className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl border ${order.deposit_paid ? 'bg-success/5 border-success/20' : 'bg-primary/5 border-primary/20'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium">Acompte (60%)</span>
                        {order.deposit_paid && <CheckCircle2 className="w-4 h-4 text-success" />}
                      </div>
                      <p className="text-2xl font-bold mb-4">${order.deposit_amount?.toLocaleString()}</p>
                      
                      {!order.deposit_paid ? (
                        <PaymentButton 
                          orderId={order.id} 
                          paymentType="DEPOSIT_60" 
                          amount={Number(order.deposit_amount)}
                          className="w-full"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-success text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Payé le {new Date(order.updated_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className={`p-4 rounded-xl border ${order.balance_paid ? 'bg-success/5 border-success/20' : 'bg-muted border-border'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium">Solde (40%)</span>
                        {order.balance_paid && <CheckCircle2 className="w-4 h-4 text-success" />}
                      </div>
                      <p className="text-2xl font-bold mb-4">${order.balance_amount?.toLocaleString()}</p>
                      
                      {!order.balance_paid ? (
                        <PaymentButton 
                          orderId={order.id} 
                          paymentType="BALANCE_40" 
                          amount={Number(order.balance_amount)}
                          disabled={!order.deposit_paid}
                          className="w-full"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-success text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Payé
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground">
                    <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                    <p>
                      Vos fonds sont bloqués sur le compte séquestre Alpha. 
                      Le partenaire n&apos;est payé qu&apos;après validation de chaque étape clé.
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Documents du dossier
              </h2>
              
              {documents.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {documents.map((doc) => (
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
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString()} • {doc.service}
                          </p>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" asChild title="Voir">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">Aucun document n'a encore été ajouté.</p>
                </div>
              )}
            </section>
          </div>


        <div className="space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-primary" />
              Origine
            </h3>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <span className="text-3xl">{request.countries?.flag}</span>
              <div>
                <p className="font-bold">{request.countries?.name}</p>
                <p className="text-xs text-muted-foreground">Partenaire certifié actif</p>
              </div>
            </div>
          </section>

          {request.assigned_partner && (
            <section className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Partenaire Local
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="font-bold text-sm">{request.assigned_partner.full_name}</p>
                  <p className="text-xs text-muted-foreground">{request.assigned_partner.company_name}</p>
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
            </section>
          )}

          <section className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Historique
            </h3>
            <div className="space-y-4">
              <div className="relative pl-6 pb-4 border-l border-border last:pb-0">
                <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-primary" />
                <p className="text-xs font-bold">Demande créée</p>
                <p className="text-[10px] text-muted-foreground">{new Date(request.created_at).toLocaleString()}</p>
              </div>
              {order && (
                <div className="relative pl-6 pb-4 border-l border-border last:pb-0">
                  <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-primary" />
                  <p className="text-xs font-bold">Proposition commerciale</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
