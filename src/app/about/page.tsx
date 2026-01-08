"use client"

import { motion } from "framer-motion"
import { 
  History, 
  Target, 
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
    <div className="min-h-screen">
      <PublicHeader />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 -z-10" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl">
              <BackButton href="/" className="mb-8" />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-4xl sm:text-6xl font-bold mb-6">
                  A.Onoseke House Investment RDC : <br />
                  <span className="text-gradient-gold">Bâtisseurs d&apos;un Avenir Congolais</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Redéfinir l&apos;entrepreneuriat en République Démocratique du Congo à travers l&apos;excellence, l&apos;innovation et l&apos;impact sociétal.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Story & Leadership */}
        <section className="py-24 border-y border-border bg-card/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-8"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm font-bold text-primary uppercase tracking-wider">
                  <History className="w-4 h-4" />
                  Notre Histoire & Leadership
                </div>
                <h2 className="text-3xl font-bold">Une vision audacieuse née en 2019</h2>
                <div className="space-y-6 text-muted-foreground leading-relaxed">
                  <p>
                    Fondé en 2019, le Groupe A.Onoseke House Investment RDC est né d&apos;une volonté audacieuse de redéfinir l&apos;entrepreneuriat en République Démocratique du Congo.
                  </p>
                  <p>
                    Cette structure est le fruit de la synergie entre deux visionnaires : <strong>Monsieur Ambity A.Alpha</strong>, Fondateur et initiateur de la vision, et <strong>Madame Salima Onoseke Nzikisa</strong>, Présidente Directrice Générale (PDG).
                  </p>
                  <p>
                    Ensemble, ils ont uni leur expertise pour créer un écosystème d&apos;affaires robuste, capable de répondre aux défis complexes du marché congolais tout en s&apos;ouvrant à l&apos;international.
                  </p>
                </div>
              </motion.div>
              <div className="relative">
                <div className="aspect-square rounded-3xl overflow-hidden border border-border bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center">
                  <Users className="w-32 h-32 text-primary opacity-20" />
                </div>
                <div className="absolute -bottom-6 -right-6 p-8 rounded-2xl bg-card border border-border shadow-xl">
                  <div className="text-4xl font-bold text-primary mb-1">2019</div>
                  <div className="text-sm text-muted-foreground">Année de fondation</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Expertise Poles */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Nos Pôles d&apos;Expertise</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Une approche multisectorielle garantissant une maîtrise complète de la chaîne de valeur.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: Globe2,
                  title: "Commerce & Logistique",
                  desc: "Experts en Import-Export, nous connectons le marché local aux opportunités mondiales."
                },
                {
                  icon: Cpu,
                  title: "Technologie & Innovation",
                  desc: "Transformation numérique et solutions logicielles sur mesure pour la modernité."
                },
                {
                  icon: LineChart,
                  title: "Finance & Trading",
                  desc: "Démocratisation de l'accès aux marchés financiers via une formation de pointe."
                },
                {
                  icon: UserPlus,
                  title: "Capital Humain",
                  desc: "Resourcing et formation professionnelle pour identifier et polir les talents locaux."
                }
              ].map((pole, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-8 rounded-2xl border border-border bg-card hover:border-primary transition-all group"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <pole.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{pole.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pole.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Vision */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary -z-10" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-sm font-bold uppercase tracking-[0.3em] mb-8 opacity-70">Notre Vision</h2>
              <blockquote className="text-4xl sm:text-6xl font-bold mb-12 italic">
                &quot;Faire au Congo, pour le Congo.&quot;
              </blockquote>
              <div className="max-w-3xl mx-auto space-y-8 text-xl text-white/80">
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
        <section className="py-24 bg-card/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Nos Valeurs</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: Award,
                  title: "L'Excellence",
                  desc: "La qualité sans compromis dans chaque service rendu."
                },
                {
                  icon: ShieldCheck,
                  title: "L'Intégrité",
                  desc: "La transparence dans nos affaires et nos formations financières."
                },
                {
                  icon: Lightbulb,
                  title: "L'Innovation",
                  desc: "L'utilisation des dernières technologies pour résoudre des problèmes locaux."
                },
                {
                  icon: Heart,
                  title: "L'Empowerment",
                  desc: "Donner le pouvoir par la connaissance et l'autonomie financière."
                }
              ].map((value, i) => (
                <div key={i} className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <value.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Conclusion CTA */}
        <section className="py-24 text-center border-t border-border">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold mb-6">
              A.Onoseke House Investment RDC
            </h2>
            <p className="text-xl text-muted-foreground italic">
              L&apos;architecte de votre potentiel, le partenaire de votre croissance.
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
