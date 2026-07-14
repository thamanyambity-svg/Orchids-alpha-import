"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function QuoteWizard() {
  const [step, setStep] = useState(0)
  const steps = [
    { title: "Informations de base", hint: "Produit, quantité, date souhaitée" },
    { title: "Origine & destination", hint: "Pays fournisseur et destination finale" },
    { title: "Options logistiques", hint: "Incoterms, assurance, emballage" },
    { title: "Vérification & envoi", hint: "Coordonnées et envoi de la demande" }
  ]

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#020308]/90 p-6 text-white">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-white/60">Demande de devis</p>
          <h3 className="text-lg font-semibold">{steps[step].title}</h3>
          <p className="text-sm text-white/60">{steps[step].hint}</p>
        </div>
        <div className="text-sm text-white/50">Étape {step + 1}/{steps.length}</div>
      </div>

      <div className="mb-4">
        <input placeholder="Titre de la demande (ex: 1000 pièces)" className="w-full rounded-md border border-white/10 bg-[#020205] px-4 py-3 text-white placeholder:text-white/40" />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} className="h-12">
          Précédent
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} className="h-12 bg-gradient-to-r from-[#4d8cff] to-[#1f59ff]">
            Suivant
          </Button>
        ) : (
          <Button onClick={() => alert("Devis envoyé — nous vous contacterons bientôt.")} className="h-12 bg-green-600">
            Envoyer la demande
          </Button>
        )}
      </div>
    </div>
  )
}
