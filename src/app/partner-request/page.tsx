"use client"

import { useLanguage } from "@/lib/i18n-context"
import { SiteShell } from "@/components/site/site-shell"
import { useReveal } from "@/components/site/use-reveal"
import { PageHero } from "@/components/site/sections"
import { PartnerWizard } from "@/components/partner-wizard"
import Link from "next/link"

/** Les quatre étapes du parcours partenaire, côté candidat. */
const PARTNER_STEPS = ["site.part1", "site.part2", "site.part3", "site.part4"] as const

export default function PartnerRequestPage() {
  const { t } = useLanguage()
  useReveal()

  return (
    <SiteShell>
      <PageHero
        eyebrow={t("site.part.eyebrow", "Devenir partenaire")}
        title={t("site.part.title", "ACHETER POUR L'AFRIQUE")}
        body={t("site.part.body", "")}
        image="photo-1553413077-190dd305871c"
      />

      <section className="border-t border-[var(--line)] bg-[var(--navy2)] py-[100px]">
        <div className="mx-auto max-w-[1100px] px-8">
          {PARTNER_STEPS.map((key, i) => (
            <div
              key={key}
              data-reveal
              className="grid gap-[30px] border-b border-[var(--line)] py-[38px] [grid-template-columns:96px_1fr] max-sm:[grid-template-columns:1fr]"
            >
              <span className="font-display text-[64px] leading-[.8] text-[hsl(42_85%_55%/.3)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="mb-3 mt-0 font-display text-[clamp(26px,3.2vw,40px)] leading-[1.02] text-white">
                  {t(`${key}.title`, "")}
                </h3>
                <p className="m-0 text-[18px] font-light leading-[1.65] text-white/60 [text-wrap:pretty]">
                  {t(`${key}.body`, "")}
                </p>
              </div>
            </div>
          ))}

          <div data-reveal className="mt-[52px] border border-[var(--line)] bg-[var(--navy)] px-[34px] py-11">
            <h3 className="mb-[14px] mt-0 font-display text-[34px] leading-[1.02] text-white">
              {t("site.part.reqTitle", "CANDIDATER")}
            </h3>
            <p className="mb-7 mt-0 max-w-[560px] text-[17px] font-light leading-[1.62] text-white/55 [text-wrap:pretty]">
              {t("site.part.reqBody", "")}
            </p>
            <div className="flex flex-wrap gap-[14px]">
              <a
                href="#candidature"
                className="bg-gold px-[38px] py-[19px] font-condensed text-[12px] font-bold uppercase tracking-[.28em] text-[#0a1018] whitespace-nowrap"
              >
                {t("site.part.reqBtn", "Déposer une candidature")}
              </a>
              <Link
                href="https://wa.me/243818924674"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-[var(--line)] px-[38px] py-[19px] font-condensed text-[12px] font-bold uppercase tracking-[.28em] text-white/80 transition-colors duration-300 hover:border-gold hover:text-gold"
              >
                WhatsApp
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/*
        Le wizard porte toute la logique de candidature : téléversement des pièces
        légales et écriture dans partner_applications. On l'enveloppe dans le
        nouveau style sans toucher à son fonctionnement.
      */}
      <section
        id="candidature"
        className="relative overflow-hidden border-t border-[var(--line)] bg-[var(--navy)] py-[100px]"
      >
        <div className="absolute inset-0 opacity-60 [background:repeating-linear-gradient(115deg,transparent_0_30px,hsl(42_85%_55%/.04)_30px_31px)]" />
        <div className="relative">
          <PartnerWizard />
        </div>
      </section>
    </SiteShell>
  )
}
