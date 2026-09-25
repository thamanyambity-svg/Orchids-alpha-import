"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/i18n-context"
import {
  FileText, ShieldCheck, AlertCircle, Clock, CheckCircle2,
  XCircle, Loader2, Download, Eye, AlertTriangle, Bell,
  Signature, Check, X, Timer, Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"

interface PurchaseOrderCardProps {
  po: any
  quote?: any
  request: any
  onSigned?: () => void
  onCancel?: (reason: string) => void
  onViewQuote?: () => void
  readOnly?: boolean
}

export function PurchaseOrderCard({ po, quote, request, onSigned, onCancel, onViewQuote, readOnly = false }: PurchaseOrderCardProps) {
  const { t } = useLanguage()
  const [showCGV, setShowCGV] = useState(false)
  const [cgvAccepted, setCgvAccepted] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string>("")

  // Check if CGV already accepted
  useEffect(() => {
    if (po.cgv_accepted_at) {
      setCgvAccepted(true)
    }
  }, [po.cgv_accepted_at])

  // Calculate time remaining for 48h cancellation
  useEffect(() => {
    if (!po.cgv_accepted_at || po.status === 'CONFIRMED' || po.status === 'CANCELLED') {
      setTimeRemaining("")
      return
    }
    const acceptedAt = new Date(po.cgv_accepted_at)
    const expiresAt = new Date(acceptedAt.getTime() + 48 * 60 * 60 * 1000)
    
    const updateTimer = () => {
      const now = new Date()
      const diff = expiresAt.getTime() - now.getTime()
      if (diff <= 0) {
        setTimeRemaining("EXPIRED")
        return
      }
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [po.cgv_accepted_at, po.status])

  const getStatusConfig = () => {
    switch (po.status) {
      case 'GENERATED':
        return { label: t("po.status.awaiting_final_invoice", "En attente de la facture finale"), color: "bg-muted text-muted-foreground", icon: FileText }
      case 'PENDING_SIGNATURE':
        return { label: t("po.status.pending_signature", "En attente signature"), color: "bg-warning/10 text-warning border-warning-border", icon: AlertCircle }
      case 'SIGNED':
        return { label: t("po.status.signed", "Signé (48h)"), color: "bg-info/10 text-info border-info-border", icon: CheckCircle2 }
      case 'CONFIRMED':
        return { label: t("po.status.confirmed", "Confirmé"), color: "bg-success/10 text-success border-success-border", icon: ShieldCheck }
      case 'CANCELLED':
        return { label: t("po.status.cancelled", "Annulé"), color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle }
      case 'EXPIRED':
        return { label: t("po.status.expired", "Expiré"), color: "bg-muted text-muted-foreground", icon: Clock }
      default:
        return { label: po.status, color: "bg-muted text-muted-foreground", icon: FileText }
    }
  }

  const canCancel = po.cgv_accepted_at && 
    ['GENERATED', 'PENDING_SIGNATURE', 'SIGNED'].includes(po.status) &&
    timeRemaining !== "EXPIRED" && timeRemaining !== ""


  const handleCancel = async () => {
    if (!confirm(t("po.confirm_cancel", "Confirmer l'annulation dans les 48h ? Cette action est irréversible."))) return
    const reason = prompt(t("po.cancel_reason", "Motif de l'annulation :"))?.trim()
    if (!reason) return
    if (onCancel) onCancel(reason)
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  return (
    <>
    <Card className={`border-2 ${statusConfig.color.replace('text-', 'border-')}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusConfig.color}`}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {t("po.title", "Bon de Commande")} {po.po_number}
                <Badge variant="outline" className={statusConfig.color}>{statusConfig.label}</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t("po.quote_ref", "Basé sur devis")} {quote?.reference || 'N/A'}</p>
            </div>
          </div>
          {po.status === 'CONFIRMED' && (
            <div className="flex items-center gap-2 text-sm text-success bg-success/10 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-4 h-4" />
              {t("po.auto_confirmed", "Confirmé automatiquement après 48h")}
            </div>
          )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Separator />

          {/* Montants — le 60 / 40 n'est jamais affiché ici : calculé sur la seule
              pro forma, il laissait croire la commande validée et l'acompte fixé,
              alors que la facture finale (droits et taxes RDC, transport,
              commission) n'existait pas encore. */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{t("po.proforma_amount", "Montant de la pro forma acceptée")}</p>
              <p className="text-2xl font-bold">{Number(po.grand_total_usd).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {po.currency}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{t("po.incoterm", "Incoterm")}</p>
              <p className="text-xl font-bold">{quote?.incoterm || "—"}</p>
            </div>
          </div>
          <p className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
            {po.status === "GENERATED" || po.status === "PENDING_SIGNATURE"
              ? t(
                  "po.awaiting_final_invoice_note",
                  "Ce bon de commande n'est pas encore signé et rien n'est à payer. Alpha Import établit la facture finale détaillée (droits et taxes RDC, transport jusqu'à destination, frais) : le montant définitif, l'acompte de 60 % et le solde de 40 % y seront fixés. Sa validation, dans l'onglet « Facture & paiement », signera ce bon de commande."
                )
              : t("po.amounts_on_final_invoice", "Montant définitif, acompte de 60 % et solde de 40 % : voir la facture finale, onglet « Facture & paiement ».")}
          </p>

          {/* Timer 48h ou Statut */}
          {po.status === 'SIGNED' && timeRemaining && timeRemaining !== "EXPIRED" && (
            <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Timer className="w-6 h-6 text-warning" />
                  <div>
                    <p className="font-semibold text-warning">{t("po.cancellation_window", "Fenêtre d'annulation 48h active")}</p>
                    <p className="text-sm text-warning">{t("po.expires_in", "Expire dans")} <span className="font-mono font-bold">{timeRemaining}</span></p>
                  </div>
                </div>
                {!readOnly && canCancel && (
                  <Button variant="destructive" size="sm" onClick={handleCancel} className="whitespace-nowrap">
                    <X className="w-3 h-3 me-1" /> {t("po.cancel_now", "Annuler")}
                  </Button>
                )}
              </div>
            </div>
          )}

          {po.status === 'PENDING_SIGNATURE' && (
            <div className="p-4 bg-info/5 border border-info/20 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Signature className="w-6 h-6 text-info" />
                  <div>
                    <p className="font-semibold text-info">{t("po.action_required", "Action requise : Signature CGV")}</p>
                    <p className="text-sm text-info">{t("po.sign_to_validate", "Signez le bon de commande pour valider l'engagement")}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* CGV Acceptance Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                {t("po.cgv_section", "Conditions Générales de Vente (CGV)")}
              </h4>
              {cgvAccepted && (
                <Badge variant="default" className="bg-success/10 text-success border-success-border">
                  <CheckCircle2 className="w-3 h-3 me-1" />
                  {t("po.cgv_accepted", "Acceptées le")} {new Date(po.cgv_accepted_at).toLocaleDateString()}
                </Badge>
              )}
            </div>

            {!cgvAccepted ? (
              <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl space-y-3">
                <p className="text-sm text-warning">
                  {t(
                    "po.sign_via_invoice",
                    "La signature du bon de commande et l'acceptation des CGV se font en validant la facture finale détaillée, dans l'onglet « Facture & paiement », dès qu'Alpha Import l'a émise."
                  )}
                </p>
                <Button variant="outline" onClick={() => setShowCGV(true)} className="w-full gap-2">
                  <FileText className="w-4 h-4" />
                  {t("po.read_cgv", "Lire les CGV complètes")}
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-success/5 border border-success/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                  <div>
                    <p className="font-semibold text-success">{t("po.cgv_accepted", "CGV Acceptées")}</p>
                    <p className="text-sm text-success">{t("po.signed_with_invoice", "Bon de commande signé avec la facture finale")}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
            {onViewQuote && (
              <Button variant="outline" onClick={onViewQuote}>
                <Eye className="w-4 h-4 me-1" /> {t("po.view_quote", "Voir Devis")}
              </Button>
            )}
            {/* Le document est produit à la demande : le lien pointait
                auparavant vers un fichier qui n'a jamais existé. */}
            <Button variant="outline" asChild>
              <a href={`/api/purchase-orders/${po.id}/pdf`} target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4 me-1" /> {t("po.download_pdf", "PDF du bon de commande")}
              </a>
            </Button>
            {po.signed_po_pdf_url && (
              <Button variant="outline" asChild>
                <a href={po.signed_po_pdf_url} target="_blank" rel="noopener noreferrer">
                  <ShieldCheck className="w-4 h-4 me-1" /> {t("po.download_signed", "PDF Signé")}
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CGV Modal */}
      {showCGV && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t("po.cgv_title", "Conditions Générales de Vente AlphaIX")}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowCGV(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-6 space-y-4 text-sm">
              <div className="prose prose-sm max-w-none">
                <h4 className="font-bold text-center mb-4">ALPHA IMPORT EXCHANGE RDC - CGV</h4>
                <p className="text-center text-muted-foreground mb-6">Version 1.0 - Applicable à tous les Bons de Commande générés via la plateforme</p>
                
                <section className="space-y-2 mb-4">
                  <h5 className="font-semibold">1. OBJET ET CHAMP D'APPLICATION</h5>
                  <p>Les présentes CGV régissent tout Bon de Commande (PO) émis via la plateforme AlphaIX. Elles prévalent sur tout document contradictoire sauf accord écrit.</p>
                </section>

                <section className="space-y-2 mb-4">
                  <h5 className="font-semibold">2. FORMATION DU CONTRAT</h5>
                  <p>Le contrat est formé par l'acceptation du Devis/Proforma par l'Acheteur, générant automatiquement un PO. La signature électronique du PO (acceptation CGV + signature) vaut engagement ferme.</p>
                </section>

                <section className="space-y-2 mb-4">
                  <h5 className="font-semibold">3. DROIT DE RÉTRACTATION (48 HEURES)</h5>
                  <p>L'Acheteur dispose de <strong>48 heures</strong> après signature du PO pour l'annuler sans frais ni justification. Passé ce délai, le PO est confirmé et engage les deux parties. L'annulation se fait via l'interface ou notification écrite.</p>
                </section>

                <section className="space-y-2 mb-4">
                  <h5 className="font-semibold">4. PAIEMENT SÉCURISÉ (COMPTE SÉQUESTRE)</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>60% à la signature du PO (acompte)</li>
                    <li>40% à la présentation des documents d'expédition (B/L, Facture commerciale, Certificat origine, Packing list)</li>
                    <li>Les fonds sont bloqués sur le compte séquestre AlphaIX jusqu'à validation de chaque étape</li>
                    <li>Paiement par carte, virement, SEPA (si mandat actif) ou Mobile Money</li>
                  </ul>
                </section>

                <section className="space-y-2 mb-4">
                  <h5 className="font-semibold">5. INCOTERMS ET LOGISTIQUE</h5>
                  <p>L'Incoterm convenu (défaut FOB) détermine le partage des coûts/risques. Le Partenaire organise le transport, l'assurance (si CIF/CIP), le dédouanement export. L'Acheteur gère l'import (sauf DDP).</p>
                </section>

                <section className="space-y-2 mb-4">
                  <h5 className="font-semibold">6. INSPECTION ET CONFORMITÉ</h5>
                  <p>Inspection pré-embarquement (Pre-Shipment Inspection) incluse sauf clause contraire. Rapport d'inspection requis avant libération du solde 40%. Non-conformité = blocage paiement + résolution amiable.</p>
                </section>

                <section className="space-y-2 mb-4">
                  <h5 className="font-semibold">7. FORCE MAJEURE</h5>
                  <p>Événements imprévisibles, irrésistibles, extérieurs (guerre, catastrophe, grève, pandémie) suspendent les obligations sans pénalité. Notification sous 5 jours ouvrés.</p>
                </section>

                <section className="space-y-2 mb-4">
                  <h5 className="font-semibold">8. RÉSOLUTION DES LITIGES</h5>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Négociation de bonne foi (15 jours)</li>
                    <li>Médiation via Centre de Médiation OHADA / CCI</li>
                    <li>Tribunaux compétents (siège social AlphaIX ou domicile défendeur)</li>
                  </ol>
                </section>

                <section className="space-y-2 mb-4">
                  <h5 className="font-semibold">9. CONFIDENTIALITÉ ET DONNÉES</h5>
                  <p>Données traitées selon RGPD et loi locale. Conservées 10 ans comptables. Pas de partage tiers sans consentement sauf autorités compétentes.</p>
                </section>

                <section className="space-y-2 mb-4">
                  <h5 className="font-semibold">10. DROIT APPLICABLE</h5>
                  <p>Droit OHADA (Organisation pour l'Harmonisation en Afrique du Droit des Affaires) et droit congolais (RDC). Langue contractuelle : français.</p>
                </section>
              </div>
            </ScrollArea>
            <div className="p-4 border-t border-border flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCGV(false)}>
                {t("common.close", "Fermer")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}