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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
                  A.Onoseke House Investment DRC : <br />
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
            <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-8"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm font-bold text-primary uppercase tracking-wider">
                  <History className="w-4 h-4" />
                  Notre Histoire
                </div>
                <h2 className="text-3xl font-bold">Une vision audacieuse née en 2019</h2>
                <div className="space-y-6 text-muted-foreground leading-relaxed">
                  <p>
                    Fondé en 2019, le Groupe A.Onoseke House Investment DRC est né d&apos;une volonté audacieuse de redéfinir l&apos;entrepreneuriat en République Démocratique du Congo.
                  </p>
                  <p>
                    Cette structure est le fruit de la synergie entre deux visionnaires qui ont uni leur expertise pour créer un écosystème d&apos;affaires robuste, capable de répondre aux défis complexes du marché congolais tout en s&apos;ouvrant à l&apos;international.
                  </p>
                </div>
              </motion.div>
              <div className="relative">
                <div className="aspect-[16/9] rounded-3xl overflow-hidden border border-border bg-card relative">
                  <Image
                    src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/82c7d68c-6062-41a5-8b3b-7754c84ff796/Gemini_Generated_Image_e4f6lde4f6lde4f6-resized-1767874599274.webp?width=8000&height=8000&resize=contain"
                    alt="Fondation 2019"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="absolute -bottom-6 -right-6 p-8 rounded-2xl bg-card border border-border shadow-xl">
                  <div className="text-4xl font-bold text-primary mb-1">2019</div>
                  <div className="text-sm text-muted-foreground">Année de fondation</div>
                </div>
              </div>
            </div>

            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm font-bold text-primary uppercase tracking-wider mb-4">
                <Users className="w-4 h-4" />
                Notre Leadership
              </div>
              <h2 className="text-3xl font-bold">Les Visionnaires</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              {/* Mr Ambity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group"
              >
                <div className="relative aspect-[4/5] rounded-3xl overflow-hidden mb-6 border border-border">
                  <Image
                    src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/82c7d68c-6062-41a5-8b3b-7754c84ff796/WhatsApp-Image-2026-01-08-at-13.04.14-1767874145685.jpeg?width=8000&height=8000&resize=contain"
                    alt="Monsieur Ambity A.Alpha"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-1">Monsieur Ambity A.Alpha</h3>
                  <p className="text-primary font-medium">Fondateur et initiateur de la vision</p>
                </div>
              </motion.div>

              {/* Mme Salima */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="group"
              >
                <div className="relative aspect-[4/5] rounded-3xl overflow-hidden mb-6 border border-border">
                  <Image
                    src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/82c7d68c-6062-41a5-8b3b-7754c84ff796/Gemini_Generated_Image_9xvg7g9xvg7g9xvg-1767874145639.png?width=8000&height=8000&resize=contain"
                    alt="Madame Salima Onoseke Nzikisa"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-1">Madame Salima Onoseke Nzikisa</h3>
                  <p className="text-primary font-medium">Présidente Directrice Générale (PDG)</p>
                </div>
              </motion.div>
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
                  desc: "Experts en Import-Export, nous connectons le marché local aux opportunités mondiales.",
                  detail: {
                    title: "La Route de la Soie Moderne & Sécurisée",
                    subtitle: "Importation stratégique : Chine • Dubaï • Turquie • Asie",
                    content: [
                      { title: "🛡️ Sourcing Vérifié", text: "Nous ne dépendons pas du hasard. Nos agents basés dans les hubs mondiaux (Guangzhou, Istanbul, Dubaï) inspectent les usines et valident la marchandise avant tout paiement." },
                      { title: "💸 Facilité Financière", text: "Payez en toute sécurité à Kinshasa. Nous prenons en charge les transferts internationaux complexes et le change, éliminant les risques de blocage bancaire." },
                      { title: "📦 Logistique Door-to-Door", text: "Une prise en charge totale, de l'entrepôt du fournisseur jusqu'à votre porte en RDC, incluant le dédouanement." }
                    ]
                  }
                },
                {
                  icon: Cpu,
                  title: "Technologie & Innovation",
                  desc: "Transformation numérique et solutions logicielles sur mesure pour la modernité.",
                  detail: {
                    title: "Architectes de votre Transformation Digitale",
                    subtitle: "Développement sur mesure & Infrastructures Cloud",
                    content: [
                      { title: "🚀 Développement Full-Stack", text: "Conception de plateformes web et mobiles robustes (Python, Node.js). Nous créons des outils adaptés aux réalités africaines (faible bande passante, intégration Mobile Money)." },
                      { title: "☁️ Migration & Sécurité", text: "Transition de vos anciens systèmes vers des environnements Cloud modernes (Antigravity), garantissant la sécurité et la pérennité de vos données." },
                      { title: "🤖 Audit & Automatisation", text: "Analyse de vos processus métiers pour automatiser les tâches répétitives et réduire les coûts opérationnels." }
                    ]
                  }
                },
                {
                  icon: LineChart,
                  title: "Finance & Trading",
                  desc: "Démocratisation de l'accès aux marchés financiers via une formation de pointe.",
                  detail: {
                    title: "Trading Algorithmique & Haute Finance",
                    subtitle: "La puissance de l'automatisation institutionnelle",
                    content: [
                      { title: "🤖 Bot Institutionnel Propriétaire", text: "Accès exclusif à notre technologie de trading automatisé. Notre intelligence artificielle scanne les marchés et exécute les ordres avec une rigueur mathématique, éliminant totalement le facteur émotionnel humain." },
                      { title: "📊 Gestion de Risque Avancée", text: "Nous appliquons des protocoles de 'Risk Management' stricts, identiques à ceux des grands fonds d'investissement, pour préserver et faire croître le capital sur le long terme." }
                    ]
                  }
                },
                {
                  icon: UserPlus,
                  title: "Capital Humain",
                  desc: "Resourcing et formation professionnelle pour identifier et polir les talents locaux.",
                  detail: {
                    title: "Incubateur de Compétences & Employabilité",
                    subtitle: "Répondre aux besoins urgents du marché congolais",
                    content: [
                      { title: "🏗️ Formations 'Métiers en Tension'", text: "Nos cursus sont dictés par la demande réelle des entreprises en RDC. Nous formons spécifiquement pour les secteurs qui recrutent massivement (Mines, Logistique Avancée, Digital) mais qui manquent de main-d'œuvre qualifiée." },
                      { title: "🎯 Certification & Insertion", text: "Plus que de la théorie, nous visons l'opérationnel. Notre objectif est de transformer des potentiels bruts en techniciens immédiatement employables et de faciliter leur placement en entreprise." }
                    ]
                  }
                }
              ].map((pole, i) => (
                <Dialog key={i}>
                  <DialogTrigger asChild>
                    <motion.div
                      whileHover={{ y: -5 }}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="p-8 rounded-2xl border border-border bg-card hover:border-primary transition-all group cursor-pointer h-full flex flex-col"
                    >
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <pole.icon className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold mb-3">{pole.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{pole.desc}</p>
                      <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                        En savoir plus <span className="text-lg">→</span>
                      </span>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl bg-[#0a0e14] border-white/10 text-white">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold text-primary mb-2">{pole.detail.title}</DialogTitle>
                      <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-6 border-b border-primary/20 pb-4">
                        {pole.detail.subtitle}
                      </div>
                    </DialogHeader>
                    <div className="space-y-6">
                      {pole.detail.content.map((item, j) => (
                        <div key={j} className="flex gap-4">
                          <div className="shrink-0 pt-1">
                            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-base mb-1">{item.title}</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
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
              A.Onoseke House Investment DRC
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
