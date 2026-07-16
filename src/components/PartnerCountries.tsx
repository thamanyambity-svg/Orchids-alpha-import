"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const countries = [
  { flag: "🇨🇩", code: "DRC", name: "Congo-Kinshasa", cities: ["Kinshasa", "Lubumbashi", "Matadi"], desc: "Hub central — siège opérationnel de la plateforme. Porte d'entrée vers l'Afrique centrale.", accent: "#4caf50",
    img: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80&fit=crop" },
  { flag: "🇨🇳", code: "CHN", name: "Chine", cities: ["Shanghai", "Guangzhou", "Shenzhen"], desc: "Premier fournisseur mondial. Textiles, électronique, machinerie industrielle à prix compétitifs.", accent: "#e53935",
    img: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1600&q=80&fit=crop" },
  { flag: "🇹🇷", code: "TUR", name: "Turquie", cities: ["Istanbul", "Ankara", "Izmir"], desc: "Carrefour Europe-Asie. Textile, construction, agroalimentaire et hub de transit stratégique.", accent: "#ff5722",
    img: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1600&q=80&fit=crop" },
  { flag: "🇯🇵", code: "JPN", name: "Japon", cities: ["Tokyo", "Osaka", "Yokohama"], desc: "Technologie de pointe, automobile, électronique et équipements industriels haut de gamme.", accent: "#e91e63",
    img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&q=80&fit=crop" },
  { flag: "🇹🇭", code: "THA", name: "Thaïlande", cities: ["Bangkok", "Chiang Mai", "Phuket"], desc: "Agro-industrie, caoutchouc, électronique et plateforme régionale d'export vers l'Asie du Sud-Est.", accent: "#ffc107",
    img: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1600&q=80&fit=crop" },
]

export default function PartnerCountries() {
  const [active, setActive] = useState(0)

  return (
    <section id="partenaires" className="relative min-h-screen overflow-hidden flex flex-col" style={{ background: "hsl(216 45% 5%)" }}>
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="sync">
          {countries.map((c, i) =>
            i === active ? (
              <motion.div key={c.code} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: "easeInOut" }}>
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${c.img}")` }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(6,16,30,0.97) 0%, rgba(6,16,30,0.80) 50%, rgba(6,16,30,0.55) 100%)" }} />
                <div className="absolute bottom-0 left-0 right-0 h-48" style={{ background: "linear-gradient(to bottom, transparent, rgba(6,16,30,1))" }} />
              </motion.div>
            ) : null
          )}
        </AnimatePresence>
        <div className="absolute inset-0 diagonal-lines opacity-20 pointer-events-none z-10" />
      </div>

      <div className="relative z-20 flex flex-col min-h-screen py-24 px-6 md:px-16 max-w-7xl mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-16">
          <p className="font-condensed text-xs text-gold tracking-[0.5em] uppercase mb-3">Notre réseau mondial</p>
          <h2 className="font-display text-[12vw] md:text-[8vw] lg:text-[7vw] text-white leading-none">PAYS <span className="text-gradient-gold">PARTENAIRES</span></h2>
          <div className="flex items-center gap-4 mt-4">
            <div className="w-16 h-[2px] bg-gold" />
            <div className="w-4 h-[2px] bg-gold/40" />
          </div>
        </motion.div>

        <div className="flex-1 flex flex-col lg:flex-row gap-12 items-start">
          <div className="flex-1 max-w-xl">
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
                <div className="flex items-center gap-5 mb-6">
                  <span className="text-6xl">{countries[active].flag}</span>
                  <div>
                    <p className="font-condensed text-xs tracking-[0.4em] uppercase mb-1" style={{ color: countries[active].accent }}>{countries[active].code}</p>
                    <h3 className="font-display text-5xl md:text-6xl text-white leading-none tracking-wider">{countries[active].name}</h3>
                  </div>
                </div>
                <p className="font-sans text-base text-white/60 leading-relaxed mb-8 max-w-md">{countries[active].desc}</p>
                <div className="flex flex-wrap gap-2 mb-10">
                  {countries[active].cities.map((city) => (
                    <span key={city} className="font-condensed text-xs tracking-widest uppercase px-4 py-2 border" style={{ borderColor: `${countries[active].accent}40`, color: `${countries[active].accent}cc`, background: `${countries[active].accent}10` }}>{city}</span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <motion.div className="h-[2px] w-24" style={{ background: countries[active].accent }} layoutId="accent-bar" transition={{ duration: 0.4 }} />
                  <span className="font-condensed text-xs text-white/30 tracking-widest uppercase">Partenaire actif</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-auto pt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {countries.map((c, i) => (
            <motion.button key={c.code} onHoverStart={() => setActive(i)} onClick={() => setActive(i)} whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}
              className="relative p-4 border text-left transition-colors duration-200"
              style={{
                background: i === active ? `${c.accent}15` : "rgba(6,16,30,0.6)",
                borderColor: i === active ? `${c.accent}60` : "rgba(255,255,255,0.06)",
              }}
            >
              <div className="text-2xl mb-1">{c.flag}</div>
              <p className="font-display text-lg text-white tracking-wider">{c.name}</p>
              <p className="font-condensed text-xs text-white/30 tracking-widest uppercase mt-1">{c.code}</p>
              {i === active && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: c.accent }} />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  )
}
