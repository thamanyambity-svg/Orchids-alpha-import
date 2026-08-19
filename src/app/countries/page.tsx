"use client"

import { useLanguage } from "@/lib/i18n-context"
import { SiteShell } from "@/components/site/site-shell"
import { useReveal } from "@/components/site/use-reveal"
import { PageHero, SectionTitle } from "@/components/site/sections"
import { NetworkMap } from "@/components/site/network-map"

const HUBS = ["hub1", "hub2", "hub3", "hub4"] as const

/** Les cinq pays d'origine réellement opérés, alignés sur la table `countries`. */
const ORIGINS = ["Chine", "Turquie", "Dubaï", "Japon", "Thaïlande"]

export default function NetworkPage() {
  const { t } = useLanguage()
  useReveal()

  return (
    <SiteShell>
      <PageHero
        eyebrow={t("site.net.eyebrow", "Notre réseau")}
        title={t("site.net.pageTitle", "LE RÉSEAU")}
        body={t("site.net.pageBody", "")}
        image="photo-1494412574643-ff11b0a5c1c3"
      />

      <section className="bg-[var(--navy)] pb-10">
        <div className="mx-auto max-w-[1440px] px-8">
          <div
            data-reveal
            className="relative border border-[var(--line)] bg-[hsl(216_40%_9%/.6)]"
            style={{ height: "clamp(360px, 50vw, 620px)" }}
          >
            <NetworkMap />
            <div className="absolute bottom-[18px] left-5 flex flex-wrap gap-[22px]">
              <span className="flex items-center gap-[9px] font-condensed text-[11px] uppercase tracking-[.3em] text-white/40">
                <span className="block h-[7px] w-[7px] rounded-full bg-gold" />
                {t("site.net.legendHub", "Hub Kinshasa")}
              </span>
              <span className="flex items-center gap-[9px] font-condensed text-[11px] uppercase tracking-[.3em] text-white/40">
                <span className="block h-px w-[22px] bg-[hsl(42_85%_55%/.6)]" />
                {t("site.net.legendRoute", "Corridor actif")}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--navy)] pb-[100px] pt-[76px]">
        <div className="mx-auto max-w-[1440px] px-8">
          <div data-reveal className="mb-[38px]">
            <SectionTitle size="sm">{t("site.net.hubsTitle", "QUATRE HUBS MONDIAUX")}</SectionTitle>
          </div>
          <div className="grid gap-px bg-[var(--line)] [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {HUBS.map((key) => (
              <div
                key={key}
                data-reveal
                className="border-t-2 border-transparent bg-[var(--navy2)] px-[26px] pb-11 pt-[38px] transition-colors duration-[400ms] hover:border-gold"
              >
                <span className="mb-[14px] block font-condensed text-[11px] font-bold uppercase tracking-[.32em] text-gold">
                  {t(`site.net.${key}.tag`, "")}
                </span>
                <h3 className="mb-3 mt-0 font-display text-[29px] leading-[1.05] text-white">
                  {t(`site.net.${key}.cities`, "")}
                </h3>
                <p className="m-0 text-[16px] font-light leading-[1.62] text-white/55 [text-wrap:pretty]">
                  {t(`site.net.${key}.body`, "")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-[var(--line)] bg-[var(--navy2)] pb-[110px] pt-24">
        <div className="absolute inset-0 opacity-50 [background:repeating-linear-gradient(115deg,transparent_0_30px,hsl(42_85%_55%/.035)_30px_31px)]" />
        <div className="relative mx-auto max-w-[1440px] px-8">
          <div data-reveal className="mb-[18px]">
            <SectionTitle size="sm">{t("site.net.originsTitle", "")}</SectionTitle>
          </div>
          <p
            data-reveal
            className="mb-10 max-w-[660px] text-[18px] font-light leading-[1.62] text-white/55 [text-wrap:pretty]"
          >
            {t("site.net.originsBody", "")}
          </p>
          <div className="flex flex-wrap gap-px border border-[var(--line)] bg-[var(--line)]">
            {ORIGINS.map((origin) => (
              <span
                key={origin}
                className="flex-1 basis-[180px] bg-[var(--navy2)] px-6 py-[30px] font-display text-[30px] leading-none text-white transition-colors duration-[350ms] hover:bg-gold hover:text-[#0a1018]"
              >
                {origin}
              </span>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  )
}
