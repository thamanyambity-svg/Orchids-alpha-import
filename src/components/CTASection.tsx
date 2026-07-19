"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n-context"

export default function CTASection() {
  const { t } = useLanguage()
  return (
    <section className="py-32 px-6 relative overflow-hidden" style={{ background: "hsl(216 45% 4%)" }}>
      <div className="absolute inset-0 diagonal-lines-strong opacity-10 pointer-events-none" />
      <div className="max-w-4xl mx-auto relative z-10 text-center">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <p className="font-condensed text-xs text-gold tracking-[0.5em] uppercase mb-4">{t("cta.subtitle", "Prêt à transformer votre supply chain ?")}</p>
          <h2 className="font-display text-[12vw] md:text-[7vw] lg:text-[6vw] text-white leading-none mb-8">{t("cta.title.prefix", "REJOIGNEZ")} <span className="text-gradient-gold">{t("cta.title", "L'EXCELLENCE")}</span></h2>
          <p className="font-sans text-base text-white/40 max-w-lg mx-auto mb-10">{t("cta.desc", "Plus de 1 200 entreprises partenaires nous font déjà confiance pour leurs importations. Rejoignez le réseau Alpha Import dès aujourd'hui.")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="font-condensed text-sm font-bold px-12 py-4 bg-gold text-[#06101e] hover:bg-[hsl(44_90%_65%)] transition-all duration-200 tracking-[0.3em] uppercase glow-gold">
              {t("cta.button", "Créer un compte")}
            </Link>
            <Link href="/contact" className="font-condensed text-sm px-12 py-4 border border-white/25 text-white/80 hover:border-gold hover:text-gold transition-all duration-200 tracking-[0.3em] uppercase">
              {t("cta.contact", "Nous contacter →")}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
