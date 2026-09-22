"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, FileText, Loader2, PenSquare, RotateCcw, Send, Undo2, Download } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { QuoteSubmissionForm } from "@/components/dashboard/quote-submission-form"
import { CHAMPS_FRAIS, MOTIF_MIN, formatMontant, dateFr } from "@/lib/quotes/workflow"

/**
 * Pro formas d'une demande, pour les trois espaces.
 *
 * - Partenaire : prépare une pro forma, qui part en validation chez Alpha Import.
 * - Administration : valide et transmet au client, ou renvoie au partenaire.
 * - Client : accepte (le bon de commande est généré) ou demande une révision.
 *
 * Toutes les décisions passent par /api/quotes/[id]/decision.
 */

type Vue = "ADMIN" | "PARTNER" | "BUYER"

interface ProForma {
  id: string
  version: number
  status: string
  currency: string | null
  unit_price_usd: number
  quantity: number
  subtotal_usd: number | null
  total_fees_usd: number | null
  grand_total_usd: number | null
  incoterm: string | null
  port_loading: string | null
  port_discharge: string | null
  estimated_transit_days: number | null
  valid_until: string | null
  submitted_at: string | null
  created_at: string
  rejected_reason: string | null
  notes: string | null
  payment_terms: string | null
  expiree?: boolean
  [cle: string]: unknown
}

const LIBELLES_FRAIS: Record<string, string> = {
  freight_cost_usd: "Fret",
  insurance_cost_usd: "Assurance",
  customs_duty_estimate_usd: "Droits estimés",
  inspection_cost_usd: "Inspection",
  handling_fees_usd: "Manutention",
  other_fees_usd: "Autres frais",
}

/** Libellé et ton de chaque statut, formulés pour la personne qui regarde. */
function etat(q: ProForma, vue: Vue): { label: string; ton: "neutre" | "attente" | "ok" | "alerte" } {
  if (q.status === "SUBMITTED" && q.expiree) return { label: "Expirée", ton: "alerte" }
  switch (q.status) {
    case "DRAFT":
      return { label: vue === "ADMIN" ? "À valider" : "En validation chez Alpha Import", ton: "attente" }
    case "SUBMITTED":
      return { label: vue === "BUYER" ? "En attente de votre réponse" : "Transmise au client", ton: "attente" }
    case "ACCEPTED":
      return { label: "Acceptée", ton: "ok" }
    case "REVISED":
      return { label: q.rejected_reason?.startsWith("Remplacée") ? "Remplacée" : "Révision demandée", ton: "neutre" }
    case "REJECTED":
      return { label: "Renvoyée au partenaire", ton: "alerte" }
    case "EXPIRED":
      return { label: "Expirée", ton: "alerte" }
    default:
      return { label: q.status, ton: "neutre" }
  }
}

const TONS: Record<string, string> = {
  neutre: "bg-muted text-muted-foreground",
  attente: "bg-warning/15 text-warning",
  ok: "bg-success/15 text-success",
  alerte: "bg-destructive/10 text-destructive",
}

const nombre = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

