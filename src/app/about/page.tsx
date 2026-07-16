"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import {
  History,
  Users,
  Globe2,
  Cpu,
  LineChart,
  UserPlus,
  Award,
  ShieldCheck,
  Lightbulb,
  Heart
} from "lucide-react"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { BackButton } from "@/components/back-button"

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: "hsl(216 45% 6%)" }}>
      <PublicHeader />

      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-32 overflow-hidden">
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(6,16,30,0.4) 0%, hsl(216,45%,6%) 100%)" }} />
          <div className="absolute inset-0 diagonal-lines opacity-15 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <BackButton href="/" className="mb-8 text-white/50 hover:text-gold" />
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}>
              <p className="font-condensed text-xs text-gold tracking-[0.5em] uppercase mb-4">Qui sommes-nous</p>
              <h1 className="font-display text-[12vw] md:text-[8vw] lg:text-[7vw] text-white leading-none mb-8">
                A.Onoseke House <br className="hidden md:block" />
                <span className="text-gradient-gold">Investment RDC</span>
              </h1>
              <p className="font-sans text-lg md:text-xl text-white/60 max-w-3xl leading-relaxed">
                Redéfinir l&apos;entrepreneuriat en République Démocratique du Congo à travers l&apos;excellence, l&apos;innovation et l&apos;impact sociétal.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Story */}
        <section className="relative py-32 overflow-hidden border-t border-white/5">
          <div className="absolute inset-0 diagonal-lines opacity-15 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
                <div className="flex items-center gap-2 mb-6">
                  <History className="w-4 h-4 text-gold" />
                  <span className="font-condensed text-xs text-gold tracking-[0.5em] uppercase">Notre Histoire</span>
                </div>
                <h2 className="font-display text-[10vw] md:text-[6vw] text-white leading-none mb-8">
                  Une vision audacieuse <span className="text-gradient-gold">née en 2019</span>
                </h2>
                <div className="space-y-6 font-sans text-white/60 leading-relaxed">
                  <p>
                    Fondé en 2019, le Groupe A.Onoseke House Investment RDC est né d&apos;une volonté audacieuse de redéfinir l&apos;entrepreneuriat en République Démocratique du Congo.
                  </p>
                  <p>
                    Cette structure est le fruit de la synergie entre deux visionnaires qui ont uni leur expertise pour créer un écosystème d&apos;affaires robuste, capable de répondre aux défis complexes du marché congolais tout en s&apos;ouvrant à l&apos;international.
                  </p>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="relative">
                <div className="aspect-[16/9] rounded-3xl overflow-hidden border border-white/10 relative">
                  <Image
                    src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/82c7d68c-6062-41a5-8b3b-7754c84ff796/Gemini_Generated_Image_e4f6lde4f6lde4f6-resized-1767874599274.webp?width=8000&height=8000&resize=contain"
                    alt="Fondation 2019"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="absolute -bottom-6 -right-6 p-8 rounded-2xl border border-white/10" style={{ background: "hsl(216 45% 6% / 0.95)", backdropFilter: "blur(20px)" }}>
                  <div className="font-display text-4xl text-gradient-gold mb-1">2019</div>
                  <div className="font-condensed text-xs text-white/40 tracking-widest uppercase">Année de fondation</div>
                </div>
              </motion.div>
            </div>

            {/* Leadership */}
            <div className="text-center mb-16">
              <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-gold" />
                  <span className="font-condensed text-xs text-gold tracking-[0.5em] uppercase">Notre Leadership</span>
                </div>
                <h2 className="font-display text-[10vw] md:text-[6vw] text-white leading-none">Les Visionnaires</h2>
              </motion.div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              {[
                {
                  src: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/82c7d68c-6062-41a5-8b3b-7754c84ff796/WhatsApp-Image-2026-01-08-at-13.04.14-1767874145685.jpeg?width=8000&height=8000&resize=contain",
                  name: "Monsieur Ambity A.Alpha",
                  role: "Fondateur et initiateur de la vision",
                  delay: 0,
                },
                {
                  src: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/82c7d68c-6062-41a5-8b3b-7754c84ff796/Gemini_Generated_Image_9xvg7g9xvg7g9xvg-1767874145639.png?width=8000&height=8000&resize=contain",
                  name: "Madame Salima Onoseke Nzikisa",
                  role: "Présidente Directrice Générale (PDG)",
                  delay: 0.2,
                },
              ].map((person, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: person.delay }}
                  className="group"
                >
                  <div className="relative aspect-[4/5] rounded-3xl overflow-hidden mb-6 border border-white/10">
                    <Image
                      src={person.src}
                      alt={person.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#06101e]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-display text-2xl text-white mb-1">{person.name}</h3>
                    <p className="font-condensed text-xs text-gold tracking-[0.3em] uppercase">{person.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Expertise Poles */}
        <section className="relative py-32 overflow-hidden border-t border-white/5">
          <div className="absolute inset-0 diagonal-lines opacity-15 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }} className="mb-20">
              <p className="font-condensed text-xs text-gold tracking-[0.5em] uppercase mb-4">Notre Savoir-Faire</p>
              <h2 className="font-display text-[12vw] md:text-[8vw] lg:text-[7vw] text-white leading-none">
                Nos Pôles d&apos;<span className="text-gradient-gold">Expertise</span>
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: Globe2,
                  title: "Commerce & Logistique",
                  desc: "Experts en Import-Export, nous connectons le marché local aux opportunités mondiales.",
                  items: [
                    "Sourcing vérifié dans les hubs mondiaux (Guangzhou, Istanbul, Dubaï)",
                    "Paiement sécurisé à Kinshasa, transferts internationaux pris en charge",
                    "Logistique Door-to-Door incluant le dédouanement",
                  ],
                },
                {
                  icon: Cpu,
                  title: "Technologie & Innovation",
                  desc: "Transformation numérique et solutions logicielles sur mesure.",
                  items: [
                    "Développement Full-Stack adapté aux réalités africaines",
                    "Migration Cloud & Sécurité des données",
                    "Audit et automatisation des processus métiers",
                  ],
                },
                {
                  icon: LineChart,
                  title: "Finance & Trading",
                  desc: "Accès aux marchés financiers via une formation de pointe.",
                  items: [
                    "Bot institutionnel propriétaire de trading automatisé",
                    "Gestion de risque avancée type fonds d'investissement",
                    "Formation certifiante aux métiers de la finance",
                  ],
                },
                {
                  icon: UserPlus,
                  title: "Capital Humain",
                  desc: "Resourcing et formation pour identifier et polir les talents locaux.",
                  items: [
                    "Formations 'Métiers en Tension' dictées par la demande réelle",
                    "Certification & insertion professionnelle",
                    "Incubateur de compétences pour l'employabilité",
                  ],
                },
              ].map((pole, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.12 }}
                  className="group relative p-8 rounded-2xl border border-white/10 hover:border-gold/50 transition-all duration-500"
                  style={{ background: "hsl(216 40% 9% / 0.5)" }}
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform" style={{ background: "hsl(42 85% 55% / 0.1)" }}>
                    <pole.icon className="w-7 h-7 text-gold" />
                  </div>
                  <h3 className="font-display text-2xl text-white mb-3">{pole.title}</h3>
                  <p className="font-sans text-sm text-white/50 leading-relaxed mb-6">{pole.desc}</p>
                  <ul className="space-y-3">
                    {pole.items.map((item, j) => (
                      <li key={j} className="flex gap-3 font-sans text-sm text-white/40 leading-relaxed">
                        <span className="text-gold shrink-0 mt-1">—</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Vision */}
        <section className="relative py-32 overflow-hidden border-t border-white/5">
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 30%, #2a1f08 0%, #1a1406 30%, hsl(216,45%,6%) 100%)" }} />
          <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <p className="font-condensed text-xs text-gold tracking-[0.5em] uppercase mb-8">Notre Vision</p>
              <blockquote className="font-display text-[10vw] md:text-[6vw] text-white leading-none mb-12">
                &quot;Faire au Congo, <span className="text-gradient-gold">pour le Congo.&quot;</span>
              </blockquote>
              <div className="max-w-3xl mx-auto space-y-6 font-sans text-lg text-white/60 leading-relaxed">
                <p>
                  Notre ambition est l&apos;émergence d&apos;une nouvelle génération de Congolais : conscients, productifs et créateurs de richesse.
                </p>
                <p>
                  Nous ne voulons pas seulement des consommateurs, mais des producteurs acteurs de leur propre développement. Bâtir une économie résiliente où l&apos;excellence locale rivalise avec les standards internationaux.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Values */}
        <section className="relative py-32 overflow-hidden border-t border-white/5">
          <div className="absolute inset-0 diagonal-lines opacity-15 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }} className="text-center mb-20">
              <p className="font-condensed text-xs text-gold tracking-[0.5em] uppercase mb-4">Nos Fondements</p>
              <h2 className="font-display text-[12vw] md:text-[8vw] lg:text-[7vw] text-white leading-none">
                Nos <span className="text-gradient-gold">Valeurs</span>
              </h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: Award, title: "L'Excellence", desc: "La qualité sans compromis dans chaque service rendu." },
                { icon: ShieldCheck, title: "L'Intégrité", desc: "La transparence dans nos affaires et nos formations financières." },
                { icon: Lightbulb, title: "L'Innovation", desc: "L'utilisation des dernières technologies pour résoudre des problèmes locaux." },
                { icon: Heart, title: "L'Empowerment", desc: "Donner le pouvoir par la connaissance et l'autonomie financière." },
              ].map((value, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
                  className="group text-center p-8 rounded-2xl border border-white/5 hover:border-gold/30 transition-all duration-500"
                  style={{ background: "hsl(216 40% 9% / 0.3)" }}
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform" style={{ background: "hsl(42 85% 55% / 0.1)" }}>
                    <value.icon className="w-8 h-8 text-gold" />
                  </div>
                  <h3 className="font-display text-2xl text-white mb-3">{value.title}</h3>
                  <p className="font-sans text-sm text-white/40 leading-relaxed">{value.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-24 overflow-hidden border-t border-white/5 text-center">
          <div className="absolute inset-0 diagonal-lines opacity-15 pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6 relative z-10">
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}>
              <h2 className="font-display text-[10vw] md:text-[6vw] text-white leading-none mb-6">
                A.Onoseke House <span className="text-gradient-gold">Investment RDC</span>
              </h2>
              <p className="font-sans text-lg text-white/40 italic">
                L&apos;architecte de votre potentiel, le partenaire de votre croissance.
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
