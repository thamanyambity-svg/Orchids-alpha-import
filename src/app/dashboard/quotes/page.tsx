"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { FileSignature, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard/header"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/lib/i18n-context"
import { estExpiree, formatMontant, dateFr } from "@/lib/quotes/workflow"

/**
 * Toutes les pro formas reçues par le client, toutes demandes confondues.
 *
 * Elles n'étaient visibles qu'à l'intérieur de chaque demande (onglet
 * « Devis / Proforma ») : aucune entrée du menu n'y menait, et un client
 * notifié ne savait pas où la trouver. Seules les pro formas transmises par
 * Alpha Import sont listées ; chacune ouvre directement le bon onglet.
 */

interface Ligne {
  id: string
  version: number
  status: string
  grand_total_usd: number | null
  currency: string | null
  valid_until: string | null
  submitted_at: string
  request_id: string
  import_requests: { reference: string; product_name: string | null } | null
}

function etat(q: Ligne): { label: string; classes: string; attente: boolean } {
  if (q.status === "SUBMITTED" && estExpiree(q)) return { label: "Expirée", classes: "bg-destructive/10 text-destructive", attente: false }
  switch (q.status) {
    case "SUBMITTED":
      return { label: "En attente de votre réponse", classes: "bg-warning/15 text-warning", attente: true }
    case "ACCEPTED":
      return { label: "Acceptée", classes: "bg-success/15 text-success", attente: false }
    case "REVISED":
      return { label: "Révision demandée", classes: "bg-muted text-muted-foreground", attente: false }
    case "EXPIRED":
      return { label: "Expirée", classes: "bg-destructive/10 text-destructive", attente: false }
    default:
      return { label: q.status, classes: "bg-muted text-muted-foreground", attente: false }
  }
}

export default function DashboardQuotesPage() {
  const { t } = useLanguage()
  const [lignes, setLignes] = useState<Ligne[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    createClient()
      .from("quotes")
      .select("id, version, status, grand_total_usd, currency, valid_until, submitted_at, request_id, import_requests!inner(reference, product_name)")
      // Une pro forma n'est visible du client qu'une fois validée par Alpha Import.
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .then(({ data }) => {
        setLignes(((data ?? []) as any[]).map((q) => ({ ...q, import_requests: Array.isArray(q.import_requests) ? q.import_requests[0] : q.import_requests })))
        setChargement(false)
      })
  }, [])

  const enAttente = lignes.filter((q) => etat(q).attente).length

  return (
    <div>
      <DashboardHeader
        title={t("dashboard.quotes.title", "Pro formas")}
        subtitle={
          enAttente > 0
            ? `${enAttente} pro forma${enAttente > 1 ? "s" : ""} en attente de votre réponse`
            : t("dashboard.quotes.subtitle", "Chiffrages de vos partenaires, vérifiés par Alpha Import")
        }
      />
      <div className="space-y-3 p-6">
        {chargement ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : lignes.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
            <FileSignature className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-30" />
            <h3 className="font-semibold text-muted-foreground">{t("dashboard.quotes.empty", "Aucune pro forma pour l'instant")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.quotes.empty_hint", "Votre partenaire chiffre vos demandes ; chaque pro forma apparaîtra ici après vérification par Alpha Import.")}
            </p>
          </div>
        ) : (
          lignes.map((q) => {
            const e = etat(q)
            return (
              <div
                key={q.id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 ${e.attente ? "border-warning/40" : "border-border"}`}
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {q.import_requests?.product_name || "Demande"} <span className="font-mono text-xs text-muted-foreground">{q.import_requests?.reference}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Version {q.version} · reçue le {dateFr(q.submitted_at)}
                    {q.valid_until && ` · valable jusqu'au ${dateFr(q.valid_until)}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-lg font-bold tabular-nums">{formatMontant(q.grand_total_usd, q.currency ?? "USD")}</span>
                  <span className={`rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${e.classes}`}>{e.label}</span>
                  <Button asChild size="sm" variant={e.attente ? "default" : "outline"} className="gap-1">
                    <Link href={`/dashboard/requests/${q.request_id}?onglet=quotes`}>
                      {e.attente ? "Répondre" : "Ouvrir"} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
