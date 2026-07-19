"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n-context"

export default function QuoteForm() {
  const { t } = useLanguage()
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 5000)
  }

  return (
    <section id="devis" className="py-24 px-6 relative overflow-hidden" style={{ background: "hsl(216 45% 5%)" }}>
      <div className="absolute inset-0 pattern-grid opacity-20 pointer-events-none" />
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-12 text-center">
          <p className="font-condensed text-xs text-gold tracking-[0.5em] uppercase mb-3">{t("quote.subtitle", "Demande de devis")}</p>
          <h2 className="font-display text-[12vw] md:text-[8vw] lg:text-[6vw] text-white leading-none">{t("quote.title_demandez", "DEMANDEZ VOTRE")} <span className="text-gradient-gold">{t("quote.title_devis", "DEVIS")}</span></h2>
          <p className="font-sans text-sm text-white/40 mt-4 max-w-lg mx-auto">{t("quote.description", "Soumettez votre demande et recevez un devis personnalisé sous 2 heures ouvrées.")}</p>
        </motion.div>

        {submitted ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 border border-gold/30" style={{ background: "hsl(42 85% 55% / 0.06)" }}>
            <div className="font-display text-6xl text-gold mb-4">✓</div>
            <h3 className="font-display text-3xl text-white tracking-wider mb-3">{t("quote.success_title", "Devis reçu !")}</h3>
            <p className="font-sans text-sm text-white/60">{t("quote.success_message", "Notre équipe vous contactera sous 2 heures ouvrées.")}</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="font-condensed text-xs text-white/40 tracking-widest uppercase block mb-2">{t("quote.type_label", "Type de marchandise")}</label>
              <select className="w-full px-5 py-4 border bg-transparent text-white text-sm transition-colors duration-200 focus:border-gold focus:outline-none" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                <option className="bg-[#0a1628]" value="">{t("quote.select_placeholder", "Sélectionnez...")}</option>
                <option className="bg-[#0a1628]" value="textile">{t("quote.type_textile", "Textile & Vêtements")}</option>
                <option className="bg-[#0a1628]" value="electronique">{t("quote.type_electronique", "Électronique")}</option>
                <option className="bg-[#0a1628]" value="agro">{t("quote.type_agro", "Agroalimentaire")}</option>
                <option className="bg-[#0a1628]" value="machinerie">{t("quote.type_machinerie", "Machinerie industrielle")}</option>
                <option className="bg-[#0a1628]" value="auto">{t("quote.type_auto", "Automobile & Pièces")}</option>
                <option className="bg-[#0a1628]" value="autre">{t("quote.type_autre", "Autre")}</option>
              </select>
            </div>
            <div>
              <label className="font-condensed text-xs text-white/40 tracking-widest uppercase block mb-2">{t("quote.origin_label", "Pays d'origine")}</label>
              <select className="w-full px-5 py-4 border bg-transparent text-white text-sm transition-colors duration-200 focus:border-gold focus:outline-none" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                <option className="bg-[#0a1628]" value="">{t("quote.select_placeholder", "Sélectionnez...")}</option>
                <option className="bg-[#0a1628]" value="Chine">{t("quote.origin_china", "Chine")}</option>
                <option className="bg-[#0a1628]" value="Turquie">{t("quote.origin_turkey", "Turquie")}</option>
                <option className="bg-[#0a1628]" value="Japon">{t("quote.origin_japan", "Japon")}</option>
                <option className="bg-[#0a1628]" value="Thailande">{t("quote.origin_thailand", "Thaïlande")}</option>
                <option className="bg-[#0a1628]" value="UAE">{t("quote.origin_uae", "Émirats Arabes Unis")}</option>
              </select>
            </div>
            <div>
              <label className="font-condensed text-xs text-white/40 tracking-widest uppercase block mb-2">{t("quote.volume_label", "Volume mensuel estimé")}</label>
              <select className="w-full px-5 py-4 border bg-transparent text-white text-sm transition-colors duration-200 focus:border-gold focus:outline-none" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                <option className="bg-[#0a1628]" value="">{t("quote.select_placeholder", "Sélectionnez...")}</option>
                <option className="bg-[#0a1628]" value="1-5">{t("quote.volume_1_5", "1-5 conteneurs")}</option>
                <option className="bg-[#0a1628]" value="6-20">{t("quote.volume_6_20", "6-20 conteneurs")}</option>
                <option className="bg-[#0a1628]" value="21-50">{t("quote.volume_21_50", "21-50 conteneurs")}</option>
                <option className="bg-[#0a1628]" value="50+">{t("quote.volume_50_plus", "50+ conteneurs")}</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="font-condensed text-xs text-white/40 tracking-widest uppercase block mb-2">{t("quote.email_label", "Votre email")}</label>
              <input type="email" required placeholder={t("quote.email_placeholder", "email@exemple.com")} className="w-full px-5 py-4 border bg-transparent text-white text-sm transition-colors duration-200 focus:border-gold focus:outline-none" style={{ borderColor: "rgba(255,255,255,0.12)" }} />
            </div>
            <div className="md:col-span-2">
              <label className="font-condensed text-xs text-white/40 tracking-widest uppercase block mb-2">{t("quote.details_label", "Détails supplémentaires")}</label>
              <textarea rows={3} placeholder={t("quote.details_placeholder", "Produits, quantités, délais souhaités...")} className="w-full px-5 py-4 border bg-transparent text-white text-sm transition-colors duration-200 focus:border-gold focus:outline-none resize-none" style={{ borderColor: "rgba(255,255,255,0.12)" }} />
            </div>
            <div className="md:col-span-2">
              <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="w-full font-condensed text-sm font-bold py-5 bg-gold text-[#06101e] hover:bg-[hsl(44_90%_65%)] transition-all duration-200 tracking-[0.3em] uppercase glow-gold">
                {t("quote.submit", "Obtenir mon devis")}
              </motion.button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
