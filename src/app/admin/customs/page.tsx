"use client"

import { useState, useEffect, useCallback } from "react"
import { useLanguage } from "@/lib/i18n-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, Loader2, Package, RefreshCw, Ship, Plane, Truck } from "lucide-react"
import { toast } from "sonner"
import { tone } from "@/lib/design/tone"
import { getStatusLabel } from "@/lib/customs/status-display"
import { allowedNextStatuses } from "@/lib/customs/transition-matrix"
import type { CustomsFileStatus } from "@/lib/customs/types"

/**
 * Dossiers douaniers — back-office.
 *
 * Cette page interrogeait `tracking_events` et `orders` en direct, alors que le
 * module douanier expose déjà ses routes : /api/customs/files, son changement
 * de statut et sa nomenclature de taxes. Le backend n'avait donc aucun
 * consommateur, et l'écran montrait autre chose que le dossier douanier.
 *
 * Les transitions proposées viennent de la matrice partagée : on n'offre que ce
 * que le rôle peut faire. Le serveur revérifie systématiquement — la matrice
 * reste la seule vérité, l'interface n'en est qu'un reflet.
 */

type DossierDouanier = {
  id: string
  order_id: string | null
  order_reference: string | null
  country_code: string | null
  transport_mode: "AIR" | "SEA" | "LAND" | null
  transport_ref: string | null
  vessel_flight_name: string | null
  container_number: string | null
  status: CustomsFileStatus
  updated_at: string | null
  created_at: string | null
}

const TONALITE_PAR_STATUT: Record<CustomsFileStatus, Parameters<typeof tone>[0]> = {
  DRAFT: "neutral",
  PRE_ADVICE: "info",
  IN_CUSTOMS: "info",
  LIQUIDATED: "brand",
  PAID: "success",
  RELEASED: "success",
  BLOCKED: "danger",
}

const STATUTS: CustomsFileStatus[] = [
  "DRAFT",
  "PRE_ADVICE",
  "IN_CUSTOMS",
  "LIQUIDATED",
  "PAID",
  "RELEASED",
  "BLOCKED",
]

const ICONE_TRANSPORT = { AIR: Plane, SEA: Ship, LAND: Truck } as const

