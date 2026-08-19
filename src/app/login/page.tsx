"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useLanguage } from "@/lib/i18n-context"
import { SiteNav } from "@/components/site/site-nav"

const FIELD =
  "w-full border border-[var(--line)] bg-[hsl(216_45%_6%)] px-4 py-[15px] font-condensed text-[15px] tracking-[.06em] text-white outline-none transition-colors placeholder:text-white/25 focus:border-gold"

const LABEL =
  "mb-2 block font-condensed text-[11px] font-bold uppercase tracking-[.32em] text-white/50"

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error(t("login.error.user_not_found", "Utilisateur non trouvé"))
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profile?.role === "ADMIN") {
        router.push("/admin")
      } else if (profile?.role === "PARTNER") {
        router.push("/partner")
      } else {
        router.push("/dashboard")
      }

      toast.success(t("login.success", "Connexion réussie"))
    } catch {
      toast.error(t("login.error.generic", "Une erreur est survenue"))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAdminClick() {
    const supabase = createClient()

    if (formData.email && formData.password) {
      setIsLoading(true)
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })

        if (error) {
          toast.error(t("login.error.invalid_credentials", "Identifiants incorrects"))
          setIsLoading(false)
          return
        }
      } catch {
        toast.error(t("login.error.connection_error", "Erreur lors de la connexion"))
        setIsLoading(false)
        return
      } finally {
        setIsLoading(false)
      }
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.info(t("login.admin.please_enter_credentials", "Veuillez saisir vos identifiants administrateur puis cliquer sur 'Se connecter' ou 'Accès Administration'."))
      return
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role === "ADMIN") {
      toast.success(t("login.admin.granted", "Accès Administrateur accordé"))
      router.push("/admin")
    } else {
      toast.error(t("login.admin.no_rights", "Vous n'avez pas les droits d'administration."))
    }
  }

  return (
    <div className="site-shell relative min-h-screen bg-[var(--navy)]">
      <SiteNav />

      <main className="relative grid min-h-screen [grid-template-columns:1fr] lg:[grid-template-columns:1fr_1fr]">
        {/* Volet gauche : argumentaire, dans le style de la vitrine. */}
        <section className="relative hidden overflow-hidden border-r border-[var(--line)] lg:block">
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
            <h1 className="m-0 font-display text-[clamp(40px,4.6vw,76px)] leading-[.9] text-white">
              {t("site.access.head", "TOUT SE PASSE DANS VOTRE ESPACE")}
            </h1>
            <p className="mt-7 max-w-[460px] text-[18px] font-light leading-[1.6] text-white/55 [text-wrap:pretty]">
              {t("site.access.body", "")}
            </p>

            <div className="mt-11 flex flex-col gap-[10px]">
              {[
                t("login.feature.tracking", "Suivi en temps réel de vos commandes"),
                t("login.feature.documents", "Documents sécurisés et horodatés"),
                t("login.feature.messaging", "Messagerie directe avec votre partenaire"),
              ].map((feature) => (
                <span
                  key={feature}
                  className="flex items-center gap-[11px] font-condensed text-[14px] font-medium uppercase tracking-[.14em] text-white/50"
                >
                  <span className="block h-1 w-1 shrink-0 bg-gold" />
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Volet droit : le formulaire. Sa logique est inchangée. */}
        <section className="relative flex items-center justify-center px-8 py-32">
          <div className="w-full max-w-[440px]">
            <span className="mb-4 block font-condensed text-[11px] font-bold uppercase tracking-[.34em] text-gold">
              {t("site.access.title", "Espace client")}
            </span>
            <h2 className="m-0 font-display text-[clamp(34px,4vw,52px)] leading-[.95] text-white">
              {t("site.access.login", "Connexion")}
            </h2>
            <div className="my-7 h-[14px] w-[100px] bg-gold" />

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
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="vous@exemple.com"
                  className={FIELD}
                />
              </div>

              <div>
                <label htmlFor="password" className={LABEL}>
                  {t("login.password", "Mot de passe")}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className={`${FIELD} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-gold"
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex items-center justify-center gap-3 bg-gold px-[38px] py-[18px] font-condensed text-[13px] font-bold uppercase tracking-[.28em] text-[#0a1018] transition-transform duration-300 hover:-translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("site.access.login", "Connexion")}
              </button>
            </form>

            <button
              onClick={handleAdminClick}
              className="mt-4 w-full border border-[var(--line)] px-[38px] py-[16px] font-condensed text-[12px] font-bold uppercase tracking-[.28em] text-white/70 transition-colors duration-300 hover:border-gold hover:text-gold"
            >
              {t("login.admin.access", "Accès Administration")}
            </button>

            <div className="mt-8 flex flex-col gap-3 border-t border-[var(--line)] pt-7">
              <Link
                href="/register"
                className="font-condensed text-[14px] uppercase tracking-[.18em] text-white/50 transition-colors hover:text-gold"
              >
                {t("site.access.register", "Créer un compte")}
              </Link>
              <Link
                href="/"
                className="font-condensed text-[14px] uppercase tracking-[.18em] text-white/40 transition-colors hover:text-gold"
              >
                {t("site.nav.home", "Accueil")}
              </Link>
            </div>

            <p className="mt-7 text-[14px] font-light leading-[1.6] text-white/35 [text-wrap:pretty]">
              {t("site.access.note", "")}
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
