"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Download, Loader2, Plus, Receipt, RotateCcw, Save, Send, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PaymentButton } from "@/components/payment-button"
import { PaymentProofDialog } from "@/components/dashboard/payment-proof-dialog"
import { CATEGORIES, LIBELLES_CATEGORIES, totauxFacture, type Categorie, type LigneFacture } from "@/lib/invoices/final"
import { formatMontant, dateFr } from "@/lib/quotes/workflow"

/**
 * Facture finale et paiement de l'acompte, pour l'administration et le client.
 *
 * - Administration : établit la facture à partir de la pro forma acceptée
 *   (droits et taxes RDC, dédouanement, transport, commission), puis l'émet.
 * - Client : la valide (vaut signature du bon de commande et des CGV) ou la
 *   conteste ; une fois validée, règle l'acompte par carte ou par virement.
 */

interface Dossier {
  vue: "ADMIN" | "BUYER"
  quote: { id: string; version: number; grand_total_usd: number; currency: string } | null
  purchaseOrder: { id: string; po_number: string; status: string; deposit_percent: number } | null
  invoice: any | null
  order: { id: string; reference: string; status: string; deposit_amount: number | null; balance_amount: number | null; deposit_paid: boolean } | null
  enCorrection: boolean
  proposition: LigneFacture[] | null
}

type LigneSaisie = { libelle: string; categorie: Categorie; montant: string }

const versSaisie = (l: LigneFacture): LigneSaisie => ({ libelle: l.libelle, categorie: l.categorie, montant: l.montant ? String(l.montant) : "" })
const nombre = (v: string) => {
  const n = parseFloat(v.replace(/\s/g, "").replace(",", "."))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0
}

