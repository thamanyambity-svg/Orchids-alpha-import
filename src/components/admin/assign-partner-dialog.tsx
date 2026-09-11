"use client"

import { useEffect, useState } from "react"
import { Building2, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/**
 * Choix du partenaire à qui confier une demande.
 *
 * Le bouton « Assigner maintenant » n'était relié à rien : aucune demande ne
 * pouvait être confiée à un partenaire depuis sa fiche. Les partenaires du
 * pays d'achat sont proposés en premier ; seuls les contrats actifs sont
 * sélectionnables.
 */

interface PartenaireListe {
  id: string
  contract_status: string
  country_id: string | null
  user: { full_name: string | null; company_name: string | null } | null
  country: { name: string; code: string } | null
}

function un<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null
}

export function AssignPartnerDialog({
  requestId,
  countryId,
  open,
  onOpenChange,
  onAssigned,
}: {
  requestId: string
  countryId?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssigned: () => void
}) {
  const [partenaires, setPartenaires] = useState<PartenaireListe[]>([])
  const [chargement, setChargement] = useState(false)
  const [choix, setChoix] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    if (!open) return
    setChargement(true)
    // Par la route serveur : lue avec la session, la table revenait vide.
    fetch("/api/admin/partners", { cache: "no-store" })
      .then(async (res) => {
        const corps = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(corps.error || `Erreur ${res.status}`)
        return corps.partners ?? []
      })
      .catch((e: Error) => {
        toast.error(`Partenaires indisponibles : ${e.message}`)
        return []
      })
      .then((data: any[]) => {
        const liste = data.map((p: any) => ({ ...p, user: un(p.user), country: un(p.country) })) as PartenaireListe[]
        // Pays d'achat d'abord, puis contrats actifs.
        liste.sort((a, b) => {
          const pays = Number(b.country_id === countryId) - Number(a.country_id === countryId)
          if (pays !== 0) return pays
          return Number(b.contract_status === "ACTIVE") - Number(a.contract_status === "ACTIVE")
        })
        setPartenaires(liste)
        const premier = liste.find((p) => p.contract_status === "ACTIVE" && p.country_id === countryId)
        setChoix(premier?.id ?? null)
        setChargement(false)
      })
  }, [open, countryId])

  async function confirmer() {
    if (!choix) return
    setEnvoi(true)
    try {
      const res = await fetch("/api/admin/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ASSIGN_PARTNER", requestId, data: { partnerId: choix } }),
      })
      const corps = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(corps.error || `Erreur ${res.status}`)
      toast.success("Partenaire assigné. Il a accès au dossier et à la discussion.")
      onOpenChange(false)
      onAssigned()
    } catch (e: any) {
      toast.error(`Assignation impossible : ${e.message}`)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assigner un partenaire</DialogTitle>
        </DialogHeader>

        {chargement ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : partenaires.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucun partenaire enregistré. Créez-en un dans Admin → Partenaires.
          </p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {partenaires.map((p) => {
              const actif = p.contract_status === "ACTIVE"
              const selectionne = choix === p.id
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={!actif}
                    onClick={() => setChoix(p.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-colors ${
                      selectionne ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    } ${actif ? "" : "cursor-not-allowed opacity-50"}`}
                  >
                    <Building2 className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.user?.company_name || p.user?.full_name || "Sans nom"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[p.user?.company_name ? p.user?.full_name : null, p.country?.name].filter(Boolean).join(" · ")}
                        {p.country_id === countryId && " · pays d'achat"}
                        {!actif && ` · contrat ${p.contract_status}`}
                      </p>
                    </div>
                    {selectionne && <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={envoi}>
            Annuler
          </Button>
          <Button onClick={confirmer} disabled={!choix || envoi}>
            {envoi && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            Assigner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
