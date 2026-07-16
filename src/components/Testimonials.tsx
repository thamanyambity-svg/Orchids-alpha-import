"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const testimonials = [
  { name: "Jean-Pierre Kasongo", role: "CEO, Kin Logistics SARL", quote: "Alpha Import a transformé notre chaîne d'approvisionnement. Nos conteneurs arrivent de Shanghai à Kinshasa en 28 jours chrono, avec un suivi GPS en temps réel. Le paiement sécurisé 60/40 nous a donné une tranquillité d'esprit totale.", rating: 5, location: "Kinshasa, RDC" },
  { name: "Fatima Al-Mansouri", role: "Directrice Achats, Emirates Traders", quote: "La plateforme est incroyablement fluide. Le dédouanement qui prenait 2 semaines se fait maintenant en 72h. L'équipe Alpha Import maîtrise parfaitement les corridors Doubaï-Kinshasa.", rating: 5, location: "Dubai, UAE" },
  { name: "Liu Wei", role: "Export Manager, Guangzhou Industries", quote: "Travailler avec Alpha Import, c'est la garantie d'un partenaire fiable pour le marché congolais. Leurs procédures de vérification KYC sont rigoureuses, et le paiement est toujours garanti.", rating: 5, location: "Guangzhou, Chine" },
  { name: "Marie Bisimwa", role: "Fondatrice, Bukavu Distribution", quote: "Je suis passée de 2 à 15 conteneurs par mois grâce à Alpha Import. Leur service client est réactif et les délais de livraison sont constamment respectés. Je recommande à 100%.", rating: 5, location: "Bukavu, RDC" },
]

export default function Testimonials() {
  const [active, setActive] = useState(0)

  return (
    <section className="py-24 px-6 relative overflow-hidden" style={{ background: "hsl(216 45% 6%)" }}>
      <div className="absolute inset-0 diagonal-lines opacity-15 pointer-events-none" />
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-16">
          <p className="font-condensed text-xs text-gold tracking-[0.5em] uppercase mb-3">Ils nous font confiance</p>
          <h2 className="font-display text-[12vw] md:text-[8vw] lg:text-[7vw] text-white leading-none">TÉMOIGNAGES</h2>
          <div className="flex items-center gap-4 mt-4">
            <div className="w-16 h-[2px] bg-gold" />
            <div className="w-4 h-[2px] bg-gold/40" />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
                <div className="mb-6">
                  {[...Array(testimonials[active].rating)].map((_, i) => (
                    <span key={i} className="text-gold text-2xl mr-1">★</span>
                  ))}
                </div>
                <blockquote className="font-sans text-xl md:text-2xl text-white/80 leading-relaxed mb-8 italic">&ldquo;{testimonials[active].quote}&rdquo;</blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center">
                    <span className="font-display text-xl text-gold">{testimonials[active].name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-display text-lg text-white tracking-wider">{testimonials[active].name}</p>
                    <p className="font-condensed text-xs text-white/40 tracking-widest uppercase">{testimonials[active].role}</p>
                    <p className="font-condensed text-xs text-gold/60 tracking-widest uppercase mt-0.5">{testimonials[active].location}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="lg:col-span-2 flex flex-row lg:flex-col gap-3 overflow-x-auto">
            {testimonials.map((t, i) => (
              <motion.button key={i} onClick={() => setActive(i)} whileHover={{ x: 4 }} className="flex-shrink-0 text-left p-5 border transition-all duration-200 w-64 lg:w-auto" style={{ background: i === active ? "hsl(42 85% 55% / 0.08)" : "rgba(6,16,30,0.6)", borderColor: i === active ? "hsl(42 85% 55% / 0.4)" : "rgba(255,255,255,0.06)" }}>
                <p className="font-display text-white text-sm tracking-wider truncate">{t.name}</p>
                <p className="font-condensed text-xs text-white/30 tracking-widest uppercase truncate mt-0.5">{t.location}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
