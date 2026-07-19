"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n-context"
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
  Mail,
  ExternalLink,
  FileText as FileTextIcon,
  DollarSign,
  Truck,
  Plane,
  Ship,
  Search,
  Eye,
  Edit,
  Download,
  ScrollText,
  PenSquare
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { PaymentButton } from "@/components/payment-button"
import { TrackingTimeline } from "@/components/dashboard/tracking-timeline"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PurchaseOrderCard } from "@/components/dashboard/purchase-order-card"
import { QuoteSubmissionForm } from "@/components/dashboard/quote-submission-form"

const statusLabels: Record<string, string> = {
  PENDING: "En attente",
  DRAFT: "Brouillon",
  ANALYSIS: "En analyse",
  VALIDATED: "Validé",
  REJECTED: "Rejeté",
  AWAITING_DEPOSIT: "En attente acompte",
  AWAITING_BALANCE: "En attente solde",
  EXECUTING: "En exécution",
  SHIPPED: "Expédié",
  DELIVERED: "Livré",
  INCIDENT: "Incident",
  CLOSED: "Fermé",
  QUOTE_ACCEPTED: "Devis accepté",
  FUNDED: "Financé",
  SOURCING: "Sourcing",
  PURCHASED: "Acheté",
  FROZEN: "Gelé",
  CANCELLED: "Annulé"
}

const statusColors: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  DRAFT: "bg-muted text-muted-foreground",
  ANALYSIS: "bg-primary/10 text-primary",
  VALIDATED: "bg-chart-2/10 text-chart-2",
  REJECTED: "bg-destructive/10 text-destructive",
  AWAITING_DEPOSIT: "bg-amber/10 text-amber-600",
  AWAITING_BALANCE: "bg-amber/10 text-amber-600",
  EXECUTING: "bg-chart-3/10 text-chart-3",
  SHIPPED: "bg-chart-4/10 text-chart-4",
  DELIVERED: "bg-success/10 text-success",
  INCIDENT: "bg-destructive/10 text-destructive",
  CLOSED: "bg-muted text-muted-foreground",
  QUOTE_ACCEPTED: "bg-primary/10 text-primary",
  FUNDED: "bg-success/10 text-success",
  SOURCING: "bg-chart-3/10 text-chart-3",
  PURCHASED: "bg-chart-4/10 text-chart-4",
  FROZEN: "bg-muted text-muted-foreground",
  CANCELLED: "bg-destructive/10 text-destructive"
}

const quoteStatusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Envoyé",
  ACCEPTED: "Accepté",
  REJECTED: "Rejeté",
  EXPIRED: "Expiré",
  REVISED: "Révisé"
}

const quoteStatusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-primary/10 text-primary",
  ACCEPTED: "bg-success/10 text-success",
  REJECTED: "bg-destructive/10 text-destructive",
  EXPIRED: "bg-muted text-muted-foreground",
  REVISED: "bg-amber/10 text-amber-600"
}

const poStatusLabels: Record<string, string> = {
  GENERATED: "Généré",
  PENDING_SIGNATURE: "En attente signature",
  SIGNED: "Signé",
  CONFIRMED: "Confirmé",
  CANCELLED: "Annulé",
  EXPIRED: "Expiré"
}

const poStatusColors: Record<string, string> = {
  GENERATED: "bg-muted text-muted-foreground",
  PENDING_SIGNATURE: "bg-amber/10 text-amber-600",
  SIGNED: "bg-primary/10 text-primary",
  CONFIRMED: "bg-success/10 text-success",
  CANCELLED: "bg-destructive/10 text-destructive",
  EXPIRED: "bg-muted text-muted-foreground"
}

