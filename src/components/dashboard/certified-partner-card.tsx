"use client"

import { useLanguage } from "@/lib/i18n-context"
import { ShieldCheck, LayoutGrid, FileText, CreditCard, MessageSquare, Mail, Phone, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type PartnerCard, lienWhatsApp } from "@/lib/partners/public-card"

/**
 * Partenaire affecté à la demande de l'acheteur.
 *
 * Cette carte affichait jusqu'ici une fiche écrite en dur — Achignon Bilongo,
 * Dubaï — à tous les acheteurs, quel que soit leur pays d'achat. Et quand un
 * vrai partenaire était transmis, elle remplaçait ses coordonnées par des
 * numéros fixés selon le pays. Elle n'affiche plus que le partenaire réel ;
 * sans affectation, elle le dit.
 */
export function CertifiedPartnerCard({ partner }: { partner?: PartnerCard | null }) {
  const { t } = useLanguage()

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  const whatsapp = lienWhatsApp(partner?.whatsapp)

  return (
    <div className="glass rounded-3xl overflow-hidden p-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="t-label mb-1 leading-none text-muted-foreground">
            {t("certified_partner.assigned", "Partenaire assigné")}
          </p>
          <h3 className="t-label text-foreground">{t("certified_partner.your_partner", "Votre partenaire")}</h3>
        </div>
      </div>

      {partner ? (
        <>
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-primary/30 bg-primary/10">
              {partner.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={partner.avatar_url} alt={partner.full_name} className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-2xl text-primary">{(partner.full_name || partner.company_name).charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0">
              <h4 className="truncate text-lg font-bold tracking-tight text-foreground">
                {partner.company_name || partner.full_name}
              </h4>
              {partner.company_name && partner.full_name && (
                <p className="truncate text-sm text-muted-foreground">{partner.full_name}</p>
              )}
              <p className="t-label mt-1 text-muted-foreground">
                {[partner.city, partner.country?.name].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <Button
              asChild={Boolean(whatsapp)}
              disabled={!whatsapp}
              className="h-11 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 font-condensed text-[10px] font-bold uppercase tracking-widest text-[#25D366] transition-all hover:bg-[#25D366] hover:text-foreground"
            >
              {whatsapp ? (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                  <Phone className="me-2 h-3 w-3" />
                  WhatsApp
                </a>
              ) : (
                <span>
                  <Phone className="me-2 h-3 w-3" />
                  WhatsApp
                </span>
              )}
            </Button>
            <Button
              asChild={Boolean(partner.email)}
              disabled={!partner.email}
              className="h-11 rounded-xl border border-primary/30 bg-primary/10 font-condensed text-[10px] font-bold uppercase tracking-widest text-primary transition-all hover:bg-primary hover:text-primary-foreground"
            >
              {partner.email ? (
                <a href={`mailto:${partner.email}?subject=${encodeURIComponent("Ref: Alpha Import Exchange")}`}>
                  <Mail className="me-2 h-3 w-3" />
                  Email
                </a>
              ) : (
                <span>
                  <Mail className="me-2 h-3 w-3" />
                  Email
                </span>
              )}
            </Button>
          </div>
        </>
      ) : (
        // Aucune affectation : la carte le dit, au lieu d'afficher un partenaire
        // qui n'a rien à voir avec la demande.
        <div className="mb-8 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Clock className="h-4 w-4" />
            <p className="t-label">{t("certified_partner.pending", "En cours d'affectation")}</p>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t(
              "certified_partner.pending_desc",
              "L'administration Alpha Import attribue votre demande au partenaire agréé du pays d'achat. Ses coordonnées apparaîtront ici."
            )}
          </p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-4 gap-2">
        {[
          { icon: LayoutGrid, label: t("certified_partner.hub", "Hub"), target: "partner-showcase" },
          { icon: FileText, label: t("certified_partner.docs", "Docs"), target: "documents-section" },
          { icon: CreditCard, label: t("certified_partner.payment", "Paie"), target: "transactions-section" },
          { icon: MessageSquare, label: t("certified_partner.chat", "Chat"), target: "messaging-section" },
        ].map((item) => (
          <button
            key={item.target}
            type="button"
            className="group flex flex-col items-center gap-2"
            onClick={() => scrollToSection(item.target)}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/5 bg-secondary/50 transition-colors group-hover:border-primary/30">
              <item.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
            </span>
            <span className="text-[9px] font-medium uppercase text-muted-foreground">{item.label}</span>
          </button>
        ))}
      </div>

      <Button
        onClick={() => scrollToSection("messaging-section")}
        disabled={!partner}
        className="h-12 w-full rounded-xl bg-primary font-condensed text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
      >
        {t("certified_partner.open_secure_chat", "Ouvrir le chat sécurisé")}
      </Button>
    </div>
  )
}
