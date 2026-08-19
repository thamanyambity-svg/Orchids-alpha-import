"use client"

import { useLanguage } from "@/lib/i18n-context"
import { SiteShell } from "@/components/site/site-shell"
import { useReveal } from "@/components/site/use-reveal"
import { PageHero, SERVICES } from "@/components/site/sections"
import { EscrowSimulator } from "@/components/site/escrow-simulator"

const IMG = (id: string) =>
  `url('https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=70')`

export default function ServicesPage() {
  const { t } = useLanguage()
  useReveal()

  return (
    <SiteShell>
      <PageHero
        eyebrow={t("site.svc.eyebrow", "Ce que nous faisons")}
        title={t("site.svc.pageTitle", "NOS SERVICES")}
        body={t("site.svc.pageBody", "")}
        image="photo-1613690399151-65ea69478674"
      />

      {SERVICES.map((service) => {
        const detail = t(`site.svc.${service.key}.detail`, "")
        // Le repli de `t()` renvoie la clé quand rien n'est défini : on ne rend
        // le liseré que si un vrai texte existe.
        const hasDetail = detail && !detail.startsWith("site.")

        return (
          <section
            key={service.num}
            className="border-t border-[var(--line)]"
            style={{ background: service.bg }}
          >
            <div data-reveal className="mx-auto max-w-[1440px] px-8">
              <div className="grid [grid-template-columns:repeat(auto-fit,minmax(330px,1fr))]">
                <div
                  className="flex flex-col justify-center py-[92px]"
                  style={{ order: service.flip ? 2 : 1 }}
                >
                  <span className="mb-5 block font-display text-[74px] leading-[.8] text-[hsl(42_85%_55%/.24)]">
                    {service.num}
                  </span>
                  <h2 className="m-0 font-display text-[clamp(36px,4.4vw,64px)] leading-[.96] text-white">
                    {t(`site.svc.${service.key}.title`, "")}
                  </h2>
                  <div className="my-6 h-[14px] w-[100px] bg-gold" />
                  <p className="mb-[26px] max-w-[520px] text-[18px] font-light leading-[1.65] text-white/60 [text-wrap:pretty]">
                    {t(`site.svc.${service.key}.body`, "")}
                  </p>
                  {hasDetail && (
                    <span className="inline-block self-start border border-[var(--line)] px-[18px] py-3 font-condensed text-[13px] font-medium uppercase tracking-[.2em] text-white/55">
                      {detail}
                    </span>
                  )}
                </div>
                <div
                  className="relative min-h-[430px] overflow-hidden"
                  style={{ order: service.flip ? 1 : 2 }}
                >
                  <div
                    className="absolute -inset-[10%] bg-cover bg-center"
                    style={{ backgroundImage: IMG(service.img) }}
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(216_45%_6%/.55),transparent_60%)]" />
                </div>
              </div>
            </div>
          </section>
        )
      })}

      <EscrowSimulator />
    </SiteShell>
  )
}
