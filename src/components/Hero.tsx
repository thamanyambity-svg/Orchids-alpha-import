"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n-context"

export default function Hero() {
  const [current, setCurrent] = useState(0)
  const { t } = useLanguage()

  const slides = [
    {
      bg: null, isCss: true,
      cssStyle: { background: "radial-gradient(ellipse at 30% 60%, #1a3a5c 0%, #0a1628 45%, #06101e 100%)" },
      tag: t("hero.tag.kinshasa", "KINSHASA · DRC"),
      headline: t("hero.headline.africa", "L'AFRIQUE"),
      sub: t("hero.sub.connected", "CONNECTÉE AU MONDE"),
    },
    {
      bg: null, isCss: true,
      cssStyle: { background: "radial-gradient(ellipse at 70% 40%, #1c2f1a 0%, #0d1f14 30%, #0a1628 70%, #06101e 100%)" },
      tag: t("hero.tag.shanghai", "SHANGHAI · DUBAI · TOKYO"),
      headline: t("hero.headline.speed", "VITESSE"),
      sub: t("hero.sub.nocompromise", "SANS COMPROMIS"),
    },
    {
      bg: null, isCss: true,
      cssStyle: { background: "radial-gradient(ellipse at 50% 30%, #2a1f08 0%, #1a1406 30%, #0a1628 70%, #06101e 100%)" },
      tag: t("hero.tag.countries", "47 PAYS PARTENAIRES"),
      headline: t("hero.headline.security", "SÉCURITÉ"),
      sub: t("hero.sub.iso", "CERTIFIÉE ISO 9001"),
    },
    {
      bg: null, isCss: true,
      cssStyle: { background: "radial-gradient(ellipse at 30% 60%, #1a0a2a 0%, #0a1628 45%, #06101e 100%)" },
      tag: t("hero.tag.global", "BRUXELLES · NEW YORK · GUANGZHOU"),
      headline: t("hero.headline.trust", "CONFIANCE"),
      sub: t("hero.sub.global", "VOTRE PARTENAIRE GLOBAL"),
    },
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const slide = slides[current]

  return (
    <section className="relative w-full h-screen min-h-[600px] flex flex-col items-center justify-center overflow-hidden">
      <AnimatePresence>
        {slides.map((s, i) =>
          i === current ? (
            <motion.div
              key={i}
              className="absolute inset-0 z-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
            >
              <div className="absolute inset-0" style={s.cssStyle as React.CSSProperties} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(6,16,30,0.55) 0%, rgba(6,16,30,0.3) 40%, rgba(6,16,30,0.75) 85%, rgba(6,16,30,1) 100%)" }} />
            </motion.div>
          ) : null
        )}
      </AnimatePresence>

      <svg className="absolute inset-0 w-full h-full z-[1] pointer-events-none" preserveAspectRatio="none">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((_, i) => (
          <line key={i} x1={`${-10 + i * 18}%`} y1="120%" x2={`${20 + i * 18}%`} y2="-20%" stroke="hsl(42 85% 55%)" strokeWidth="0.8" strokeOpacity={i % 3 === 0 ? "0.25" : "0.08"} />
        ))}
        <motion.line x1="75%" y1="100%" x2="100%" y2="0%" stroke="hsl(42 85% 55%)" strokeWidth="1.5" strokeOpacity="0.45" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: 0.5 }} />
        <motion.line x1="65%" y1="110%" x2="92%" y2="-5%" stroke="hsl(42 85% 55%)" strokeWidth="0.8" strokeOpacity="0.2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.5, delay: 0.8 }} />
      </svg>

      <div className="relative z-10 px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-end md:items-center pr-4 md:pr-0">
          <AnimatePresence mode="wait">
            <motion.p key={`tag-${current}`} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.5 }} className="font-condensed text-xs md:text-sm text-gold tracking-[0.5em] uppercase mb-6 font-semibold">
              {slide.tag}
            </motion.p>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.h1 key={`h1-${current}`} initial={{ opacity: 0, y: 50, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30, scale: 1.02 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="font-display text-[14vw] md:text-[16vw] lg:text-[18vw] leading-none text-white tracking-wider mb-0 select-none text-right md:text-center" style={{ lineHeight: "0.88" }}>
              {slide.headline}
            </motion.h1>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.h2 key={`h2-${current}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.6, delay: 0.15 }} className="font-display text-[5vw] md:text-[5vw] lg:text-[5.5vw] leading-none text-gradient-gold tracking-[0.15em] mb-8 text-right md:text-center">
              {slide.sub}
            </motion.h2>
          </AnimatePresence>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.6 }} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/register" className="font-condensed text-sm font-bold px-12 py-4 bg-gold text-[#06101e] hover:bg-[hsl(44_90%_65%)] transition-all duration-200 tracking-[0.3em] uppercase glow-gold">
            Accéder à la plateforme
          </Link>
          <Link href="/how-it-works" className="font-condensed text-sm px-12 py-4 border border-white/25 text-white/80 hover:border-gold hover:text-gold transition-all duration-200 tracking-[0.3em] uppercase">
            Découvrir →
          </Link>
        </motion.div>
      </div>

      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex gap-3">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} className={`transition-all duration-400 ${i === current ? "w-8 h-1 bg-gold" : "w-4 h-1 bg-white/30 hover:bg-white/60"}`} />
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.7 }} className="absolute bottom-0 left-0 right-0 z-20 flex justify-around items-center py-5 px-8 border-t border-white/10" style={{ background: "rgba(6,16,30,0.85)", backdropFilter: "blur(20px)" }}>
        {[
          { val: "$2.4B+", label: t("hero.stat.goods", "Marchandises déplacées") },
          { val: "47", label: t("hero.stat.countries", "Pays partenaires") },
          { val: "1 200+", label: t("hero.stat.partners", "Partenaires actifs") },
          { val: "99.2%", label: t("hero.stat.satisfaction", "Taux de satisfaction") },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <div className="font-display text-2xl md:text-3xl text-gradient-gold">{s.val}</div>
            <div className="font-condensed text-[10px] md:text-xs text-white/40 uppercase tracking-widest">{s.label}</div>
          </div>
        ))}
      </motion.div>

      <motion.div className="absolute bottom-24 right-10 z-20 flex-col items-center gap-2 hidden md:flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
          <span className="font-condensed text-[10px] text-white/30 uppercase tracking-[0.3em] rotate-90 mb-6">{t("hero.scroll", "Scroll")}</span>
        <div className="w-px h-16 bg-gradient-to-b from-gold/60 to-transparent" />
      </motion.div>
    </section>
  )
}
