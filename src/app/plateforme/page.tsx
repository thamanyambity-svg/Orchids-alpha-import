"use client"

import { useLanguage } from "@/lib/i18n-context"
import { SiteShell } from "@/components/site/site-shell"
import { useReveal } from "@/components/site/use-reveal"
import { PageHero, SectionTitle } from "@/components/site/sections"

/**
 * Les trois rôles et ce que chacun voit. Les listes reprennent les écrans
 * réellement présents dans l'application : ne rien promettre qui n'existe pas.
 */
const ROLES = [
  {
    key: "buyer",
    items: [
      "Demandes d'importation",
      "Cotations & bons de commande",
      "Factures proforma et finales",
      "Documents centralisés",
      "Paiements & mandats SEPA",
      "Messagerie & incidents",
    ],
  },
  {
    key: "partner",
    items: [
      "Demandes assignées",
      "Fournisseurs référencés",
      "Sessions de sourcing",
      "Soumission de cotation",
      "Preuve d'achat",
      "Tracking d'expédition",
    ],
  },
  {
    key: "admin",
    items: [
      "Vérification KYC",
      "Validation des devis",
      "Séquestre & libérations",
      "Dossiers douaniers",
      "Incidents & risques",
      "Reporting & audit",
    ],
  },
] as const

const SECURITY = ["sec1", "sec2", "sec3", "sec4"] as const

export default function PlatformPage() {
  const { t } = useLanguage()
  useReveal()

  return (
    <SiteShell>
      <PageHero
        eyebrow={t("site.pf.eyebrow", "La plateforme")}
        title={t("site.pf.title", "TROIS RÔLES, UN MÊME DOSSIER")}
        body={t("site.pf.body", "")}
        image="photo-1551288049-bebda4e38f71"
      />

      <section className="border-t border-[var(--line)] bg-[var(--navy2)] py-[100px]">
        <div className="mx-auto max-w-[1440px] px-8">
          <div className="grid gap-px bg-[var(--line)] [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
            {ROLES.map((role) => (
              <div
                key={role.key}
                data-reveal
                className="border-t-2 border-transparent bg-[var(--navy2)] px-[30px] pb-[50px] pt-11 transition-[border-color,background] duration-[400ms] hover:border-gold hover:bg-[hsl(216_40%_12%)]"
              >
                <span className="mb-4 block font-condensed text-[11px] font-bold uppercase tracking-[.34em] text-gold">
                  {t(`site.role.${role.key}.code`, "")}
                </span>
                <h3 className="mb-3 mt-0 font-display text-[32px] leading-[1.02] text-white">
                  {t(`site.role.${role.key}.title`, "")}
                </h3>
                <p className="mb-[26px] mt-0 text-[17px] font-light leading-[1.62] text-white/58 [text-wrap:pretty]">
                  {t(`site.role.${role.key}.body`, "")}
                </p>
                <div className="flex flex-col gap-[9px] border-t border-[var(--line)] pt-[22px]">
                  {role.items.map((item) => (
                    <span
                      key={item}
                      className="flex items-center gap-[11px] font-condensed text-[14px] font-medium uppercase tracking-[.14em] text-white/50"
                    >
                      <span className="block h-1 w-1 shrink-0 bg-gold" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--navy)] py-[100px]">
        <div className="mx-auto max-w-[1440px] px-8">
          <div data-reveal className="mb-5">
            <SectionTitle size="sm">{t("site.sec.title", "")}</SectionTitle>
          </div>
          <p
            data-reveal
            className="mb-11 max-w-[660px] text-[18px] font-light leading-[1.62] text-white/55 [text-wrap:pretty]"
          >
            {t("site.sec.body", "")}
          </p>
          <div className="grid gap-px bg-[var(--line)] [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
            {SECURITY.map((key) => (
              <div
                key={key}
                data-reveal
                className="border-t-2 border-transparent bg-[var(--navy)] px-[26px] pb-10 pt-9 transition-[border-color,background] duration-[400ms] hover:border-gold hover:bg-[var(--navy2)]"
              >
                <span className="mb-4 block font-condensed text-[11px] font-bold uppercase tracking-[.32em] text-gold">
                  {t(`site.${key}.tag`, "")}
                </span>
                <h3 className="mb-3 mt-0 font-display text-[26px] leading-[1.05] text-white">
                  {t(`site.${key}.title`, "")}
                </h3>
                <p className="m-0 text-[15px] font-light leading-[1.62] text-white/55 [text-wrap:pretty]">
                  {t(`site.${key}.body`, "")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  )
}
