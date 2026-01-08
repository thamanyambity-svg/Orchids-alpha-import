"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Headphones, 
  Plus, 
  Minus, 
  Mail, 
  MessageSquare, 
  Phone,
  HelpCircle,
  ExternalLink,
  ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard/header"

const faqs = [
  {
    question: "Comment AlphaIX sécurise-t-il mes transactions ?",
    answer: "Nous utilisons un système de compte séquestre. Lorsque vous payez, vos fonds sont conservés par AlphaIX. Ils ne sont libérés au partenaire ou au fournisseur qu'une fois que vous avez validé la réception et la conformité des produits."
  },
  {
    question: "Quels sont les délais moyens de livraison ?",
    answer: "Les délais dépendent du pays d'achat et du mode d'expédition choisi. En moyenne, comptez 7 à 12 jours pour le fret aérien et 30 à 45 jours pour le fret maritime. Votre partenaire dédié vous fournira un planning précis."
  },
  {
    question: "Puis-je changer de partenaire certifié ?",
    answer: "Chaque pays est géré par une équipe d'experts certifiés par AlphaIX. Si vous rencontrez un problème avec un interlocuteur, vous pouvez signaler un incident via l'onglet dédié, et notre équipe de conformité interviendra."
  },
  {
    question: "Comment sont calculés les frais de service ?",
    answer: "Nos frais sont transparents et calculés en pourcentage de la valeur de la marchandise. Ils couvrent l'inspection, la sécurisation des fonds et la logistique jusqu'au port de destination."
  }
]

export default function SupportPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div>
      <DashboardHeader 
        title="Centre d'Assistance" 
        subtitle="Nous sommes là pour vous accompagner dans vos opérations"
      />

      <div className="p-6">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* FAQ Section */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Questions Fréquentes</h2>
            </div>
            
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div 
                  key={index}
                  className="bg-card border border-border rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors"
                  >
                    <span className="font-semibold">{faq.question}</span>
                    {openIndex === index ? (
                      <Minus className="w-4 h-4 text-primary" />
                    ) : (
                      <Plus className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <AnimatePresence>
                    {openIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 pt-0 text-sm text-muted-foreground leading-relaxed border-t border-border/50">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-4">
              <ShieldCheck className="w-10 h-10 text-primary shrink-0" />
              <div>
                <h3 className="font-bold">Vous ne trouvez pas votre réponse ?</h3>
                <p className="text-sm text-muted-foreground">
                  Nos agents sont disponibles 24/7 pour répondre à vos questions techniques ou logistiques.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Canaux Directs</h2>
            </div>

            <div className="grid gap-4">
              <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <h3 className="font-bold">WhatsApp Business</h3>
                    <p className="text-xs text-muted-foreground">Réponse sous 15 minutes</p>
                  </div>
                </div>
                <Button className="w-full bg-success hover:bg-success/90 text-white gap-2">
                  Démarrer la discussion
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>

              <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold">Support Email</h3>
                    <p className="text-xs text-muted-foreground">support@alphaimport-exchange.com</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full gap-2">
                  Envoyer un email
                  <Mail className="w-4 h-4" />
                </Button>
              </div>

              <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Phone className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold">Assistance Téléphonique</h3>
                    <p className="text-xs text-muted-foreground">Lundi - Vendredi, 9h-18h</p>
                  </div>
                </div>
                <p className="text-center font-bold text-lg">+243 812 345 678</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