export function FinalInvoicePanel({ requestId, onChange }: { requestId: string; onChange?: () => void }) {
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [lignes, setLignes] = useState<LigneSaisie[]>([])
  const [notes, setNotes] = useState("")
  const [envoi, setEnvoi] = useState<string | null>(null)
  const [cgv, setCgv] = useState(false)
  const [contestation, setContestation] = useState<string | null>(null)

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`/api/requests/${requestId}/invoice`, { cache: "no-store" })
      const corps = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(corps.error || `Erreur ${res.status}`)
      setDossier(corps)
      const source: LigneFacture[] = corps.invoice?.lines?.length ? corps.invoice.lines : corps.proposition ?? []
      setLignes(source.map(versSaisie))
      setNotes(corps.invoice?.notes ?? "")
      setErreur(null)
    } catch (e: any) {
      setErreur(e.message || "Facture indisponible")
    } finally {
      setChargement(false)
    }
  }, [requestId])

  useEffect(() => {
    charger()
  }, [charger])

  const lignesChiffrees: LigneFacture[] = useMemo(
    () => lignes.map((l) => ({ libelle: l.libelle.trim(), categorie: l.categorie, montant: nombre(l.montant) })),
    [lignes]
  )
  const pourcentage = dossier?.purchaseOrder?.deposit_percent ?? 60
  const totauxSaisie = useMemo(() => totauxFacture(lignesChiffrees, pourcentage), [lignesChiffrees, pourcentage])

  async function appeler(url: string, init: RequestInit, cle: string) {
    setEnvoi(cle)
    try {
      const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } })
      const corps = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(corps.error || `Erreur ${res.status}`)
      return corps
    } finally {
      setEnvoi(null)
    }
  }

  async function enregistrer(): Promise<string | null> {
    const aEnvoyer = lignesChiffrees.filter((l) => l.montant > 0)
    if (aEnvoyer.some((l) => l.libelle.length < 2)) {
      toast.error("Chaque ligne chiffrée doit avoir un libellé")
      return null
    }
    try {
      const corps = await appeler(
        `/api/requests/${requestId}/invoice`,
        { method: "PUT", body: JSON.stringify({ lines: aEnvoyer, notes: notes.trim() || null }) },
        "save"
      )
      return corps.invoice?.id ?? null
    } catch (e: any) {
      toast.error(e.message)
      return null
    }
  }

  async function sauvegarder() {
    if (await enregistrer()) {
      toast.success("Brouillon enregistré. Le client ne le voit pas encore.")
      await charger()
    }
  }

  async function emettre() {
    if (!window.confirm(`Émettre la facture finale au client ? Total ${formatMontant(totauxSaisie.total)}, acompte ${formatMontant(totauxSaisie.acompte)}.`)) return
    const id = await enregistrer()
    if (!id) return
    try {
      await appeler(`/api/invoices/${id}/decision`, { method: "POST", body: JSON.stringify({ action: "issue" }) }, "issue")
      toast.success("Facture émise au client.")
      await charger()
      onChange?.()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function decisionClient(action: "validate" | "contest") {
    const facture = dossier?.invoice
    if (!facture) return
    try {
      const corps = await appeler(
        `/api/invoices/${facture.id}/decision`,
        { method: "POST", body: JSON.stringify(action === "validate" ? { action, cgv_accepted: cgv } : { action, motif: contestation?.trim() }) },
        action
      )
      toast.success(
        action === "validate"
          ? `Facture validée, bon de commande signé. Acompte à régler : ${formatMontant(corps.order?.deposit_amount ?? facture.deposit_amount)}.`
          : "Votre demande de correction a été transmise à Alpha Import."
      )
      setContestation(null)
      await charger()
      onChange?.()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (chargement) {
    return (
      <section className="flex justify-center rounded-2xl border border-border bg-card p-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </section>
    )
  }
  if (erreur || !dossier) {
    return <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-destructive">{erreur}</p>
  }

  const { vue, invoice, order, purchaseOrder } = dossier
  const devise = invoice?.currency ?? dossier.quote?.currency ?? "USD"
  const modifiable = vue === "ADMIN" && (!invoice || invoice.status === "DRAFT") && !!purchaseOrder

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Receipt className="h-5 w-5 text-primary" />
            Facture finale {invoice?.number && <span className="font-mono text-sm text-muted-foreground">{invoice.number}</span>}
          </h3>
          <p className="text-sm text-muted-foreground">
            Marchandise, transport, droits et taxes RDC et frais, détaillés avant tout paiement.
          </p>
        </div>
        {invoice && (
          <Button asChild size="sm" variant="outline" className="gap-1">
            <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
              <Download className="h-3.5 w-3.5" /> PDF
            </a>
          </Button>
        )}
      </div>

      {/* Pas encore de pro forma acceptée */}
      {!purchaseOrder && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          La facture finale s&apos;établit une fois la pro forma acceptée par le client.
        </p>
      )}

      {/* Client : facture pas encore émise */}
      {vue === "BUYER" && purchaseOrder && !invoice && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {dossier.enCorrection
            ? "Alpha Import corrige la facture suite à votre demande. Vous serez notifié dès sa nouvelle émission."
            : "Alpha Import établit votre facture finale détaillée (droits et taxes RDC, transport jusqu'à destination, frais). Vous serez notifié dès son émission."}
        </p>
      )}

      {/* Administration : éditeur */}
      {modifiable && (
        <div className="space-y-4">
          {invoice?.contest_reason && (
            <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
              <span className="font-semibold">Correction demandée par le client :</span> {invoice.contest_reason}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="text-start text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 font-medium">Poste</th>
                  <th className="pb-2 font-medium">Catégorie</th>
                  <th className="pb-2 text-end font-medium">Montant ({devise})</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2 pe-2">
                      <Input
                        id={`ligne-libelle-${i}`}
                        aria-label="Libellé"
                        value={l.libelle}
                        maxLength={160}
                        onChange={(e) => setLignes((p) => p.map((x, j) => (j === i ? { ...x, libelle: e.target.value } : x)))}
                      />
                    </td>
                    <td className="py-2 pe-2">
                      <select
                        id={`ligne-categorie-${i}`}
                        aria-label="Catégorie"
                        value={l.categorie}
                        onChange={(e) => setLignes((p) => p.map((x, j) => (j === i ? { ...x, categorie: e.target.value as Categorie } : x)))}
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{LIBELLES_CATEGORIES[c]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pe-2">
                      <Input
                        id={`ligne-montant-${i}`}
                        aria-label="Montant"
                        inputMode="decimal"
                        placeholder="0"
                        className="text-end tabular-nums"
                        value={l.montant}
                        onChange={(e) => setLignes((p) => p.map((x, j) => (j === i ? { ...x, montant: e.target.value } : x)))}
                      />
                    </td>
                    <td className="py-2 text-end">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Supprimer la ligne"
                        onClick={() => setLignes((p) => p.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setLignes((p) => [...p, { libelle: "", categorie: "DOUANE", montant: "" }])}
          >
            <Plus className="h-4 w-4" /> Ajouter une ligne
          </Button>
          <p className="text-xs text-muted-foreground">
            Les postes laissés à zéro n&apos;apparaissent pas sur la facture. Saisissez les droits et taxes d&apos;après le décompte réel de la DGDA et du transitaire.
          </p>
          <div className="space-y-2">
            <label htmlFor="facture-notes" className="text-sm font-medium">Notes pour le client</label>
            <Textarea id="facture-notes" rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Recapitulatif t={totauxSaisie} devise={devise} pourcentage={pourcentage} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={sauvegarder} disabled={!!envoi} className="gap-2">
              {envoi === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer le brouillon
            </Button>
            <Button onClick={emettre} disabled={!!envoi || totauxSaisie.parCategorie.MARCHANDISE <= 0} className="gap-2">
              {envoi === "issue" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Émettre au client
            </Button>
          </div>
        </div>
      )}

      {/* Facture émise : lecture, pour l'administration et le client */}
      {invoice && invoice.status !== "DRAFT" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Émise le {dateFr(invoice.issued_at)}
            {invoice.validated_at ? ` · validée par le client le ${dateFr(invoice.validated_at)}` : " · en attente de validation du client"}
          </p>
          <LignesLecture lignes={invoice.lines} devise={devise} />
          <Recapitulatif t={invoice.totaux} devise={devise} pourcentage={pourcentage} />
          {invoice.notes && <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">{invoice.notes}</p>}

          {/* Client : décision */}
          {vue === "BUYER" && !invoice.validated_at && invoice.status === "SENT" && contestation === null && (
            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <label htmlFor="cgv-facture" className="flex items-start gap-3 text-sm">
                <input id="cgv-facture" type="checkbox" checked={cgv} onChange={(e) => setCgv(e.target.checked)} className="mt-1 h-4 w-4" />
                <span>
                  J&apos;ai vérifié cette facture et j&apos;accepte les{" "}
                  <Link href="/terms" target="_blank" className="font-medium text-primary underline">conditions générales de vente</Link>.
                  Sa validation vaut signature du bon de commande {purchaseOrder?.po_number}.
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => decisionClient("validate")} disabled={!cgv || !!envoi} className="gap-2">
                  {envoi === "validate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Valider la facture et signer le bon de commande
                </Button>
                <Button variant="outline" onClick={() => setContestation("")} disabled={!!envoi} className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Demander une correction
                </Button>
              </div>
            </div>
          )}
          {vue === "BUYER" && contestation !== null && (
            <div className="space-y-2">
              <label htmlFor="motif-facture" className="text-sm font-medium">Ce qui doit être corrigé</label>
              <Textarea id="motif-facture" rows={3} maxLength={1000} value={contestation} onChange={(e) => setContestation(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={() => decisionClient("contest")} disabled={!!envoi || (contestation?.trim().length ?? 0) < 3}>Envoyer</Button>
                <Button variant="ghost" onClick={() => setContestation(null)}>Annuler</Button>
              </div>
            </div>
          )}

          {/* Paiement de l'acompte */}
          {invoice.validated_at && order && (
            <div className="space-y-3 rounded-xl border border-border p-4">
              <p className="text-sm font-semibold">Commande {order.reference}</p>
              {order.deposit_paid ? (
                <p className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" /> Acompte reçu — le partenaire peut lancer l&apos;achat.
                </p>
              ) : vue === "BUYER" && order.status === "AWAITING_DEPOSIT" && Number(order.deposit_amount) > 0 ? (
                <>
                  <p className="text-sm">
                    Acompte de {pourcentage} % à régler : <span className="font-semibold">{formatMontant(order.deposit_amount, devise)}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <PaymentButton orderId={order.id} paymentType="DEPOSIT_60" amount={Number(order.deposit_amount)} />
                    <PaymentProofDialog orderId={order.id} orderReference={order.reference} onUploaded={charger} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Par carte (paiement sécurisé Stripe) ou par virement : déposez la preuve, Alpha Import la vérifie.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Acompte attendu : {formatMontant(order.deposit_amount, devise)} — statut de la commande : {order.status}.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function LignesLecture({ lignes, devise }: { lignes: LigneFacture[]; devise: string }) {
  return (
    <div className="space-y-3">
      {CATEGORIES.filter((c) => lignes.some((l) => l.categorie === c)).map((c) => (
        <div key={c}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{LIBELLES_CATEGORIES[c]}</p>
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">
            {lignes.filter((l) => l.categorie === c).map((l, i) => (
              <li key={i} className="flex justify-between gap-4 px-3 py-2">
                <span>{l.libelle}</span>
                <span className="tabular-nums">{formatMontant(l.montant, devise)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function Recapitulatif({ t, devise, pourcentage }: { t: ReturnType<typeof totauxFacture>; devise: string; pourcentage: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl bg-foreground p-4 text-background">
        <p className="text-xs uppercase tracking-wide opacity-70">Total</p>
        <p className="text-xl font-bold tabular-nums">{formatMontant(t.total, devise)}</p>
      </div>
      <div className="rounded-xl border border-primary/40 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Acompte {pourcentage} %</p>
        <p className="text-xl font-bold tabular-nums text-primary">{formatMontant(t.acompte, devise)}</p>
      </div>
      <div className="rounded-xl border border-border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Solde {100 - pourcentage} %</p>
        <p className="text-xl font-bold tabular-nums">{formatMontant(t.solde, devise)}</p>
      </div>
    </div>
  )
}
