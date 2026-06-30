"use client"

import { ShieldCheck, Lock, BadgeCheck, Scale, CreditCard, Info } from "lucide-react"

/** Bandeau confiance & sécurité (escrow 60/40, partenaire certifié, recours). */
export function TrustBanner({ partnerName, countryName }: { partnerName?: string; countryName?: string }) {
  const items = [
    { icon: ShieldCheck, title: "Fonds protégés (séquestre)", text: "Votre argent est bloqué et n'est libéré au partenaire qu'après livraison vérifiée (modèle 60/40)." },
    { icon: BadgeCheck, title: "Partenaire certifié", text: partnerName ? `${partnerName}${countryName ? " · " + countryName : ""} — partenaire exclusif vérifié.` : "Un partenaire exclusif vérifié par pays." },
    { icon: Scale, title: "Recours en cas de litige", text: "Non-conformité, retard ou perte : ouverture d'incident et procédure de remboursement." },
    { icon: Lock, title: "Paiement & données sécurisés", text: "Paiement via Stripe (chiffré). Données traitées conformément au RGPD." },
  ]
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h3 className="font-bold">Vous êtes protégé à chaque étape</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((it, i) => (
          <div key={i} className="flex gap-3">
            <it.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">{it.title}</p>
              <p className="text-xs text-muted-foreground">{it.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-primary/10 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5" />
        Aucun paiement maintenant — vous payez l'acompte 60% seulement après validation du devis.
      </div>
    </div>
  )
}

/** Estimation indicative du coût (commission 10% + split 60/40). */
export function CostEstimate({ total }: { total: number }) {
  const commission = total * 0.10
  const deposit = total * 0.60
  const balance = total * 0.40
  const fmt = (n: number) => "$" + (n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
  const row = (l: string, v: string, strong = false) => (
    <div className="flex justify-between py-1.5 text-sm">
      <span className={strong ? "font-semibold" : "text-muted-foreground"}>{l}</span>
      <span className={strong ? "font-bold" : "font-medium"}>{v}</span>
    </div>
  )
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="w-5 h-5 text-primary" />
        <h3 className="font-bold">Estimation indicative</h3>
      </div>
      {row("Budget marchandise (max)", fmt(total))}
      {row("Commission Alpha (10%)", fmt(commission))}
      <div className="border-t my-2" />
      {row("Acompte à la validation (60%)", fmt(deposit), true)}
      {row("Solde à la livraison (40%)", fmt(balance))}
      <p className="text-[11px] text-muted-foreground mt-3">
        Estimation basée sur votre budget. Le montant ferme sera fixé par la cotation du partenaire, validée par l'administration. Aucun débit à ce stade.
      </p>
    </div>
  )
}

/** Frise des prochaines étapes. */
export function NextSteps() {
  const steps = ["Demande soumise", "Analyse & cotation", "Validation admin", "Acompte 60%", "Sourcing & expédition", "Livraison & solde 40%"]
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-bold mb-4">Prochaines étapes</h3>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
            <span className={i === 0 ? "font-semibold" : "text-muted-foreground"}>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
