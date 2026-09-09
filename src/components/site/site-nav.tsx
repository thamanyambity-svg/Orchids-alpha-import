"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLanguage, languages, type Language } from "@/lib/i18n-context"

/** Les entrées de navigation et leur route réelle. */
export const SITE_LINKS = [
  { href: "/", key: "site.nav.home", fallback: "Accueil" },
  { href: "/about", key: "site.nav.about", fallback: "Qui sommes-nous" },
  { href: "/services", key: "site.nav.services", fallback: "Services" },
  { href: "/plateforme", key: "site.nav.platform", fallback: "Plateforme" },
  { href: "/how-it-works", key: "site.nav.process", fallback: "Processus" },
  { href: "/countries", key: "site.nav.network", fallback: "Réseau" },
  { href: "/partner-request", key: "site.nav.partners", fallback: "Partenaires" },
] as const

const LINK_BASE =
  "px-[11px] py-[10px] font-condensed text-[12px] font-semibold tracking-[.26em] uppercase whitespace-nowrap transition-colors duration-200"

export function SiteNav() {
  const { t, language, setLanguage } = useLanguage()
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  // La barre devient opaque dès qu'on quitte le haut de page. On écrit
  // directement dans le style plutôt que de passer par l'état React : ce
  // gestionnaire tourne à chaque frame de défilement.
  useEffect(() => {
    const onScroll = () => {
      const nav = navRef.current
      if (!nav) return
      const on = window.scrollY > 60
      nav.style.background = on ? "hsl(216 45% 6% / .9)" : "hsl(216 45% 6% / 0)"
      nav.style.backdropFilter = on ? "blur(14px)" : "blur(0px)"
      nav.style.borderBottomColor = on ? "var(--line)" : "transparent"
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Une navigation ferme les panneaux : sans cela le menu mobile resterait
  // ouvert par-dessus la page d'arrivée.
  useEffect(() => {
    setMenuOpen(false)
    setLangOpen(false)
  }, [pathname])

  const current = languages.find((l) => l.code === language)

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-[900] border-b border-transparent transition-[background,backdrop-filter,border-color] duration-[400ms]"
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-8 py-[18px]">
        <Link href="/" className="flex items-baseline gap-[10px]">
          <span className="font-display text-[30px] leading-[.9] tracking-[.04em] text-foreground">ALPHA</span>
          <span className="font-condensed text-[12px] font-semibold uppercase tracking-[.42em] text-gold">
            Import
          </span>
        </Link>

        <div className="hidden items-center gap-[2px] min-[1280px]:flex">
          {SITE_LINKS.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${LINK_BASE} ${active ? "text-gold" : "text-foreground/60 hover:text-foreground"}`}
              >
                {t(link.key, link.fallback)}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-[14px]">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="flex flex-col gap-[5px] border border-[var(--line)] px-[13px] py-3 min-[1280px]:hidden"
          >
            <span className="block h-[1.5px] w-[18px] bg-gold" />
            <span className="block h-[1.5px] w-[18px] bg-gold" />
            <span className="block h-[1.5px] w-[18px] bg-gold" />
          </button>

          <div className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              aria-expanded={langOpen}
              className="border border-[var(--line)] px-3 py-2 font-condensed text-[11px] font-bold uppercase tracking-[.24em] text-foreground/75 transition-colors hover:border-gold hover:text-gold"
            >
              {current?.code.toUpperCase() ?? "FR"}
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-2 min-w-[190px] border border-[var(--line)] bg-background/[.97] backdrop-blur-[14px]">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLanguage(l.code as Language)
                      setLangOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-start font-condensed text-[13px] tracking-[.14em] transition-colors hover:bg-foreground/5 ${
                      l.code === language ? "text-gold" : "text-foreground/70"
                    }`}
                  >
                    <span aria-hidden>{l.flag}</span>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/*
            Masqué tant que la navigation est repliée. À 375 px ce bouton
            débordait de 164 px : `overflow-x: hidden` sur le corps supprimait
            la barre de défilement, si bien qu'il n'était pas visiblement cassé
            — seulement tronqué, et à moitié inutilisable. Il est repris dans le
            menu ci-dessous, où il manquait : un visiteur sur téléphone n'avait
            aucun chemin vers la plateforme depuis la navigation.
          */}
          <Link
            href="/dashboard"
            className="hidden bg-gold px-6 py-[14px] font-condensed text-[12px] font-bold uppercase tracking-[.24em] text-primary-foreground whitespace-nowrap min-[1280px]:block"
          >
            {t("site.cta.platform", "Accéder à la plateforme")}
          </Link>
        </div>
      </div>

      {menuOpen && (
        <div
          className="border-t border-[var(--line)] bg-background/[.97] backdrop-blur-[14px] min-[1280px]:hidden"
          style={{ animation: "menuIn .42s cubic-bezier(.16,1,.3,1) both" }}
        >
          <div className="flex flex-col gap-px bg-[var(--line)] px-8 pb-[26px] pt-2">
            {SITE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`bg-background px-[18px] py-[19px] text-start font-condensed text-[15px] font-semibold uppercase tracking-[.28em] ${
                  pathname === link.href ? "text-gold" : "text-foreground/70"
                }`}
              >
                {t(link.key, link.fallback)}
              </Link>
            ))}
            <Link
              href="/contact"
              className="bg-background px-[18px] py-[19px] text-start font-condensed text-[15px] font-semibold uppercase tracking-[.28em] text-gold"
            >
              {t("site.quote.eyebrow", "Accès")}
            </Link>
            {/* L'action principale de la barre, reprise ici puisqu'elle est
                masquée en écran étroit. Traitée en pleine largeur et en doré
                plein : c'est la destination du site, pas un lien parmi d'autres. */}
            <Link
              href="/dashboard"
              className="bg-gold px-[18px] py-[19px] text-start font-condensed text-[15px] font-bold uppercase tracking-[.28em] text-primary-foreground"
            >
              {t("site.cta.platform", "Accéder à la plateforme")}
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