export function ProformaPanel({ requestId, requestData, onChange }: { requestId: string; requestData: any; onChange?: () => void }) {
  const [vue, setVue] = useState<Vue | null>(null)
  const [quotes, setQuotes] = useState<ProForma[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [formulaire, setFormulaire] = useState(false)
  const [envoi, setEnvoi] = useState<string | null>(null)
  const [motifPour, setMotifPour] = useState<{ id: string; action: "return" | "revise" } | null>(null)
  const [motif, setMotif] = useState("")

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`/api/requests/${requestId}/quote`, { cache: "no-store" })
      const corps = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(corps.error || `Erreur ${res.status}`)
      setVue(corps.vue)
      setQuotes(corps.quotes ?? [])
      setErreur(null)
    } catch (e: any) {
      setErreur(e.message || "Pro formas indisponibles")
    } finally {
      setChargement(false)
    }
  }, [requestId])

  useEffect(() => {
    charger()
  }, [charger])

  async function creer(donnees: any) {
    const corps = {
      unit_price_usd: nombre(donnees.unit_price_usd),
      quantity: Math.round(nombre(donnees.quantity)),
      currency: donnees.currency || "USD",
      ...Object.fromEntries(CHAMPS_FRAIS.map((c) => [c, nombre(donnees[c])])),
      incoterm: donnees.incoterm,
      port_loading: donnees.port_loading || null,
      port_discharge: donnees.port_discharge || null,
      estimated_transit_days: donnees.estimated_transit_days ? Math.round(nombre(donnees.estimated_transit_days)) : null,
      estimated_departure_date: donnees.estimated_departure_date || null,
      estimated_arrival_date: donnees.estimated_arrival_date || null,
      payment_terms: donnees.payment_terms,
      validity_days: Math.round(nombre(donnees.validity_days)) || 30,
      specifications_json: donnees.specifications_json && Object.keys(donnees.specifications_json).length ? donnees.specifications_json : null,
      notes: donnees.notes || null,
    }
    const res = await fetch(`/api/requests/${requestId}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    })
    const reponse = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(reponse.error || `Erreur ${res.status}`)
    toast.success("Pro forma soumise : Alpha Import la vérifie avant de la transmettre au client.")
    setFormulaire(false)
    await charger()
    onChange?.()
  }

  async function decider(id: string, action: "approve" | "return" | "accept" | "revise", texte?: string) {
    setEnvoi(`${id}:${action}`)
    try {
      const res = await fetch(`/api/quotes/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, motif: texte }),
      })
      const corps = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(corps.error || `Erreur ${res.status}`)
      const messages = {
        approve: "Pro forma validée et transmise au client.",
        return: "Pro forma renvoyée au partenaire.",
        accept: corps.purchase_order
          ? `Pro forma acceptée. Bon de commande ${corps.purchase_order.po_number} généré.`
          : "Pro forma acceptée.",
        revise: "Demande de révision envoyée au partenaire.",
      }
      toast.success(messages[action])
      setMotifPour(null)
      setMotif("")
      await charger()
      onChange?.()
    } catch (e: any) {
      toast.error(e.message || "Décision non enregistrée")
    } finally {
      setEnvoi(null)
    }
  }

  const brouillonEnAttente = quotes.some((q) => q.status === "DRAFT")
  const acceptee = quotes.some((q) => q.status === "ACCEPTED")
  const peutPreparer = (vue === "PARTNER" || vue === "ADMIN") && !brouillonEnAttente && !acceptee && !!requestData?.assigned_partner_id

  if (formulaire) {
    return (
      <QuoteSubmissionForm
        requestId={requestId}
        requestData={requestData}
        onSubmit={creer}
        onCancel={() => setFormulaire(false)}
      />
    )
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-5 w-5 text-primary" />
            Pro forma
          </h3>
          <p className="text-sm text-muted-foreground">
            {vue === "BUYER"
              ? "Chiffrage de votre partenaire sur place, vérifié par Alpha Import."
              : "Le partenaire prépare, Alpha Import valide, le client accepte ou demande une révision."}
          </p>
        </div>
        {peutPreparer && (
          <Button onClick={() => setFormulaire(true)} className="gap-2">
            <PenSquare className="h-4 w-4" />
            {quotes.length ? "Préparer une nouvelle version" : "Préparer la pro forma"}
          </Button>
        )}
      </div>

      {vue === "ADMIN" && !requestData?.assigned_partner_id && (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Assignez d'abord un partenaire : c'est lui qui chiffre la demande.
        </p>
      )}

      {chargement ? (
        <div className="flex justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : erreur ? (
        <p className="py-6 text-center text-sm text-destructive">{erreur}</p>
      ) : quotes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {vue === "BUYER"
            ? "Votre partenaire prépare le chiffrage. Vous serez notifié dès que la pro forma aura été vérifiée par Alpha Import. Précisez votre besoin dans la discussion en attendant."
            : vue === "PARTNER"
              ? "Aucune pro forma. Échangez avec le client dans la discussion si la demande manque de précisions, puis préparez la pro forma."
              : "Aucune pro forma pour l'instant."}
        </p>
      ) : (
        <ul className="space-y-3">
          {quotes.map((q, i) => {
            const e = etat(q, vue ?? "BUYER")
            const devise = q.currency ?? "USD"
            const frais = CHAMPS_FRAIS.filter((c) => nombre(q[c]) > 0)
            const ouvert = i === 0 || q.status === "DRAFT" || q.status === "SUBMITTED" || q.status === "ACCEPTED"
            const saisieMotif = motifPour?.id === q.id
            return (
              <li key={q.id} className="rounded-xl border border-border">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      Version {q.version} · {formatMontant(q.grand_total_usd, devise)}
                      {q.incoterm && <span className="ms-2 text-xs font-normal text-muted-foreground">{q.incoterm}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {q.submitted_at ? `Transmise le ${dateFr(q.submitted_at)}` : `Préparée le ${dateFr(q.created_at)}`}
                      {q.valid_until && ` · valable jusqu'au ${dateFr(q.valid_until)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${TONS[e.ton]}`}>{e.label}</span>
                    <Button asChild size="sm" variant="outline" className="gap-1">
                      <a href={`/api/quotes/${q.id}/pdf`} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3.5 w-3.5" /> PDF
                      </a>
                    </Button>
                  </div>
                </div>

                {ouvert && (
                  <div className="space-y-4 border-t border-border p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[360px] text-sm">
                        <tbody className="[&_td]:py-1.5">
                          <tr>
                            <td className="text-muted-foreground">
                              Marchandise — {q.quantity} × {formatMontant(q.unit_price_usd, devise)}
                            </td>
                            <td className="text-end tabular-nums">{formatMontant(q.subtotal_usd, devise)}</td>
                          </tr>
                          {frais.map((c) => (
                            <tr key={c}>
                              <td className="text-muted-foreground">{LIBELLES_FRAIS[c]}</td>
                              <td className="text-end tabular-nums">{formatMontant(q[c], devise)}</td>
                            </tr>
                          ))}
                          <tr className="border-t border-border font-semibold">
                            <td className="pt-2">Total pro forma</td>
                            <td className="pt-2 text-end tabular-nums text-primary">{formatMontant(q.grand_total_usd, devise)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[q.port_loading && `Embarquement : ${q.port_loading}`, q.port_discharge && `Débarquement : ${q.port_discharge}`, q.estimated_transit_days && `Transit ≈ ${q.estimated_transit_days} j`]
                        .filter(Boolean)
                        .join(" · ") || "Logistique à préciser"}
                    </p>
                    {q.payment_terms && <p className="text-xs"><span className="text-muted-foreground">Paiement :</span> {q.payment_terms}</p>}
                    {q.notes && <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">{q.notes}</p>}
                    {q.rejected_reason && (q.status === "REJECTED" || q.status === "REVISED") && (
                      <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
                        <span className="font-semibold">Motif :</span> {q.rejected_reason}
                      </p>
                    )}
                    {vue === "BUYER" && q.status === "SUBMITTED" && !q.expiree && (
                      <p className="text-xs text-muted-foreground">
                        Pro forma indicative : droits et taxes RDC, transport jusqu'à destination et commission figureront sur la facture finale, émise avant tout paiement.
                      </p>
                    )}

                    {/* Décisions */}
                    {vue === "ADMIN" && q.status === "DRAFT" && !saisieMotif && (
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => decider(q.id, "approve")} disabled={!!envoi} className="gap-2">
                          {envoi === `${q.id}:approve` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Valider et transmettre au client
                        </Button>
                        <Button variant="outline" onClick={() => setMotifPour({ id: q.id, action: "return" })} disabled={!!envoi} className="gap-2">
                          <Undo2 className="h-4 w-4" /> Renvoyer au partenaire
                        </Button>
                      </div>
                    )}
                    {vue === "BUYER" && (q.status === "SUBMITTED" || q.status === "EXPIRED") && !saisieMotif && (
                      <div className="flex flex-wrap gap-2">
                        {q.status === "SUBMITTED" && !q.expiree && (
                          <Button
                            onClick={() => {
                              if (window.confirm(`Accepter la pro forma v${q.version} (${formatMontant(q.grand_total_usd, devise)}) ? Un bon de commande sera généré.`)) {
                                decider(q.id, "accept")
                              }
                            }}
                            disabled={!!envoi}
                            className="gap-2"
                          >
                            {envoi === `${q.id}:accept` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Accepter la pro forma
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => setMotifPour({ id: q.id, action: "revise" })} disabled={!!envoi} className="gap-2">
                          <RotateCcw className="h-4 w-4" /> Demander une révision
                        </Button>
                      </div>
                    )}
                    {saisieMotif && (
                      <div className="space-y-2">
                        <label htmlFor={`motif-${q.id}`} className="text-sm font-medium">
                          {motifPour?.action === "return" ? "Ce que le partenaire doit corriger" : "Ce que vous souhaitez modifier"}
                        </label>
                        <Textarea
                          id={`motif-${q.id}`}
                          value={motif}
                          onChange={(ev) => setMotif(ev.target.value)}
                          rows={3}
                          maxLength={1000}
                          placeholder={motifPour?.action === "return" ? "Ex. : fret à justifier, incoterm CIF attendu…" : "Ex. : couleur noire, livraison à Matadi, prix trop élevé…"}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => decider(q.id, motifPour!.action, motif.trim())}
                            disabled={!!envoi || motif.trim().length < MOTIF_MIN}
                          >
                            {envoi ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                            Envoyer
                          </Button>
                          <Button variant="ghost" onClick={() => { setMotifPour(null); setMotif("") }} disabled={!!envoi}>
                            Annuler
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
