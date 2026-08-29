"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n-context"
import { ArrowRight, Loader2, Plus, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

type Rate = {
  id: string
  from_currency: string
  to_currency: string
  rate: number
  notes: string | null
  effective_at: string
  superseded_at: string | null
  status: "ACTIVE" | "SUPERSEDED"
}

export default function AdminExchangeRatesPage() {
  const { t } = useLanguage()
  const [rates, setRates] = useState<Rate[]>([])
  const [active, setActive] = useState<Rate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currency, setCurrency] = useState("")
  const [value, setValue] = useState("")
  const [notes, setNotes] = useState("")

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/exchange-rates")
      if (!res.ok) throw new Error("fetch failed")

      const body = await res.json()
      setRates(body.rates ?? [])
      setActive(body.active ?? [])
    } catch {
      toast.error(t("admin.rates.load_error", "Impossible de charger les taux"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  async function publish(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/admin/exchange-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_currency: currency.toUpperCase(),
          rate: Number(value),
          notes: notes.trim() || undefined,
        }),
      })
      const body = await res.json()

      if (!res.ok) {
        toast.error(body.error ?? t("admin.rates.save_error", "Le taux n'a pas pu être publié"))
        return
      }

      toast.success(t("admin.rates.published", "Taux publié"))
      setCurrency("")
      setValue("")
      setNotes("")
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">{t("admin.rates.title", "Taux de change")}</h1>
        <p className="text-foreground/40 text-sm">
          {t(
            "admin.rates.subtitle",
            "La base est l'USD. Publier un taux remplace automatiquement le précédent de la même paire — un seul taux fait foi à un instant donné."
          )}
        </p>
      </div>

      <form
        onSubmit={publish}
        className="mb-10 grid gap-4 rounded-xl border border-foreground/10 bg-foreground/5 p-5 sm:grid-cols-[120px_160px_1fr_auto] sm:items-end"
      >
        <div className="space-y-2">
          <Label htmlFor="rate-currency" className="text-foreground/60">
            {t("admin.rates.currency", "Devise cible")}
          </Label>
          <Input
            id="rate-currency"
            required
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
            placeholder="CNY"
            className="bg-foreground/5 border-foreground/10 text-foreground placeholder:text-foreground/30"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rate-value" className="text-foreground/60">
            {t("admin.rates.value", "1 USD =")}
          </Label>
          <Input
            id="rate-value"
            type="number"
            min="0"
            step="0.000001"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="7.24"
            className="bg-foreground/5 border-foreground/10 text-foreground placeholder:text-foreground/30"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rate-notes" className="text-foreground/60">
            {t("admin.rates.notes", "Note (source, date de relevé)")}
          </Label>
          <Textarea
            id="rate-notes"
            rows={1}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            className="bg-foreground/5 border-foreground/10 text-foreground placeholder:text-foreground/30"
          />
        </div>

        <Button type="submit" disabled={saving || !currency || !value} className="h-10">
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
          {t("admin.rates.publish", "Publier")}
        </Button>
      </form>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/50">
              {t("admin.rates.active", "Taux en vigueur")}
            </h2>

            {active.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-foreground/10 rounded-2xl">
                <TrendingUp className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
                <h3 className="font-semibold text-foreground/50">{t("admin.rates.empty", "Aucun taux publié")}</h3>
                <p className="text-sm text-foreground/30">
                  {t("admin.rates.empty_hint", "Publiez un premier taux pour chaque devise utilisée.")}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((rate, i) => (
                  <motion.div
                    key={rate.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-xl border border-foreground/10 bg-foreground/5 p-4"
                  >
                    <div className="mb-2 flex items-center gap-2 text-sm text-foreground/50">
                      <span className="font-mono">{rate.from_currency}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="font-mono">{rate.to_currency}</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{rate.rate}</p>
                    <p className="mt-2 text-xs text-foreground/35">
                      {t("admin.rates.since", "Depuis le")}{" "}
                      {new Date(rate.effective_at).toLocaleDateString("fr-FR")}
                    </p>
                    {rate.notes && <p className="mt-2 text-xs text-foreground/40">{rate.notes}</p>}
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/50">
              {t("admin.rates.history", "Historique")}
            </h2>

            {rates.length === 0 ? (
              <p className="text-sm text-foreground/30">{t("admin.rates.no_history", "Rien à afficher.")}</p>
            ) : (
              <div className="space-y-2">
                {rates.map((rate) => (
                  <div
                    key={rate.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          rate.superseded_at === null
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {rate.superseded_at === null
                          ? t("admin.rates.status.active", "En vigueur")
                          : t("admin.rates.status.superseded", "Remplacé")}
                      </Badge>
                      <span className="font-mono text-sm text-foreground/70">
                        1 {rate.from_currency} = {rate.rate} {rate.to_currency}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-foreground/35">
                      {rate.notes && (
                        <span className="max-w-[360px] truncate" title={rate.notes}>
                          {rate.notes}
                        </span>
                      )}
                      <span>{new Date(rate.effective_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
