"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n-context"
import { SiteNav, SITE_LINKS } from "./site-nav"

/** Numéro WhatsApp public de la société, repris de la maquette. */
const WHATSAPP = "243818924674"

const SERVICE_KEYS = [
  ["site.svc.sourcing.title", "SOURCING & ACHATS"],
  ["site.svc.logistics.title", "LOGISTIQUE & TRANSIT"],
  ["site.svc.finance.title", "SÉCURISATION FINANCIÈRE"],
  ["site.svc.quality.title", "CONTRÔLE QUALITÉ"],
  ["site.svc.trade.title", "FINANCEMENT TRADE"],
  ["site.svc.consulting.title", "CONSEIL & ACCOMPAGNEMENT"],
] as const

const ORIGINS = ["Chine", "Turquie", "Dubaï", "Japon", "Thaïlande"]

/** Fine barre dorée indiquant la progression de lecture. */
function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => {
      const bar = ref.current
      if (!bar) return
      const max = Math.max(1, document.body.scrollHeight - window.innerHeight)
      bar.style.width = `${Math.min(100, (window.scrollY / max) * 100)}%`
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      className="fixed left-0 top-0 z-[9999] h-[2px] w-0 bg-gold"
      style={{ boxShadow: "0 0 12px var(--gold)" }}
    />
  )
}

function SiteFooter() {
  const { t } = useLanguage()

  return (
    <footer className="border-t border-[var(--line)] bg-[hsl(216_48%_4%)] px-0 pb-8 pt-[76px]">
      <div className="mx-auto max-w-[1440px] px-8">
        <div className="grid gap-11 border-b border-[var(--line)] pb-[52px] [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          <div>
            <div className="mb-4 flex items-baseline gap-[10px]">
              <span className="font-display text-[32px] leading-[.9] text-white">ALPHA</span>
              <span className="font-condensed text-[12px] font-semibold uppercase tracking-[.42em] text-gold">
                Import
              </span>
            </div>
            <p className="mb-[18px] max-w-[300px] text-[16px] font-light leading-[1.6] text-white/45">
              {t("site.foot.subsidiary", "Filiale du Groupe A.Onoseke Investment RDC")}
            </p>
            <p className="max-w-[300px] text-[15px] font-light leading-[1.7] text-white/35">
              {t("site.foot.address", "Kinshasa, République Démocratique du Congo")}
            </p>
          </div>

          <div>
            <span className="mb-[18px] block font-condensed text-[11px] font-bold uppercase tracking-[.34em] text-gold">
              {t("site.nav.services", "Services")}
            </span>
            <div className="flex flex-col gap-[10px]">
              {SERVICE_KEYS.map(([key, fallback]) => (
                <Link
                  key={key}
                  href="/services"
                  className="font-condensed text-[16px] font-light tracking-[.04em] text-white/45 transition-colors hover:text-gold"
                >
                  {t(key, fallback)}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-[18px] block font-condensed text-[11px] font-bold uppercase tracking-[.34em] text-gold">
              {t("site.nav.network", "Réseau")}
            </span>
            <div className="flex flex-col gap-[10px]">
              {ORIGINS.map((origin) => (
                <Link
                  key={origin}
                  href="/countries"
                  className="font-condensed text-[16px] font-light tracking-[.04em] text-white/45 transition-colors hover:text-gold"
                >
                  {origin}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-[18px] block font-condensed text-[11px] font-bold uppercase tracking-[.34em] text-gold">
              {t("site.foot.company", "Société")}
            </span>
            <div className="flex flex-col gap-[10px]">
              {[
                { href: "/plateforme", label: t("site.nav.platform", "Plateforme") },
                { href: "/how-it-works", label: t("site.nav.process", "Processus") },
                { href: "/partner-request", label: t("site.nav.partners", "Partenaires") },
                { href: "/legal", label: t("site.foot.legal", "Mentions légales") },
                { href: "/privacy", label: t("site.foot.privacy", "Politique de confidentialité") },
                { href: "/cgv", label: t("site.foot.terms", "Conditions générales") },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="font-condensed text-[16px] font-light tracking-[.04em] text-white/45 transition-colors hover:text-gold"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-[18px] pt-[26px]">
          <span className="font-condensed text-[12px] uppercase tracking-[.22em] text-white/30">
            {t("site.foot.rights", "© 2026 A.Onoseke Investment. Tous droits réservés.")}
          </span>
          <span className="font-condensed text-[12px] uppercase tracking-[.22em] text-white/30">
            Kinshasa · RDC
          </span>
        </div>
      </div>
    </footer>
  )
}

/**
 * Enveloppe commune aux pages vitrine : barre de progression, navigation fixe,
 * pied de page et bouton WhatsApp flottant.
 *
 * La classe `site-shell` sert d'ancre au bloc `prefers-reduced-motion` de
 * globals.css : elle neutralise les animations sur toute la vitrine sans
 * toucher au tableau de bord.
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage()

  return (
    <div className="site-shell relative min-h-screen bg-[var(--navy)]">
      <ScrollProgress />
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />

      <a
        href={`https://wa.me/${WHATSAPP}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-[26px] right-[26px] z-[800] bg-gold px-[26px] py-[17px] font-condensed text-[12px] font-bold uppercase tracking-[.26em] text-[#0a1018] whitespace-nowrap"
        style={{
          boxShadow: "0 14px 40px hsl(42 85% 55% / .28)",
          animation: "drift 4s ease-in-out infinite",
        }}
      >
        {t("site.floatBtn", "WhatsApp")}
      </a>
    </div>
  )
}

export { SITE_LINKS }
