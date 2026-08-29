"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n-context"

export function QuoteWizard() {
  const { t } = useLanguage()
  const [step, setStep] = useState(0)
  const steps = [
    { title: t("quotewizard.step1", "Informations de base"), hint: "Produit, quantité, date souhaitée" },
    { title: t("quotewizard.step2", "Origine & destination"), hint: "Pays fournisseur et destination finale" },
    { title: t("quotewizard.step3", "Options logistiques"), hint: "Incoterms, assurance, emballage" },
    { title: t("quotewizard.step4", "Vérification & envoi"), hint: "Coordonnées et envoi de la demande" }
  ]

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-foreground/10 bg-background/90 p-6 text-foreground">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-foreground/60">{t("quotewizard.title", "Demande de devis")}</p>
          <h3 className="text-lg font-semibold">{steps[step].title}</h3>
          <p className="text-sm text-foreground/60">{steps[step].hint}</p>
        </div>
        <div className="text-sm text-foreground/50">{t("quotewizard.step", "Étape")} {step + 1}/{steps.length}</div>
      </div>

      <div className="mb-4">
        <input placeholder="Titre de la demande (ex: 1000 pièces)" className="w-full rounded-md border border-foreground/10 bg-background px-4 py-3 text-foreground placeholder:text-foreground/40" />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} className="h-12">
          {t("quotewizard.prev", "Précédent")}
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} className="h-12 bg-gradient-to-r from-info to-info/70">
            {t("quotewizard.next", "Suivant")}
          </Button>
        ) : (
          <Button onClick={() => alert(t("quotewizard.sent", "Devis envoyé — nous vous contacterons bientôt."))} className="h-12 bg-success">
            {t("quotewizard.send", "Envoyer la demande")}
          </Button>
        )}
      </div>
    </div>
  )
}
