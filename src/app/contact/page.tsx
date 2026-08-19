"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/lib/i18n-context"
import { toast } from "sonner"
import { SiteShell } from "@/components/site/site-shell"
import { useReveal } from "@/components/site/use-reveal"
import { PageHero } from "@/components/site/sections"

const FIELD =
  "w-full border border-[var(--line)] bg-[hsl(216_45%_6%)] px-4 py-[15px] font-condensed text-[15px] tracking-[.06em] text-white outline-none transition-colors placeholder:text-white/25 focus:border-gold"

const LABEL =
  "mb-2 block font-condensed text-[11px] font-bold uppercase tracking-[.32em] text-white/50"

export default function ContactPage() {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage()
  useReveal()

  const [isLoading, setIsLoading] = useState(false)
  const [contactType, setContactType] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  })

  const contactTypes = [
    { value: "partner", label: t("contact.form.type.partner", "Je veux devenir partenaire") },
    { value: "institutional", label: t("contact.form.type.institutional", "Contact institutionnel") },
  ]

  const handleTypeSelect = (type: string) => {
    if (type === "partner") {
      router.push("/partner-request")
      return
    }
    setContactType(type)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (contactType !== "institutional") {
        toast.error(t("contact.form.type.required", "Veuillez sélectionner un type de contact."))
        return
      }

      const { error } = await supabase
        .from('contact_messages')
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
          message: formData.message,
          type: 'INSTITUTIONAL',
          status: 'PENDING'
        })

      if (error) throw error

      toast.success(t("contact.form.success", "Message institutionnel envoyé ! Nous vous répondrons sous 24h."))
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" })
      setContactType("")

    } catch (error: any) {
      console.error("Error sending message:", error)
      toast.error(t("contact.form.error", "Erreur lors de l'envoi") + ": " + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const contacts = [
    { label: t("site.contact.address", "Adresse"), value: t("site.foot.address", "Kinshasa, République Démocratique du Congo") },
    { label: t("site.contact.phone", "Téléphone"), value: "+243 999 894 788" },
    { label: "WhatsApp", value: "+243 818 924 674" },
    { label: "E-mail", value: "contact@aonosekehouseinvestmentdrc.site" },
    { label: t("site.contact.languages", "Langues de la plateforme"), value: "Français · English · Türkçe · 中文 · 日本語 · العربية" },
  ]

  return (
    <SiteShell>
      <PageHero
        eyebrow={t("site.quote.eyebrow", "Accès")}
        title={t("site.quote.title", "DEMANDER UNE COTATION")}
        body={t("site.quote.body", "")}
        image="photo-1504328345606-18bbc8c9d7d1"
      />

      {/* Espace client : les demandes d'importation se déposent connecté. */}
      <section className="bg-[var(--navy)] pb-[60px]">
        <div className="mx-auto max-w-[1440px] px-8">
          <div
            data-reveal
            className="grid gap-px border border-[var(--line)] bg-[var(--line)] [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]"
          >
            <div className="flex flex-col justify-center gap-[22px] bg-[var(--navy2)] px-[34px] py-12">
              <span className="font-condensed text-[11px] font-bold uppercase tracking-[.34em] text-gold">
                {t("site.access.title", "Espace client")}
              </span>
              <h2 className="m-0 font-display text-[clamp(32px,3.8vw,52px)] leading-none text-white">
                {t("site.access.head", "TOUT SE PASSE DANS VOTRE ESPACE")}
              </h2>
              <p className="m-0 text-[17px] font-light leading-[1.62] text-white/58 [text-wrap:pretty]">
                {t("site.access.body", "")}
              </p>
              <div className="mt-[6px] flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="bg-gold px-8 py-[18px] font-condensed text-[12px] font-bold uppercase tracking-[.28em] text-[#0a1018] whitespace-nowrap"
                >
                  {t("site.access.login", "Connexion")}
                </Link>
                <Link
                  href="/register"
                  className="border border-[var(--line)] px-8 py-[18px] font-condensed text-[12px] font-bold uppercase tracking-[.28em] text-white/80 transition-colors duration-300 hover:border-gold hover:text-gold"
                >
                  {t("site.access.register", "Créer un compte")}
                </Link>
              </div>
              <p className="m-0 mt-2 text-[14px] font-light leading-[1.6] text-white/38 [text-wrap:pretty]">
                {t("site.access.note", "")}
              </p>
            </div>

            <div className="flex flex-col justify-center gap-[30px] bg-[hsl(216_45%_6%)] px-[34px] py-12">
              {contacts.map((c) => (
                <div key={c.label}>
                  <span className="mb-2 block font-condensed text-[11px] font-bold uppercase tracking-[.32em] text-gold">
                    {c.label}
                  </span>
                  <span className="block break-words font-display text-[25px] leading-[1.16] text-white">
                    {c.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/*
        Formulaire institutionnel. La logique est reprise telle quelle : le choix
        « partenaire » redirige vers la candidature, l'autre écrit dans
        contact_messages.
      */}
      <section className="relative overflow-hidden border-t border-[var(--line)] bg-[var(--navy2)] py-[100px]">
        <div className="absolute inset-0 opacity-50 [background:repeating-linear-gradient(115deg,transparent_0_30px,hsl(42_85%_55%/.035)_30px_31px)]" />
        <div className="relative mx-auto max-w-[900px] px-8">
          <div data-reveal className="mb-10">
            <div className="mb-[22px] flex items-center gap-4">
              <span className="block h-px w-14 bg-gold" />
              <span className="font-condensed text-[12px] font-semibold uppercase tracking-[.5em] text-gold">
                {t("contact.form.eyebrow", "Nous écrire")}
              </span>
            </div>
            <h2 className="m-0 font-display text-[clamp(34px,4.4vw,68px)] leading-[.92] text-white">
              {t("contact.form.title", "UNE QUESTION ?")}
            </h2>
          </div>

          <div data-reveal className="mb-8 flex flex-wrap gap-px bg-[var(--line)]">
            {contactTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleTypeSelect(type.value)}
                className={`flex-1 basis-[240px] px-6 py-5 text-left font-condensed text-[13px] font-semibold uppercase tracking-[.2em] transition-colors ${
                  contactType === type.value
                    ? "bg-gold text-[#0a1018]"
                    : "bg-[var(--navy)] text-white/60 hover:text-gold"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} data-reveal className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="name" className={LABEL}>{t("contact.form.name", "Nom complet")}</label>
              <input id="name" required value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={FIELD} placeholder="Jean Kabongo" />
            </div>
            <div>
              <label htmlFor="email" className={LABEL}>{t("contact.form.email", "E-mail")}</label>
              <input id="email" type="email" required value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={FIELD} placeholder="vous@exemple.com" />
            </div>
            <div>
              <label htmlFor="phone" className={LABEL}>{t("contact.form.phone", "Téléphone")}</label>
              <input id="phone" value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={FIELD} placeholder="+243 …" />
            </div>
            <div>
              <label htmlFor="subject" className={LABEL}>{t("contact.form.subject", "Objet")}</label>
              <input id="subject" required value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className={FIELD} placeholder={t("contact.form.subject", "Objet")} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="message" className={LABEL}>{t("contact.form.message", "Message")}</label>
              <textarea id="message" required rows={6} value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className={`${FIELD} resize-y`} />
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={isLoading}
                className="flex items-center justify-center gap-3 bg-gold px-11 py-[19px] font-condensed text-[13px] font-bold uppercase tracking-[.28em] text-[#0a1018] transition-transform duration-300 hover:-translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("contact.form.send", "Envoyer")}
              </button>
            </div>
          </form>
        </div>
      </section>
    </SiteShell>
  )
}
