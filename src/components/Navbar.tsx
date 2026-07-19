"use client"

import { useState, useEffect } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import Link from "next/link"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/lib/i18n-context"

const NAV_LINKS = [
  { key: "nav.about", label: "Qui sommes-nous", href: "/about" },
  { key: "nav.services", label: "Services", href: "#services" },
  { key: "nav.partners", label: "Partenaires", href: "#partenaires" },
  { key: "nav.how-it-works", label: "Comment ça marche", href: "/how-it-works" },
  { key: "nav.quote", label: "Devis", href: "#devis" },
  { key: "nav.contact", label: "Contact", href: "#contact" },
]

export default function Navbar() {
  const { t } = useLanguage()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { scrollY } = useScroll()

  useEffect(() => {
    const unsub = scrollY.on("change", (y) => {
      setScrolled(y > 80)
    })
    return unsub
  }, [scrollY])

  const py = useTransform(scrollY, [0, 120], [28, 14])
  const logoSize = useTransform(scrollY, [0, 120], [1.25, 1])
  const bgOpacity = useTransform(scrollY, [0, 80], [0, 1])

  return (
    <>
      <motion.div className="fixed top-0 left-0 right-0 z-50 pointer-events-none" style={{ opacity: bgOpacity }}>
        <div className="absolute inset-0" style={{ background: "rgba(6, 16, 30, 0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }} />
        <motion.div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, transparent 0%, hsl(42 85% 55% / 0.5) 50%, transparent 100%)", opacity: bgOpacity }} />
      </motion.div>

      <motion.nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-16" style={{ paddingTop: py, paddingBottom: py }}>
        <motion.a href="/" className="flex items-center gap-3 flex-shrink-0" style={{ scale: logoSize, transformOrigin: "left center" }} whileHover={{ opacity: 0.9 }} transition={{ duration: 0.15 }}>
          <div className="flex flex-col">
            <span className="font-display text-3xl text-white drop-shadow-[0_0_16px_hsl(42_85%_55%/0.5)]">ALPHA IMPORT</span>
            <span className="font-condensed text-[8px] text-white/30 tracking-[0.18em] uppercase leading-none mt-0.5">
              Filiale du Groupe A.Onoseke Investment RDC
            </span>
          </div>
        </motion.a>

        <div className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link key={link.key} href={link.href}>
              <motion.span className="relative font-condensed text-xs tracking-[0.35em] uppercase text-white/55 hover:text-white transition-colors duration-200 group cursor-pointer" whileHover={{ y: -1 }} transition={{ duration: 0.15 }}>
                {t(link.key, link.label)}
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-250 origin-left" />
              </motion.span>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link href="/login">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }} className="hidden sm:flex font-condensed text-xs px-6 py-2.5 border border-gold text-gold hover:bg-gold hover:text-[#06101e] transition-all duration-200 tracking-[0.25em] uppercase" style={{ boxShadow: scrolled ? "0 0 20px -5px hsl(42 85% 55% / 0.3)" : "none" }}>
              {t("nav.login", "Connexion")}
            </motion.button>
          </Link>

          <button className="lg:hidden flex flex-col gap-1.5 p-2" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
            <motion.span className="block w-6 h-px bg-white" animate={menuOpen ? { rotate: 45, y: 4 } : { rotate: 0, y: 0 }} transition={{ duration: 0.25 }} />
            <motion.span className="block w-6 h-px bg-white" animate={menuOpen ? { opacity: 0, x: -8 } : { opacity: 1, x: 0 }} transition={{ duration: 0.2 }} />
            <motion.span className="block w-6 h-px bg-white" animate={menuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }} transition={{ duration: 0.25 }} />
          </button>
        </div>
      </motion.nav>

      <motion.div className="fixed top-0 left-0 right-0 bottom-0 z-40 flex flex-col pt-24 px-8 pb-10 lg:hidden" initial={false} animate={menuOpen ? { opacity: 1, pointerEvents: "auto" as const } : { opacity: 0, pointerEvents: "none" as const }} transition={{ duration: 0.3 }} style={{ background: "rgba(6,16,30,0.97)", backdropFilter: "blur(20px)" }}>
        <div className="flex flex-col gap-1 flex-1">
          {NAV_LINKS.map((link, i) => (
            <Link key={link.key} href={link.href} onClick={() => setMenuOpen(false)}>
              <motion.span className="block font-display text-4xl text-white/70 hover:text-white hover:text-gradient-gold py-4 border-b border-white/6 transition-colors duration-200 cursor-pointer" initial={false} animate={menuOpen ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }} transition={{ duration: 0.3, delay: menuOpen ? i * 0.07 : 0 }}>
                {t(link.key, link.label)}
              </motion.span>
            </Link>
          ))}
        </div>
        <div className="flex items-center justify-center mt-6">
          <LanguageSwitcher />
        </div>
        <Link href="/register">
          <motion.button className="w-full font-condensed text-sm font-bold py-5 bg-gold text-[#06101e] tracking-[0.3em] uppercase glow-gold mt-8" initial={false} animate={menuOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }} transition={{ duration: 0.3, delay: 0.35 }}>
            {t("hero.cta.platform", "Accéder à la plateforme")}
          </motion.button>
        </Link>
      </motion.div>
    </>
  )
}
