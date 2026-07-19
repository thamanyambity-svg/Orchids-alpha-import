"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/i18n-context"
import {
  CreditCard,
  Landmark,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DashboardHeader } from "@/components/dashboard/header"
import { SepaMandateForm } from "@/components/sepa-mandate-form"
import { createClient } from "@/lib/supabase/client"

export default function PaymentsPage() {
  const { t } = useLanguage()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (data) setProfile(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const mandateActive = profile?.mandate_activated
  const ibanLast4 = profile?.iban_last4

  return (
    <div>
      <DashboardHeader
        title={t("dashboard.payments.title", "Moyens de Paiement")}
        subtitle={t("dashboard.payments.subtitle", "Gérez vos cartes et prélèvements SEPA")}
      />

      <div className="p-6 max-w-2xl space-y-6">
        <div className={`p-6 rounded-xl border ${
          mandateActive ? "bg-success/5 border-success/20" : "bg-card border-border"
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                mandateActive ? "bg-success/10" : "bg-muted"
              }`}>
                <Landmark className={`w-6 h-6 ${mandateActive ? "text-success" : "text-muted-foreground"}`} />
              </div>
              <div>
                <h3 className="font-bold">{t("dashboard.payments.sepa_title", "Prélèvement SEPA")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.payments.sepa_desc", "Paiement automatique 60/40 sans action manuelle")}
                </p>
              </div>
            </div>
            <Badge className={mandateActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>
              {mandateActive ? (
                <><CheckCircle2 className="w-3 h-3 mr-1" /> {t("dashboard.payments.active", "Actif")}</>
              ) : (
                <><Clock className="w-3 h-3 mr-1" /> {t("dashboard.payments.inactive", "Inactif")}</>
              )}
            </Badge>
          </div>

          {mandateActive ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {t("dashboard.payments.mandate_info", "Compte IBAN se terminant par")}{" "}
                <strong className="font-mono text-foreground">****{ibanLast4}</strong>
              </div>
              <div className="text-xs text-muted-foreground">
                {t("dashboard.payments.mandate_explain", "Les paiements suivants seront débités automatiquement :")}
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>{t("dashboard.payments.mandate_deposit", "Acompte 60% — débité dès la validation de votre commande")}</li>
                <li>{t("dashboard.payments.mandate_balance", "Solde 40% — débité à la confirmation de livraison")}</li>
              </ul>
            </div>
          ) : (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Landmark className="w-4 h-4 mr-2" />
                  {t("dashboard.payments.activate_sepa", "Activer le prélèvement SEPA")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t("dashboard.payments.mandate_form_title", "Activer le prélèvement SEPA")}</DialogTitle>
                </DialogHeader>
                <SepaMandateForm
                  onSuccess={() => {
                    setDialogOpen(false)
                    fetchProfile()
                  }}
                  onClose={() => setDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  )
}
