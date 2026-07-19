"use client"

import { useState } from "react"
import { CreditCard, Loader2, CheckCircle2, AlertCircle, Building2, Landmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/lib/i18n-context"
import { toast } from "sonner"
import { loadStripe } from "@stripe/stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function validateIBAN(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, "").toUpperCase()
  if (cleaned.length < 15 || cleaned.length > 34) return false
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(cleaned)) return false

  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4)
  const numeric = rearranged.split("").map(c =>
    /\d/.test(c) ? c : String(c.charCodeAt(0) - 55)
  ).join("")

  let remainder = 0
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + parseInt(numeric[i], 10)) % 97
  }
  return remainder === 1
}

function validateBIC(bic: string): boolean {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic.toUpperCase())
}

interface SepaMandateFormProps {
  onSuccess?: () => void
  onClose?: () => void
}

export function SepaMandateForm({ onSuccess, onClose }: SepaMandateFormProps) {
  const { t } = useLanguage()
  const [step, setStep] = useState<"form" | "confirming" | "done" | "error">("form")
  const [loading, setLoading] = useState(false)
  const [iban, setIban] = useState("")
  const [bic, setBic] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [mandateInfo, setMandateInfo] = useState<{ lastFour: string; date: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const cleanIban = iban.replace(/\s/g, "").toUpperCase()
    const cleanBic = bic.replace(/\s/g, "").toUpperCase()

    if (!validateIBAN(cleanIban)) {
      setError("IBAN invalide. Vérifiez le format.")
      return
    }
    if (!validateBIC(cleanBic)) {
      setError("BIC/SWIFT invalide.")
      return
    }
    if (!name.trim()) {
      setError("Le nom du titulaire du compte est requis.")
      return
    }

    setStep("confirming")
    setLoading(true)

    try {
      const res = await fetch("/api/payment/setup-mandate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iban: cleanIban, bic: cleanBic, name: name.trim() }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création du mandat")

      const stripe = await stripePromise
      if (!stripe) throw new Error("Stripe n'a pas pu être chargé")

      const { error: confirmError, setupIntent } = await stripe.confirmSepaDebitSetup(
        data.clientSecret
      )

      if (confirmError) throw new Error(confirmError.message || "Erreur de confirmation")

      const confirmRes = await fetch("/api/payment/confirm-mandate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupIntentId: setupIntent.id }),
      })

      const confirmData = await confirmRes.json()
      if (!confirmRes.ok) throw new Error(confirmData.error || "Erreur de sauvegarde")

      setMandateInfo({
        lastFour: confirmData.paymentMethod?.lastFour || cleanIban.slice(-4),
        date: new Date().toLocaleDateString("fr-FR"),
      })
      setStep("done")
      onSuccess?.()
      toast.success("Mandat SEPA activé avec succès !")
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue")
      setStep("error")
    } finally {
      setLoading(false)
    }
  }

  if (step === "done") {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        <h3 className="font-bold text-lg">{t("sepa.mandate.success_title", "Mandat SEPA activé")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("sepa.mandate.success_desc", "Vos prochains paiements seront prélevés automatiquement sur votre compte IBAN se terminant par")}{" "}
          <strong className="font-mono">{mandateInfo?.lastFour}</strong>.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
        <Landmark className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">
            {t("sepa.mandate.why_title", "Pourquoi le prélèvement SEPA ?")}
          </p>
          <p>
            {t("sepa.mandate.why_desc", "Le prélèvement SEPA permet de séquencer vos paiements (60/40) sans action manuelle à chaque étape. Votre argent reste sur votre compte jusqu'au débit. Vos coordonnées bancaires sont chiffrées par Stripe.")}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">{t("sepa.mandate.account_holder", "Titulaire du compte")}</Label>
        <Input
          id="name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nom du titulaire"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="iban">{t("sepa.mandate.iban", "IBAN")}</Label>
        <Input
          id="iban"
          value={iban}
          onChange={e => setIban(e.target.value.toUpperCase())}
          placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
          className="font-mono"
          required
        />
        <p className="text-xs text-muted-foreground">
          {t("sepa.mandate.iban_hint", "Format : FR suivi de 25 chiffres (ex: FR76 3000 4002 6500 0002 0042 154)")}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bic">{t("sepa.mandate.bic", "BIC / SWIFT")}</Label>
        <Input
          id="bic"
          value={bic}
          onChange={e => setBic(e.target.value.toUpperCase())}
          placeholder="BANKFRPPXXX"
          className="font-mono"
          required
        />
      </div>

      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          {t("sepa.mandate.authorization", "En soumettant ce formulaire, vous autorisez Alpha Import Exchange et Stripe à débiter votre compte via prélèvement SEPA conformément au mandat de prélèvement SEPA.")}
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            {t("common.cancel", "Annuler")}
          </Button>
        )}
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("sepa.mandate.confirming", "Confirmation en cours...")}
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              {t("sepa.mandate.submit", "Activer le prélèvement SEPA")}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