export default function RequestDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const { t } = useLanguage()
  const [request, setRequest] = useState<any>(null)
  const [order, setOrder] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [quotes, setQuotes] = useState<any[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [showQuoteForm, setShowQuoteForm] = useState(false)

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

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const supabase = createClient()

      const [requestRes, orderRes, docsRes, quotesRes, poRes] = await Promise.all([
        supabase
          .from("import_requests")
          .select(`
            *,
            countries (name, flag),
            assigned_partner:partner_profiles (full_name, company_name, email, phone)
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
          .order("created_at", { ascending: false }),
        supabase
          .from("quotes")
          .select("*")
          .eq("request_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("purchase_orders")
          .select("*")
          .eq("request_id", id)
          .order("created_at", { ascending: false })
      ])

      if (requestRes.error) {
        console.error("Error fetching request:", requestRes.error)
      } else {
        setRequest(requestRes.data)
        setOrder(orderRes.data)
        setDocuments(docsRes.data || [])
        setQuotes(quotesRes.data || [])
        setPurchaseOrders(poRes.data || [])
      }
      setLoading(false)
    }

    if (id) fetchData()
  }, [id])

  const handleQuoteSubmit = async (quoteData: any) => {
    const supabase = createClient()
    const { error } = await supabase.from("quotes").insert({
      ...quoteData,
      request_id: id,
      partner_id: quoteData.partner_id,
      status: "SUBMITTED",
      submitted_at: new Date().toISOString(),
    })
    if (error) throw error
    setShowQuoteForm(false)
    router.refresh()
  }

  const handlePOAccept = async (poId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("purchase_orders")
      .update({
        status: "SIGNED",
        cgv_accepted_at: new Date().toISOString(),
        cgv_accepted_ip: "auto",
        cgv_accepted_user_agent: navigator.userAgent,
        updated_at: new Date().toISOString()
      })
      .eq("id", poId)
    if (error) throw error
    router.refresh()
  }

  const handlePOCancel = async (poId: string, reason: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.rpc("request_po_cancellation", {
      p_po_id: poId,
      p_requested_by: user?.id,
      p_reason: reason
    })
    if (error) throw error
    router.refresh()
  }

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
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/requests" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t("dashboard.request.back", "Retour aux demandes")}
          </Link>
        </Button>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[request.status]}`}>
          {t("dashboard.request.status_" + request.status, statusLabels[request.status])}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 md:grid-cols-7">
          <TabsTrigger value="overview">{t("dashboard.request.tab_overview", "Vue d'ensemble")}</TabsTrigger>
          <TabsTrigger value="quotes">{t("dashboard.request.tab_quotes", "Devis / Proforma")} {quotes.length > 0 && <Badge variant="secondary" className="ml-1">{quotes.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="purchase_orders">{t("dashboard.request.tab_po", "Bons de Commande")} {purchaseOrders.length > 0 && <Badge variant="secondary" className="ml-1">{purchaseOrders.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="documents">{t("dashboard.request.tab_docs", "Documents")} {documents.length > 0 && <Badge variant="secondary" className="ml-1">{documents.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="tracking">{t("dashboard.request.tab_tracking", "Tracking")}</TabsTrigger>
          <TabsTrigger value="history">{t("dashboard.request.tab_history", "Historique")}</TabsTrigger>
          {(request.role === "PARTNER" || request.role === "ADMIN") && (
            <TabsTrigger value="submit_quote">{t("dashboard.request.tab_submit_quote", "Soumettre Devis")}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-8 animate-in fade-in">
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

              {!order && (
                <section className="bg-card border border-border rounded-2xl p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Prochaine étape : Devis Partenaire
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Votre demande est en cours de validation. L'administrateur assignera un partenaire qui soumettra un devis/proforma tout inclus.
                  </p>
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm">
                    <strong>Flux :</strong> Validation Admin → Partenaire soumet Devis → Vous validez → PO Auto (48h annulation) → Acompte 60%
                  </div>
                </section>
              )}

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
                      <div className={`p-4 rounded-xl border ${order.deposit_paid ? "bg-success/5 border-success/20" : "bg-primary/5 border-primary/20"}`}>
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

                      <div className={`p-4 rounded-xl border ${order.balance_paid ? "bg-success/5 border-success/20" : "bg-muted border-border"}`}>
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
                        Le partenaire n'est payé qu'après validation de chaque étape clé.
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <section className="bg-card border border-border rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <FileTextIcon className="w-5 h-5 text-primary" />
                  {t("dashboard.request.documents", "Documents du dossier")}
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
                            <FileTextIcon className="w-5 h-5 text-primary" />
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
                    <FileTextIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">Aucun document n'a encore été ajouté.</p>
</div>
          )}
              </section>

              <TrackingTimeline requestId={id as string} />
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

        </TabsContent>

        <TabsContent value="quotes" className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{t("dashboard.request.tab_quotes", "Devis / Proforma")}</h2>
            {request.assigned_partner && (
              <Button onClick={() => setShowQuoteForm(true)}>
                <PenSquare className="w-4 h-4 mr-2" />
                {t("dashboard.request.new_quote", "Nouveau Devis")}
              </Button>
            )}
          </div>
          {quotes.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
              <FileTextIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">Aucun devis pour cette demande.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map((quote) => (
                <Card key={quote.id} className="border-border">
                  <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                    <div>
                      <div className="flex items-center gap-3">
                        <FileTextIcon className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-bold">Devis v{quote.version} - ${quote.grand_total_usd?.toLocaleString()} {quote.currency}</p>
                          <p className="text-sm text-muted-foreground">
                            Incoterm: {quote.incoterm} • Valide jusqu'au: {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className={`ml-2 ${quoteStatusColors[quote.status]}`}>
                      {t("dashboard.request.quote_status_" + quote.status, quoteStatusLabels[quote.status])}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-4">
                    <div className="grid md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <label className="text-muted-foreground">Prix Unitaire</label>
                        <p className="font-semibold">${Number(quote.unit_price_usd).toLocaleString()} {quote.currency}</p>
                      </div>
                      <div>
                        <label className="text-muted-foreground">Quantité</label>
                        <p className="font-semibold">{quote.quantity}</p>
                      </div>
                      <div>
                        <label className="text-muted-foreground">Sous-total</label>
                        <p className="font-semibold">${Number(quote.subtotal_usd).toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-muted-foreground">Total Frais</label>
                        <p className="font-semibold">${Number(quote.total_fees_usd).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">TOTAL FINAL</span>
                        <span className="text-2xl font-bold text-primary">${Number(quote.grand_total_usd).toLocaleString()} {quote.currency}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{quote.incoterm}</Badge>
                      <Badge variant="outline">Port: {quote.port_loading || "-"}</Badge>
                      <Badge variant="outline">Arrivée: {quote.port_discharge || "-"}</Badge>
                      <Badge variant="outline">{quote.estimated_transit_days}j transit</Badge>
                    </div>
                    {quote.proforma_pdf_url && (
                      <Button variant="outline" asChild className="mt-2">
                        <a href={quote.proforma_pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4 mr-1" />
                          Proforma PDF
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {showQuoteForm && (
            <QuoteSubmissionForm
              requestId={id as string}
              requestData={request}
              onSubmit={handleQuoteSubmit}
              onCancel={() => setShowQuoteForm(false)}
            />
          )}
        </TabsContent>

        <TabsContent value="purchase_orders" className="space-y-6 animate-in fade-in">
          <h2 className="text-xl font-bold">{t("dashboard.request.tab_po", "Bons de Commande")}</h2>
          {purchaseOrders.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
              <FileTextIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">Aucun bon de commande. Sera généré automatiquement après acceptation du devis.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {purchaseOrders.map((po) => (
                <PurchaseOrderCard
                  key={po.id}
                  po={po}
                  request={request}
                  onAccept={() => handlePOAccept(po.id)}
                  onCancel={(reason) => handlePOCancel(po.id, reason)}
                  onViewQuote={() => setActiveTab("quotes")}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="animate-in fade-in">
          <h2 className="text-xl font-bold mb-6">{t("dashboard.request.tab_docs", "Documents")}</h2>
          {documents.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
              <FileTextIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">Aucun document.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border group hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileTextIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{documentTypeLabels[doc.type] || doc.type}</p>
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
          )}
        </TabsContent>

        <TabsContent value="tracking" className="animate-in fade-in">
          <TrackingTimeline requestId={id as string} />
        </TabsContent>

        <TabsContent value="history" className="animate-in fade-in">
          <h2 className="text-xl font-bold mb-6">{t("dashboard.request.tab_history", "Historique complet")}</h2>
          <div className="space-y-4">
            <div className="relative pl-6 pb-4 border-l border-border last:pb-0">
              <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-primary" />
              <p className="text-xs font-bold">Demande créée</p>
              <p className="text-[10px] text-muted-foreground">{new Date(request.created_at).toLocaleString()}</p>
            </div>
            {quotes.length > 0 && quotes.map((q) => (
              <div key={q.id} className="relative pl-6 pb-4 border-l border-border last:pb-0">
                <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-primary" />
                <p className="text-xs font-bold">Devis v{q.version} - {q.status}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(q.submitted_at || q.created_at).toLocaleString()}</p>
              </div>
            ))}
            {order && (
              <div className="relative pl-6 pb-4 border-l border-border last:pb-0">
                <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-primary" />
                <p className="text-xs font-bold">Commande créée</p>
                <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
              </div>
            )}
            {purchaseOrders.map((po) => (
              <div key={po.id} className="relative pl-6 pb-4 border-l border-border last:pb-0">
                <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-success" />
                <p className="text-xs font-bold">PO: {po.po_number} - {po.status}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(po.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        {(request.role === "PARTNER" || request.role === "ADMIN") && (
          <TabsContent value="submit_quote" className="animate-in fade-in">
            <QuoteSubmissionForm
              requestId={id as string}
              requestData={request}
              onSubmit={handleQuoteSubmit}
              onCancel={() => setActiveTab("quotes")}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}