"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n-context"

const partners = [
  "DHL", "CMA CGM", "Maersk", "Bolloré", "SGS", "Bureau Veritas",
  "Ecobank", "Rawbank", "BGFI", "Standard Chartered",
]

export default function TrustStrip() {
  const { t } = useLanguage()
  return (
    <section className="py-12 overflow-hidden" style={{ background: "hsl(216 45% 4%)", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="max-w-7xl mx-auto px-6 mb-6">
        <p className="font-condensed text-xs text-white/20 tracking-[0.5em] uppercase text-center">{t("truststrip.title", "Partenaires de confiance")}</p>
      </div>
      <div className="flex overflow-hidden">
        <motion.div className="flex gap-16 items-center flex-shrink-0" animate={{ x: ["0%", "-50%"] }} transition={{ repeat: Infinity, duration: 25, ease: "linear" }}>
          {[...partners, ...partners].map((name, i) => (
            <div key={i} className="flex-shrink-0">
              <span className="font-condensed text-lg text-white/15 tracking-[0.3em] uppercase whitespace-nowrap">{name}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
