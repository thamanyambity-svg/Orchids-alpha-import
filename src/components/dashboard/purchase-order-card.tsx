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
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface PurchaseOrderCardProps {
  po: any
  quote: any
  request: any
  onCancel?: () => void
  onViewQuote?: () => void
  readOnly?: boolean
}

export function PurchaseOrderCard({ po, quote, request, onCancel, onViewQuote, readOnly = false }: PurchaseOrderCardProps) {
  const { t } = useLanguage()
  const [isSigning, setIsSigning] = useState(false)
  const [showCGV, setShowCGV] = useState(false)
  const [cgvAccepted, setCgvAccepted] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string>("")
  const supabase = createClient()

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
        return { label: t("po.status.generated", "Généré"), color: "bg-muted text-muted-foreground", icon: FileText }
      case 'PENDING_SIGNATURE':
        return { label: t("po.status.pending_signature", "En attente signature"), color: "bg-amber-500/10 text-amber-700 border-amber-200", icon: AlertCircle }
      case 'SIGNED':
        return { label: t("po.status.signed", "Signé (48h)"), color: "bg-blue-500/10 text-blue-700 border-blue-200", icon: CheckCircle2 }
      case 'CONFIRMED':
        return { label: t("po.status.confirmed", "Confirmé"), color: "bg-green-500/10 text-green-700 border-green-200", icon: ShieldCheck }
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

  const handleSignCGV = async () => {
    if (!cgvAccepted) {
      toast.error(t("po.accept_cgv_first", "Vous devez accepter les CGV avant de signer"))
      return
    }
    setIsSigning(true)
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'SIGNED',
          cgv_accepted_at: new Date().toISOString(),
          cgv_accepted_ip: 'auto', // Will be filled by server
          cgv_accepted_user_agent: navigator.userAgent,
          updated_at: new Date().toISOString()
        })
        .eq('id', po.id)
      
      if (error) throw error
      
      toast.success(t("po.signed_success", "Bon de commande signé ! Délai rétractation 48h démarré."))
      setCgvAccepted(true)
      // Refresh po data would happen via parent
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSigning(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm(t("po.confirm_cancel", "Confirmer l'annulation dans les 48h ? Cette action est irréversible."))) return
    if (onCancel) onCancel()
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  return (
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
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-500/10 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-4 h-4" />
              {t("po.auto_confirmed", "Confirmé automatiquement après 48h")}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <Separator />

          {/* Montants */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4 bg-card border border-border rounded-xl">
              <p className="text-sm text-muted-foreground">{t("po.grand_total", "Total Final")}</p>
              <p className="text-2xl font-bold">${Number(po.grand_total_usd).toLocaleString()} {po.currency}</p>
            </div>
            <div className="p-4 bg-card border border-border rounded-xl">
              <p className="text-sm text-muted-foreground">{t("po.deposit", "Acompte (60%)")}</p>
              <p className="text-2xl font-bold text-primary">${Number(po.deposit_amount_usd).toLocaleString()} {po.currency}</p>
            </div>
            <div className="p-4 bg-card border border-border rounded-xl">
              <p className="text-sm text-muted-foreground">{t("po.balance", "Solde (40%)")}</p>
              <p className="text-2xl font-bold text-amber-600">${Number(po.balance_amount_usd).toLocaleString()} {po.currency}</p>
            </div>
            <div className="p-4 bg-card border border-border rounded-xl">
              <p className="text-sm text-muted-foreground">{t("po.incoterm", "Incoterm")}</p>
              <p className="text-xl font-bold">{quote?.incoterm || 'FOB'}</p>
            </div>
          </div>

          {/* Timer 48h ou Statut */}
          {po.status === 'SIGNED' && timeRemaining && timeRemaining !== "EXPIRED" && (
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Timer className="w-6 h-6 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-700">{t("po.cancellation_window", "Fenêtre d'annulation 48h active")}</p>
                    <p className="text-sm text-amber-600">{t("po.expires_in", "Expire dans")} <span className="font-mono font-bold">{timeRemaining}</span></p>
                  </div>
                </div>
                {!readOnly && canCancel && (
                  <Button variant="destructive" size="sm" onClick={handleCancel} className="whitespace-nowrap">
                    <X className="w-3 h-3 mr-1" /> {t("po.cancel_now", "Annuler")}
                  </Button>
                )}
              </div>
            </div>
          )}

          {po.status === 'PENDING_SIGNATURE' && (
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Signature className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-700">{t("po.action_required", "Action requise : Signature CGV")}</p>
                    <p className="text-sm text-blue-600">{t("po.sign_to_validate", "Signez le bon de commande pour valider l'engagement")}</p>
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
                <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {t("po.cgv_accepted", "Acceptées le")} {new Date(po.cgv_accepted_at).toLocaleDateString()}
                </Badge>
              )}
            </div>

            {!cgvAccepted ? (
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
                <p className="text-sm text-amber-700">
                  {t("po.cgv_must_accept", "Vous devez accepter les CGV AlphaIX pour signer le bon de commande.")}
                </p>
                <Button variant="outline" onClick={() => setShowCGV(true)} className="w-full gap-2">
                  <FileText className="w-4 h-4" />
                  {t("po.read_cgv", "Lire les CGV complètes")}
                </Button>
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <input
                    type="checkbox"
                    onChange={(e) => setCgvAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 text-primary border-amber-500 rounded"
                  />
                  <div className="text-sm">
                    <span className="font-medium text-amber-700">{t("po.i_accept_cgv", "J'accepte les CGV AlphaIX")}</span>
                    <p className="text-amber-600 mt-1">{t("po.cgv_implication", "Cela inclut : paiement sécurisé séquestre, 60/40, annulation 48h, inspection, médiation litiges.")}</p>
                  </div>
                </label>
              </div>
            ) : (
              <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-700">{t("po.cgv_accepted", "CGV Acceptées")}</p>
                    <p className="text-sm text-green-600">{t("po.ready_to_sign", "Vous pouvez maintenant signer le bon de commande")}</p>
                  </div>
                </div>
                {!readOnly && po.status !== 'CONFIRMED' && po.status !== 'CANCELLED' && (
                  <Button onClick={handleSignCGV} disabled={isSigning} className="gap-2" size="lg">
                    {isSigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Signature className="w-4 h-4" />}
                    {t("po.sign_po", "Signer le Bon de Commande")}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
            {onViewQuote && (
              <Button variant="outline" onClick={onViewQuote}>
                <Eye className="w-4 h-4 mr-1" /> {t("po.view_quote", "Voir Devis")}
              </Button>
            )}
            <Button variant="outline" asChild>
              <a href={po.po_pdf_url} target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4 mr-1" /> {t("po.download_pdf", "PDF PO")}
              </a>
            </Button>
            {po.signed_po_pdf_url && (
              <Button variant="outline" asChild>
                <a href={po.signed_po_pdf_url} target="_blank" rel="noopener noreferrer">
                  <ShieldCheck className="w-4 h-4 mr-1" /> {t("po.download_signed", "PDF Signé")}
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