export default function AdminCustomsPage() {
  const { t } = useLanguage()

  const [dossiers, setDossiers] = useState<DossierDouanier[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [filtre, setFiltre] = useState<CustomsFileStatus | "ALL">("ALL")
  const [recherche, setRecherche] = useState("")

  const [cible, setCible] = useState<{ dossier: DossierDouanier; statut: CustomsFileStatus } | null>(null)
  const [motif, setMotif] = useState("")
  const [envoi, setEnvoi] = useState(false)

  // Le middleware réserve /admin au rôle ADMIN : les transitions proposées
  // sont donc celles de ce rôle.
  const role = "ADMIN"

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur(null)
    try {
      const res = await fetch("/api/customs/files")
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setErreur(
          res.status === 401 || res.status === 403
            ? t("admin.customs.forbidden", "Session expirée ou droits insuffisants.")
            : (json?.error as string) ??
                t("admin.customs.load_error", "Les dossiers douaniers n'ont pas pu être chargés.")
        )
        return
      }
      setDossiers(Array.isArray(json?.files) ? json.files : [])
    } catch {
      setErreur(t("admin.customs.unreachable", "Le service douanier est injoignable."))
    } finally {
      setChargement(false)
    }
  }, [t])

  useEffect(() => {
    charger()
  }, [charger])

  async function appliquerTransition() {
    if (!cible) return
    const exigeMotif = cible.statut === "BLOCKED"
    if (exigeMotif && motif.trim().length < 3) {
      toast.error(t("admin.customs.reason_required", "Un blocage doit être motivé."))
      return
    }

    setEnvoi(true)
    try {
      const res = await fetch(`/api/customs/files/${cible.dossier.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: cible.statut,
          ...(motif.trim() ? { reason: motif.trim() } : {}),
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error((json?.error as string) ?? t("admin.customs.transition_failed", "Transition refusée."))
        return
      }
      toast.success(
        t("admin.customs.transition_done", "Dossier passé en ") + getStatusLabel(cible.statut)
      )
      setCible(null)
      setMotif("")
      await charger()
    } catch {
      toast.error(t("admin.customs.unreachable", "Le service douanier est injoignable."))
    } finally {
      setEnvoi(false)
    }
  }

  const q = recherche.trim().toLowerCase()
  const visibles = dossiers
    .filter((d) => filtre === "ALL" || d.status === filtre)
    .filter(
      (d) =>
        !q ||
        (d.order_reference ?? "").toLowerCase().includes(q) ||
        (d.container_number ?? "").toLowerCase().includes(q) ||
        (d.transport_ref ?? "").toLowerCase().includes(q) ||
        (d.vessel_flight_name ?? "").toLowerCase().includes(q)
    )

  const compteurs = STATUTS.map((s) => ({
    statut: s,
    n: dossiers.filter((d) => d.status === s).length,
  }))

  if (chargement) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (erreur) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[60vh] px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-destructive-subtle border border-destructive-border flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground max-w-md">{erreur}</p>
        <Button onClick={charger} variant="outline">
          {t("admin.customs.retry", "Réessayer")}
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">{t("admin.customs.title", "Dossiers douaniers")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("admin.customs.subtitle", "Suivi du dédouanement, de la pré-alerte à la mainlevée")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={charger} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          {t("admin.customs.refresh", "Actualiser")}
        </Button>
      </div>

      {/* Répartition par statut, cliquable pour filtrer */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {compteurs.map(({ statut, n }) => {
          const actif = filtre === statut
          const couleurs = tone(TONALITE_PAR_STATUT[statut])
          return (
            <button
              key={statut}
              onClick={() => setFiltre(actif ? "ALL" : statut)}
              className={`rounded-xl border p-3 text-start transition-colors ${
                actif ? couleurs.surface : "bg-muted/30 border-border hover:bg-muted/50"
              }`}
            >
              <p className="t-label text-muted-foreground mb-1">{getStatusLabel(statut)}</p>
              <p className={`text-xl font-bold ${actif ? couleurs.text : "text-foreground"}`}>{n}</p>
            </button>
          )
        })}
      </div>

      <Input
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder={t("admin.customs.search", "Référence, conteneur, navire ou vol…")}
        className="max-w-md"
      />

      {visibles.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl">
          <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-semibold text-muted-foreground">
            {dossiers.length === 0
              ? t("admin.customs.empty", "Aucun dossier douanier ouvert")
              : t("admin.customs.no_match", "Aucun dossier ne correspond")}
          </h3>
        </div>
      ) : (
        <div className="space-y-3">
          {visibles.map((d) => {
            const couleurs = tone(TONALITE_PAR_STATUT[d.status])
            const suites = allowedNextStatuses(d.status, role)
            const Icone = d.transport_mode ? ICONE_TRANSPORT[d.transport_mode] : Package
            return (
              <div
                key={d.id}
                className="bg-muted/30 border border-border p-4 rounded-xl flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icone className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold">
                        {d.order_reference ?? t("admin.customs.no_reference", "Sans référence")}
                      </span>
                      <Badge className={couleurs.badge}>{getStatusLabel(d.status)}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {d.container_number && <span className="font-mono">{d.container_number}</span>}
                      {d.vessel_flight_name && <span>{d.vessel_flight_name}</span>}
                      {d.country_code && <span>{d.country_code}</span>}
                      {d.updated_at && (
                        <span>{new Date(d.updated_at).toLocaleDateString("fr-FR")}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {suites.length === 0 ? (
                    <span className="t-label text-muted-foreground">
                      {t("admin.customs.terminal", "Aucune suite possible")}
                    </span>
                  ) : (
                    suites.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={s === "BLOCKED" ? "destructive" : "outline"}
                        onClick={() => {
                          setCible({ dossier: d, statut: s })
                          setMotif("")
                        }}
                      >
                        {getStatusLabel(s)}
                      </Button>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={!!cible} onOpenChange={(ouvert) => !ouvert && setCible(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("admin.customs.confirm_title", "Changer le statut du dossier")}
            </DialogTitle>
            <DialogDescription>
              {cible && (
                <>
                  {getStatusLabel(cible.dossier.status)} → {getStatusLabel(cible.statut)}
                  {cible.dossier.order_reference ? ` · ${cible.dossier.order_reference}` : ""}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="t-label text-muted-foreground">
              {cible?.statut === "BLOCKED"
                ? t("admin.customs.reason_label", "Motif du blocage (obligatoire)")
                : t("admin.customs.note_label", "Note (facultative)")}
            </label>
            <Input
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder={t("admin.customs.reason_placeholder", "Ex. : documents manquants à l'arrivée")}
            />
            {cible?.statut === "BLOCKED" && (
              <p className="text-xs text-muted-foreground">
                {t(
                  "admin.customs.reason_help",
                  "Un blocage arrête la marchandise : le motif est la seule trace de la raison."
                )}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCible(null)} disabled={envoi}>
              {t("admin.customs.cancel", "Annuler")}
            </Button>
            <Button onClick={appliquerTransition} disabled={envoi}>
              {envoi && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t("admin.customs.confirm", "Confirmer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
