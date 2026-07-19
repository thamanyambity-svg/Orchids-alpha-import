"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n-context"

export default function Metrics() {
  const { t } = useLanguage()

  const stats = [
    { val: "$2.4B+", label: t("metrics.stat.goods", "Marchandises déplacées") },
    { val: "47", label: t("metrics.stat.countries", "Pays partenaires") },
    { val: "1 200+", label: t("metrics.stat.partners", "Partenaires actifs") },
    { val: "99.2%", label: t("metrics.stat.satisfaction", "Taux de satisfaction") },
    { val: "5 000+", label: t("metrics.containers", "Conteneurs traités") },
    { val: "98%", label: t("metrics.ontime", "Livraisons à temps") },
  ]
  return (
    <section className="py-24 px-6 relative overflow-hidden" style={{ background: "hsl(216 45% 4%)" }}>
      <div className="absolute inset-0 diagonal-lines-strong opacity-15 pointer-events-none" />
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-16 text-center">
          <p className="font-condensed text-xs text-gold tracking-[0.5em] uppercase mb-3">{t("metrics.subtitle", "Chiffres clés")}</p>
          <h2 className="font-display text-[12vw] md:text-[8vw] lg:text-[6vw] text-white leading-none">{t("metrics.title.prefix", "ALPHA IMPORT")} <span className="text-gradient-gold">{t("metrics.title.suffix", "EN CHIFFRES")}</span></h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {stats.map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }} className="text-center group">
              <div className="font-display text-4xl md:text-5xl text-gradient-gold mb-2 group-hover:scale-110 transition-transform duration-300">{stat.val}</div>
              <div className="font-condensed text-xs text-white/40 uppercase tracking-widest">{stat.label}</div>
              {i < stats.length - 1 && <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-px h-12 bg-white/5" />}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
