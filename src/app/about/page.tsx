"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/i18n-context"
import { SiteShell } from "@/components/site/site-shell"
import { useReveal } from "@/components/site/use-reveal"
import { PageHero, SectionTitle, Eyebrow } from "@/components/site/sections"

const VALUES = ["v1", "v2", "v3"] as const

export default function AboutPage() {
  const { t } = useLanguage()
  useReveal()

  return (
    <SiteShell>
      <PageHero
        eyebrow={t("site.about.eyebrow", "Qui sommes-nous")}
        title={t("site.about.title", "UNE INFRASTRUCTURE, PAS UN INTERMÉDIAIRE")}
        body={t("site.about.body", "")}
        image="photo-1620714223084-8fcacc6dfd8d"
      />

      <section className="border-t border-[var(--line)] bg-[var(--navy2)] py-[110px]">
        <div className="mx-auto max-w-[1440px] px-8">
          <div data-reveal className="max-w-[820px]">
            <Eyebrow>{t("site.about.eyebrow", "Qui sommes-nous")}</Eyebrow>
            <SectionTitle size="md">{t("site.about.missionTitle", "NOTRE RAISON D'ÊTRE")}</SectionTitle>
            <div
              className="mt-7 h-4 w-[120px] origin-left bg-gold"
              style={{ animation: "barIn .9s .2s cubic-bezier(.16,1,.3,1) both" }}
            />
            <p className="mt-7 text-[19px] font-light leading-[1.62] text-white/60 [text-wrap:pretty]">
              {t("site.about.missionBody", "")}
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--navy)] py-[100px]">
        <div className="mx-auto max-w-[1440px] px-8">
          <div className="grid gap-px bg-[var(--line)] [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {VALUES.map((key) => (
              <div
                key={key}
                data-reveal
                className="border-t-2 border-transparent bg-[var(--navy)] px-[28px] pb-11 pt-9 transition-[border-color,background] duration-[400ms] hover:border-gold hover:bg-[var(--navy2)]"
              >
                <span className="mb-4 block font-condensed text-[11px] font-bold uppercase tracking-[.32em] text-gold">
                  {t(`site.about.${key}.tag`, "")}
                </span>
                <h3 className="mb-3 mt-0 font-display text-[28px] leading-[1.05] text-white">
                  {t(`site.about.${key}.title`, "")}
                </h3>
                <p className="m-0 text-[16px] font-light leading-[1.62] text-white/55 [text-wrap:pretty]">
                  {t(`site.about.${key}.body`, "")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-[var(--line)] bg-[var(--navy2)] py-[110px]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[.14]"
          style={{
            backgroundImage:
              "linear-gradient(90deg,hsl(216 45% 6% / .92),hsl(216 45% 6% / .4)), url('https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1600&q=70')",
          }}
        />
        <div className="relative mx-auto max-w-[1440px] px-8">
          <div data-reveal className="max-w-[720px]">
            <SectionTitle size="sm">{t("site.about.groupTitle", "LE GROUPE")}</SectionTitle>
            <p className="mt-6 text-[18px] font-light leading-[1.65] text-white/60 [text-wrap:pretty]">
              {t("site.about.groupBody", "")}
            </p>
            <div className="mt-9 flex flex-wrap gap-[14px]">
              <Link
                href="/plateforme"
                className="bg-gold px-[38px] py-[19px] font-condensed text-[12px] font-bold uppercase tracking-[.28em] text-[#0a1018] whitespace-nowrap"
              >
                {t("site.nav.platform", "Plateforme")}
              </Link>
              <Link
                href="/contact"
                className="border border-[var(--line)] px-[38px] py-[19px] font-condensed text-[12px] font-bold uppercase tracking-[.28em] text-white/80 transition-colors duration-300 hover:border-gold hover:text-gold"
              >
                {t("site.quote.title", "DEMANDER UNE COTATION")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  )
}
