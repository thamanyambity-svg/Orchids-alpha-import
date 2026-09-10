"use client"

import { motion } from "framer-motion"
import { MessageSquare, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n-context"
import type { PartnerCard } from "@/lib/partners/public-card"

/**
 * Vitrine du partenaire affecté.
 *
 * Elle montrait en dur « MAARMALA — Dubaï Global Hub », une note de cinq
 * étoiles et un « temps de réponse ~15 min » que rien ne mesurait. Elle suit
 * désormais le partenaire réel ; l'image est celle de son pays, avec les mêmes
 * photographies que la page réseau.
 */
const IMAGE_PAYS: Record<string, string> = {
  CN: "photo-1547981609-4b6bfe67ca0b",
  TR: "photo-1524231757912-21f4fe3a7200",
  AE: "photo-1512453979798-5ea266f8880c",
  JP: "photo-1540959733332-eab4deabeeaf",
  TH: "photo-1552465011-b4e21bf6e79a",
}
const IMAGE_RESEAU = "photo-1494412574643-ff11b0a5c1c3"

export function PartnerShowcase({ partner }: { partner?: PartnerCard | null }) {
  const { t } = useLanguage()
  const image = IMAGE_PAYS[partner?.country?.code ?? ""] ?? IMAGE_RESEAU

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass relative flex min-h-[360px] flex-col justify-end overflow-hidden rounded-3xl p-8"
    >
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url('https://images.unsplash.com/${image}?q=75&w=1800&auto=format&fit=crop')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-2xl">
          {partner ? (
            <>
              <p className="t-eyebrow mb-3 text-gold">
                {[partner.city, partner.country?.name].filter(Boolean).join(" · ")}
              </p>
              <h2 className="mb-2 text-4xl text-foreground">{partner.company_name || partner.full_name}</h2>
              {partner.company_name && partner.full_name && (
                <p className="text-muted-foreground">{partner.full_name}</p>
              )}
            </>
          ) : (
            <>
              <p className="t-eyebrow mb-3 text-gold">{t("partner_showcase.eyebrow", "Votre partenaire sur place")}</p>
              <h2 className="mb-3 text-4xl text-foreground">
                {t("partner_showcase.pending_title", "AFFECTATION EN COURS")}
              </h2>
              <p className="flex max-w-xl items-start gap-2 text-muted-foreground">
                <Clock className="mt-1 h-4 w-4 shrink-0 text-primary" />
                {t(
                  "partner_showcase.pending_desc",
                  "Dès qu'une demande est déposée, l'administration Alpha Import l'attribue au partenaire agréé du pays d'achat. Il achète, inspecte et répond de la marchandise jusqu'à l'embarquement."
                )}
              </p>
            </>
          )}
        </div>

        {partner && (
          <Button
            onClick={() => document.getElementById("messaging-section")?.scrollIntoView({ behavior: "smooth" })}
            className="h-12 rounded-xl bg-primary px-8 font-condensed text-xs font-bold uppercase tracking-widest text-primary-foreground transition-transform hover:scale-105"
          >
            <MessageSquare className="me-2 h-4 w-4" />
            {t("partner_showcase.contact", "Contacter le partenaire")}
          </Button>
        )}
      </div>
    </motion.div>
  )
}
