"use client"

import { motion } from "framer-motion"

const services = [
  {
    num: "01", title: "Gestion des Imports",
    desc: "Solutions import clé en main. Coordination totale depuis le fournisseur jusqu'à votre entrepôt en DRC.",
    detail: "Sourcing · Négociation · Transport · Réception",
    img: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=900&q=75&fit=crop",
  },
  {
    num: "02", title: "Logistique Export",
    desc: "Pipelines d'export fiables reliant l'Afrique aux marchés mondiaux avec rapidité et précision.",
    detail: "Conditionnement · Fret maritime · Tracking GPS",
    img: "https://images.unsplash.com/photo-1494412519320-aa613dfb7738?w=900&q=75&fit=crop",
  },
  {
    num: "03", title: "Dédouanement",
    desc: "Agents portuaires dédiés pour des procédures accélérées. Conformité douanière garantie dans 47 pays.",
    detail: "DRC · Belgique · Chine · UAE · USA",
    img: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=900&q=75&fit=crop",
  },
  {
    num: "04", title: "Analyse Supply Chain",
    desc: "Tableaux de bord en temps réel et modélisation prédictive pour optimiser votre chaîne logistique.",
    detail: "KPI Live · Prévision · Optimisation coûts",
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=75&fit=crop",
  },
]

export default function Services() {
  return (
    <section id="services" className="py-32 px-6 relative overflow-hidden" style={{ background: "hsl(216 45% 6%)" }}>
      <div className="absolute inset-0 diagonal-lines opacity-25 pointer-events-none" />
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-20">
          <p className="font-condensed text-xs text-gold tracking-[0.5em] uppercase mb-3">Ce que nous faisons</p>
          <h2 className="font-display text-[12vw] md:text-[8vw] lg:text-[7vw] text-white leading-none">NOS <span className="text-gradient-gold">SERVICES</span></h2>
          <div className="flex items-center gap-4 mt-4">
            <div className="w-16 h-[2px] bg-gold" />
            <div className="w-4 h-[2px] bg-gold/40" />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((svc, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ delay: i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="relative overflow-hidden group" style={{ minHeight: 320 }}>
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url("${svc.img}")` }} />
              <div className="absolute inset-0 transition-opacity duration-500" style={{ background: "linear-gradient(135deg, rgba(6,16,30,0.92) 0%, rgba(6,16,30,0.70) 50%, rgba(6,16,30,0.45) 100%)" }} />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: "linear-gradient(135deg, hsl(42 85% 55% / 0.08) 0%, transparent 60%)" }} />
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

              <div className="relative z-10 p-10 h-full flex flex-col justify-between" style={{ minHeight: 320 }}>
                <div className="flex justify-between items-start">
                  <span className="font-display text-7xl text-white/8 group-hover:text-gold/20 transition-colors duration-400 leading-none select-none">{svc.num}</span>
                  <motion.span className="font-condensed text-xs text-gold/0 group-hover:text-gold/70 tracking-widest uppercase transition-all duration-300 mt-3" style={{ letterSpacing: "0.3em" }}>VOIR →</motion.span>
                </div>
                <div>
                  <h3 className="font-display text-3xl md:text-4xl text-white tracking-wider mb-4 group-hover:text-gradient-gold transition-all duration-400">{svc.title}</h3>
                  <p className="font-sans text-sm text-white/60 leading-relaxed mb-5 max-w-sm">{svc.desc}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-px bg-gold/50" />
                    <p className="font-condensed text-xs text-gold/60 tracking-widest uppercase">{svc.detail}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
