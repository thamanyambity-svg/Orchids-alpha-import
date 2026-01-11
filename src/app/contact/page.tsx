"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Shield,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  Send,
  Loader2,
  Users,
  Building2,
  Briefcase
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BackButton } from "@/components/back-button"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { toast } from "sonner"

const contactTypes = [
  { value: "buyer", label: "Je suis acheteur", icon: Users },
  { value: "partner", label: "Je veux devenir partenaire", icon: Building2 },
  { value: "institutional", label: "Contact institutionnel", icon: Briefcase },
]

export default function ContactPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [contactType, setContactType] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    await new Promise(resolve => setTimeout(resolve, 1500))

    toast.success("Message envoyé ! Nous vous répondrons sous 24h.")
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" })
    setContactType("")
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen">
      <PublicHeader />

      <main className="pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <BackButton />
        </div>
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 pattern-grid opacity-20" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-8">
                  <MessageSquare className="w-4 h-4" />
                  Contact
                </div>

                <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                  Parlons de votre <span className="text-gradient-gold">projet</span>
                </h1>
                <p className="text-lg text-muted-foreground mb-12">
                  Que vous soyez acheteur, futur partenaire ou institutionnel,
                  notre équipe est à votre écoute pour répondre à toutes vos questions.
                </p>

                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Siège Alpha</h3>
                      <p className="text-muted-foreground">
                        Kinshasa, République Démocratique du Congo
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Email</h3>
                      <a href="mailto:contact@alphaix.com" className="text-primary hover:underline">
                        contact@aonosekehouseinvestmentdrc.site
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Téléphone / WhatsApp</h3>
                      <a href="tel:+243000000000" className="text-primary hover:underline">
                        +243 999 894 788 / +243 818 924 674
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mt-12 p-6 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Temps de réponse</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Nous nous engageons à répondre à toutes les demandes sous 24 heures ouvrées.
                    Les demandes partenaires sont traitées en priorité.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="p-8 rounded-2xl bg-card border border-border">
                  <h2 className="text-2xl font-bold mb-6">Envoyez-nous un message</h2>

                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {contactTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setContactType(type.value)}
                        className={`p-4 rounded-xl border transition-all text-center ${contactType === type.value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                          }`}
                      >
                        <type.icon className={`w-6 h-6 mx-auto mb-2 ${contactType === type.value ? "text-primary" : "text-muted-foreground"
                          }`} />
                        <span className="text-xs">{type.label}</span>
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nom complet *</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="Jean Dupont"
                          className="h-12"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="votre@email.com"
                          className="h-12"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Téléphone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+243 000 000 000"
                          className="h-12"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Sujet *</Label>
                        <Select
                          value={formData.subject}
                          onValueChange={(value) => setFormData({ ...formData, subject: value })}
                          required
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Sélectionnez" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="info">Demande d&apos;information</SelectItem>
                            <SelectItem value="quote">Demande de devis</SelectItem>
                            <SelectItem value="partner">Devenir partenaire</SelectItem>
                            <SelectItem value="support">Support technique</SelectItem>
                            <SelectItem value="other">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        placeholder="Décrivez votre demande en détail..."
                        className="min-h-32 resize-none"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full h-12" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Envoyer le message
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
