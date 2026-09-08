"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Check, Loader2, RefreshCw, RotateCcw, ServerCrash } from "lucide-react"
import { toast } from "sonner"
import { tone } from "@/lib/design/tone"

/**
 * Incidents — back-office.
 *
 * Jusqu'ici une exception en production ne laissait aucune trace consultable :
 * les frontières d'erreur appelaient `console.error`, dont la sortie n'est ni
 * cherchable ni comptable. Un paiement qui échouait n'était signalé à personne.
 *
 * Cet écran est le seul endroit où la supervision devient utile. Il montre par
 * défaut les incidents non acquittés, les plus récents d'abord : un incident
 * actif prime sur un incident fréquent mais éteint.
 *
 * Les messages sont rédigés à l'écriture (voir lib/monitoring/redact.ts) — ni
 * IBAN, ni jeton, ni clé n'arrive jusqu'ici. La page les affiche donc tels
 * quels, sans traitement supplémentaire qui donnerait une fausse impression de
 * sécurité.
 */

type Incident = {
  id: string
  fingerprint: string
  level: "warning" | "error" | "fatal"
  source: "server" | "api" | "client" | "edge" | "job"
  name: string
  message: string
  route: string | null
  method: string | null
  status: number | null
  digest: string | null
  release_sha: string | null
  environment: string
  occurrences: number
  first_seen_at: string
  last_seen_at: string
  resolved_at: string | null
}

type Statut = "ouverts" | "resolus" | "tous"

const TONALITE_PAR_NIVEAU: Record<Incident["level"], Parameters<typeof tone>[0]> = {
  warning: "warning",
  error: "danger",
  fatal: "danger",
}

const LIBELLE_STATUT: Record<Statut, string> = {
  ouverts: "Non acquittés",
  resolus: "Acquittés",
  tous: "Tous",
}

function dateLisible(valeur: string | null) {
  if (!valeur) return "—"
  return new Date(valeur).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function PageIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [occurrences, setOccurrences] = useState(0)
  const [statut, setStatut] = useState<Statut>("ouverts")
  const [chargement, setChargement] = useState(true)
  const [enCours, setEnCours] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur(null)
    try {
      const res = await fetch(`/api/admin/errors?statut=${statut}&limite=100`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Chargement impossible")
      setIncidents(data.incidents ?? [])
      setOccurrences(data.occurrences ?? 0)
    } catch (e: unknown) {
      // Une page de supervision qui échoue en silence est pire qu'absente :
      // elle affiche « aucun incident » alors qu'elle n'a rien pu lire.
      setErreur(e instanceof Error ? e.message : "Chargement impossible")
      setIncidents([])
    } finally {
      setChargement(false)
    }
  }, [statut])

  useEffect(() => {
    void charger()
  }, [charger])

  async function acquitter(incident: Incident) {
    const resolu = !incident.resolved_at
    setEnCours(incident.id)
    try {
      const res = await fetch("/api/admin/errors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: incident.id, resolu }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Action impossible")
      toast.success(resolu ? "Incident acquitté" : "Incident rouvert")
      await charger()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Action impossible")
    } finally {
      setEnCours(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Incidents</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Erreurs serveur et navigateur, regroupées par empreinte. Les données
            sensibles sont masquées à l&apos;enregistrement.
          </p>
        </div>
        <Button variant="outline" onClick={() => void charger()} disabled={chargement}>
          {chargement ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ms-2">Actualiser</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(LIBELLE_STATUT) as Statut[]).map((valeur) => (
          <Button
            key={valeur}
            size="sm"
            variant={statut === valeur ? "default" : "outline"}
            onClick={() => setStatut(valeur)}
          >
            {LIBELLE_STATUT[valeur]}
          </Button>
        ))}
        {incidents.length > 0 && (
          <span className="text-muted-foreground ms-auto text-sm">
            {incidents.length} incident{incidents.length > 1 ? "s" : ""} ·{" "}
            {occurrences.toLocaleString("fr-FR")} occurrence{occurrences > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {erreur && (
        <div className={`flex items-start gap-3 rounded-xl border p-4 ${tone("danger").surface}`}>
          <AlertTriangle className={`h-5 w-5 shrink-0 ${tone("danger").icon}`} />
          <div>
            <p className="text-sm font-semibold">La liste n&apos;a pas pu être chargée</p>
            <p className="text-muted-foreground mt-1 text-sm">{erreur}</p>
          </div>
        </div>
      )}

      {chargement && incidents.length === 0 && (
        <div className="text-muted-foreground flex items-center gap-2 py-12 justify-center text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement…
        </div>
      )}

      {!chargement && !erreur && incidents.length === 0 && (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <ServerCrash className="text-muted-foreground mx-auto h-8 w-8" />
          <p className="mt-3 font-medium">Aucun incident {statut === "ouverts" ? "ouvert" : ""}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            La supervision est active : cette page se remplira au premier incident.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {incidents.map((incident) => {
          const t = tone(TONALITE_PAR_NIVEAU[incident.level])
          return (
            <div
              key={incident.id}
              className={`rounded-xl border p-4 ${incident.resolved_at ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={t.badge}>{incident.name}</Badge>
                    <Badge variant="outline">{incident.source}</Badge>
                    {incident.occurrences > 1 && (
                      <Badge variant="outline">×{incident.occurrences.toLocaleString("fr-FR")}</Badge>
                    )}
                    {incident.resolved_at && (
                      <Badge className={tone("success").badge}>Acquitté</Badge>
                    )}
                  </div>

                  {/* dir="auto" : un message peut venir d'une couche tierce
                      dans une autre écriture. */}
                  <p className="mt-2 font-mono text-sm break-words" dir="auto">
                    {incident.message}
                  </p>

                  <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {incident.route && (
                      <span className="font-mono">
                        {incident.method} {incident.route}
                        {incident.status ? ` → ${incident.status}` : ""}
                      </span>
                    )}
                    <span>Dernière : {dateLisible(incident.last_seen_at)}</span>
                    <span>Première : {dateLisible(incident.first_seen_at)}</span>
                    {incident.release_sha && (
                      <span className="font-mono">v {incident.release_sha}</span>
                    )}
                    {incident.digest && (
                      // C'est l'identifiant que l'utilisateur voit sur la page
                      // 500 : le seul lien entre son signalement et cette ligne.
                      <span className="font-mono">digest {incident.digest}</span>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void acquitter(incident)}
                  disabled={enCours === incident.id}
                >
                  {enCours === incident.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : incident.resolved_at ? (
                    <RotateCcw className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span className="ms-2">{incident.resolved_at ? "Rouvrir" : "Acquitter"}</span>
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
