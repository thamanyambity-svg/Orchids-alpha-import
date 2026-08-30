"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useLanguage } from "@/lib/i18n-context"
import { SiteNav } from "@/components/site/site-nav"

const FIELD =
  "w-full border border-[var(--line)] bg-background px-4 py-[15px] font-condensed text-[15px] tracking-[.06em] text-foreground outline-none transition-colors placeholder:text-foreground/25 focus:border-gold"

const LABEL =
  "mb-2 block font-condensed text-[11px] font-bold uppercase tracking-[.32em] text-foreground/50"

export default function ForgotPasswordPage() {
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || ""

      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      // Réponse volontairement identique que le compte existe ou non : la page ne
      // doit pas servir à savoir quelles adresses sont enregistrées.
      setSent(true)
      toast.success(
        t("forgot.sent", "Si un compte existe pour cette adresse, un email vient d'être envoyé.")
      )
    } catch {
      toast.error(t("login.error.generic", "Une erreur est survenue"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="site-shell relative min-h-screen bg-[var(--navy)]">
      <SiteNav />

      <main className="relative grid min-h-screen [grid-template-columns:1fr] lg:[grid-template-columns:1fr_1fr]">
        {/* Volet gauche : même argumentaire que la page de connexion. */}
        <section className="relative hidden overflow-hidden border-e border-[var(--line)] lg:block">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[.22]"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1600&q=70')",
              animation: "heroPan 18s linear infinite alternate",
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(216_45%_6%/.82),hsl(216_45%_6%/.97))]" />
          <div className="absolute inset-0 opacity-60 [background:repeating-linear-gradient(115deg,transparent_0_30px,hsl(42_85%_55%/.04)_30px_31px)]" />

          <div className="relative flex h-full flex-col justify-center px-16 pt-24">
            <div className="mb-[22px] flex items-center gap-4">
              <span className="block h-px w-14 bg-gold" />
              <span className="font-condensed text-[12px] font-semibold uppercase tracking-[.5em] text-gold">
                {t("site.access.title", "Espace client")}
              </span>
            </div>
            <h1 className="m-0 font-display text-[clamp(40px,4.6vw,76px)] leading-[.9] text-foreground">
              {t("forgot.head", "REPRENEZ LA MAIN SUR VOTRE COMPTE")}
            </h1>
            <p className="mt-7 max-w-[460px] text-[18px] font-light leading-[1.6] text-foreground/55 [text-wrap:pretty]">
              {t(
                "forgot.body",
                "Nous envoyons un lien à usage unique sur l'adresse de votre compte. Il expire rapidement et ne peut servir qu'une fois."
              )}
            </p>
          </div>
        </section>

        {/* Volet droit : le formulaire. */}
        <section className="relative flex items-center justify-center px-8 py-32">
          <div className="w-full max-w-[440px]">
            <span className="mb-4 block font-condensed text-[11px] font-bold uppercase tracking-[.34em] text-gold">
              {t("site.access.title", "Espace client")}
            </span>
            <h2 className="m-0 font-display text-[clamp(34px,4vw,52px)] leading-[.95] text-foreground">
              {t("forgot.title", "Mot de passe oublié")}
            </h2>
            <div className="my-7 h-[14px] w-[100px] bg-gold" />

            <p className="mb-8 text-[15px] font-light leading-[1.6] text-foreground/45 [text-wrap:pretty]">
              {sent
                ? t(
                    "forgot.check_inbox",
                    "Consultez votre boîte mail et cliquez sur le lien reçu. Pensez à regarder les indésirables."
                  )
                : t("forgot.instructions", "Saisissez l'adresse e-mail de votre compte.")}
            </p>

            {!sent ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label htmlFor="email" className={LABEL}>
                    {t("login.email", "Adresse e-mail")}
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    className={FIELD}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 flex items-center justify-center gap-3 bg-gold px-[38px] py-[18px] font-condensed text-[13px] font-bold uppercase tracking-[.28em] text-primary-foreground transition-transform duration-300 hover:-translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("forgot.submit", "Envoyer le lien")}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setSent(false)}
                className="w-full border border-[var(--line)] px-[38px] py-[16px] font-condensed text-[12px] font-bold uppercase tracking-[.28em] text-foreground/70 transition-colors duration-300 hover:border-gold hover:text-gold"
              >
                {t("forgot.retry", "Utiliser une autre adresse")}
              </button>
            )}

            <div className="mt-8 flex flex-col gap-3 border-t border-[var(--line)] pt-7">
              <Link
                href="/login"
                className="flex items-center gap-2 font-condensed text-[14px] uppercase tracking-[.18em] text-foreground/50 transition-colors hover:text-gold"
              >
                <ArrowLeft className="h-[14px] w-[14px]" />
                {t("forgot.back_to_login", "Retour à la connexion")}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
