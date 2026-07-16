"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const steps = [
  { num: "01", title: "Inscription & Vérification", desc: "Créez votre compte professionnel en 5 minutes. Vérification KYB accélérée par nos équipes dédiées. Accès immédiat au tableau de bord.", detail: ["Création de compte", "Vérification KYB", "Accès instantané"],
    img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=80&fit=crop" },
  { num: "02", title: "Définir Votre Besoin", desc: "Renseignez vos marchandises, origines et destinations. Notre IA calcule la route optimale en temps réel et génère un devis sous 2 heures.", detail: ["Type de marchandise", "Origine & Destination", "Volume & Délais"],
    img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&q=80&fit=crop" },
  { num: "03", title: "Approbation & Paiement", desc: "Recevez votre devis personnalisé. Paiement sécurisé 256-bit avec fonds en escrow. Votre argent est protégé jusqu'à la livraison confirmée.", detail: ["Devis en 2h", "Paiement sécurisé", "Fonds en escrow"],
    img: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=900&q=80&fit=crop" },
  { num: "04", title: "Suivi Temps Réel", desc: "Dashboard live avec position GPS de votre cargaison, alertes douanières automatiques, et notifications push à chaque étape clé. Livraison garantie.", detail: ["GPS Live", "Alertes douanes", "Notifications push"],
    img: "https://images.unsplash.com/photo-1494412519320-aa613dfb7738?w=900&q=80&fit=crop" },
]

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0)

  return (
    <section id="comment-ca-marche" className="relative min-h-screen overflow-hidden" style={{ background: "hsl(216 45% 5%)" }}>
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="sync">
          {steps.map((s, i) =>
            i === activeStep ? (
              <motion.div key={s.num} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${s.img}")` }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(6,16,30,0.98) 0%, rgba(6,16,30,0.85) 45%, rgba(6,16,30,0.40) 100%)" }} />
                <div className="absolute inset-x-0 top-0 h-32" style={{ background: "linear-gradient(to bottom, rgba(6,16,30,1), transparent)" }} />
                <div className="absolute inset-x-0 bottom-0 h-32" style={{ background: "linear-gradient(to top, rgba(6,16,30,1), transparent)" }} />
              </motion.div>
            ) : null
          )}
        </AnimatePresence>
        <div className="absolute inset-0 diagonal-lines opacity-15 pointer-events-none z-10" />
      </div>

      <div className="relative z-20 max-w-7xl mx-auto px-6 md:px-16 py-24 min-h-screen flex flex-col">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-16">
          <p className="font-condensed text-xs text-gold tracking-[0.5em] uppercase mb-3">Processus simplifié</p>
          <h2 className="font-display text-[12vw] md:text-[8vw] lg:text-[7vw] text-white leading-none">COMMENT <span className="text-gradient-gold">ÇA MARCHE</span></h2>
          <div className="flex items-center gap-4 mt-4">
            <div className="w-16 h-[2px] bg-gold" />
            <div className="w-4 h-[2px] bg-gold/40" />
          </div>
        </motion.div>

        <div className="flex-1 flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
          <div className="w-full lg:w-64 xl:w-72 flex-shrink-0">
            <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {steps.map((s, i) => (
                <motion.button key={s.num} onClick={() => setActiveStep(i)} whileTap={{ scale: 0.97 }} className="relative flex-shrink-0 flex items-center gap-4 p-5 border text-left transition-all duration-250" style={{ background: activeStep === i ? "rgba(42,65,85,0.5)" : "rgba(6,16,30,0.6)", borderColor: activeStep === i ? "hsl(42 85% 55% / 0.5)" : "rgba(255,255,255,0.06)" }}>
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] transition-all duration-300" style={{ background: "hsl(42 85% 55%)", opacity: activeStep === i ? 1 : 0, transform: activeStep === i ? "scaleY(1)" : "scaleY(0)", transformOrigin: "top" }} />
                  <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center border transition-colors duration-250" style={{ borderColor: activeStep === i ? "hsl(42 85% 55%)" : "rgba(255,255,255,0.12)", background: activeStep === i ? "hsl(42 85% 55% / 0.1)" : "transparent" }}>
                    <span className="font-display text-2xl transition-colors duration-250" style={{ color: activeStep === i ? "hsl(42 85% 55%)" : "rgba(255,255,255,0.3)" }}>{s.num}</span>
                  </div>
                  <div className="hidden lg:block">
                    <p className="font-condensed text-sm font-semibold tracking-wider transition-colors duration-250 leading-tight" style={{ color: activeStep === i ? "white" : "rgba(255,255,255,0.4)" }}>{s.title}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="flex-1 max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div key={activeStep} initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
                <div className="mb-6">
                  <span className="font-display text-[18vw] md:text-[10vw] text-gradient-gold leading-none opacity-90">{steps[activeStep].num}</span>
                </div>
                <h3 className="font-display text-4xl md:text-5xl lg:text-6xl text-white tracking-wider leading-none mb-6">{steps[activeStep].title}</h3>
                <p className="font-sans text-base text-white/60 leading-relaxed mb-10 max-w-lg">{steps[activeStep].desc}</p>
                <div className="flex flex-wrap gap-3 mb-10">
                  {steps[activeStep].detail.map((d, di) => (
                    <motion.div key={d} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: di * 0.07 }} className="flex items-center gap-2 border border-gold/20 px-4 py-2" style={{ background: "hsl(42 85% 55% / 0.06)" }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                      <span className="font-condensed text-xs text-white/60 tracking-widest uppercase">{d}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  {steps.map((_, si) => (
                    <button key={si} onClick={() => setActiveStep(si)} className={`transition-all duration-300 ${si === activeStep ? "w-8 h-1 bg-gold" : "w-4 h-1 bg-white/20"}`} />
                  ))}
                  <span className="font-condensed text-xs text-white/25 tracking-widest ml-2">{activeStep + 1} / {steps.length}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
