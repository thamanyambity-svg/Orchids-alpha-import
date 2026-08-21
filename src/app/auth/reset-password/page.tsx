"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useLanguage } from "@/lib/i18n-context"
import { SiteNav } from "@/components/site/site-nav"

const FIELD =
  "w-full border border-[var(--line)] bg-[hsl(216_45%_6%)] px-4 py-[15px] font-condensed text-[15px] tracking-[.06em] text-white outline-none transition-colors placeholder:text-white/25 focus:border-gold"

const LABEL =
  "mb-2 block font-condensed text-[11px] font-bold uppercase tracking-[.32em] text-white/50"

const MIN_PASSWORD_LENGTH = 8

export default function ResetPasswordPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [ready, setReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)

  // La session de récupération est posée par /auth/callback, mais le client
  // Supabase peut la découvrir un instant plus tard. On attend donc soit une
  // session, soit l'événement PASSWORD_RECOVERY, avant d'afficher le formulaire.
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const markReady = () => {
      if (!cancelled) setReady(true)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markReady()
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) markReady()
    })

    const recheck = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!cancelled && session) markReady()
      })
    }, 400)

    const giveUp = setTimeout(() => {
      if (!cancelled) setTimedOut(true)
    }, 12000)

    return () => {
      cancelled = true
      clearTimeout(recheck)
      clearTimeout(giveUp)
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(
        t("reset.error.too_short", `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`)
      )
      return
    }

    if (password !== confirm) {
      toast.error(t("reset.error.mismatch", "Les deux mots de passe ne correspondent pas."))
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        toast.error(error.message)
        return
      }

      setDone(true)
      toast.success(t("reset.success", "Mot de passe mis à jour."))
      setTimeout(() => router.push("/login"), 2000)
    } catch {
      toast.error(t("login.error.generic", "Une erreur est survenue"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="site-shell relative min-h-screen bg-[var(--navy)]">
      <SiteNav />

      <main className="relative flex min-h-screen items-center justify-center px-8 py-32">
        <div className="w-full max-w-[440px]">
          <span className="mb-4 block font-condensed text-[11px] font-bold uppercase tracking-[.34em] text-gold">
            {t("site.access.title", "Espace client")}
          </span>
          <h2 className="m-0 font-display text-[clamp(34px,4vw,52px)] leading-[.95] text-white">
            {t("reset.title", "Nouveau mot de passe")}
          </h2>
          <div className="my-7 h-[14px] w-[100px] bg-gold" />

          {done ? (
            <div className="flex flex-col gap-6">
              <p className="flex items-center gap-3 font-condensed text-[15px] uppercase tracking-[.14em] text-gold">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                {t("reset.done", "Mot de passe enregistré")}
              </p>
              <p className="text-[15px] font-light leading-[1.6] text-white/45">
                {t("reset.redirecting", "Redirection vers la page de connexion…")}
              </p>
            </div>
          ) : !ready ? (
            <div className="flex flex-col gap-6">
              {timedOut ? (
                <>
                  <p className="text-[15px] font-light leading-[1.6] text-white/45 [text-wrap:pretty]">
                    {t(
                      "reset.link_invalid",
                      "Ce lien est expiré ou a déjà été utilisé. Demandez-en un nouveau."
                    )}
                  </p>
                  <Link
                    href="/forgot-password"
                    className="w-fit border border-[var(--line)] px-[38px] py-[16px] font-condensed text-[12px] font-bold uppercase tracking-[.28em] text-white/70 transition-colors duration-300 hover:border-gold hover:text-gold"
                  >
                    {t("reset.request_new", "Demander un nouveau lien")}
                  </Link>
                </>
              ) : (
                <p className="flex items-center gap-3 font-condensed text-[14px] uppercase tracking-[.14em] text-white/45">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("reset.verifying", "Vérification du lien…")}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label htmlFor="password" className={LABEL}>
                  {t("reset.new_password", "Nouveau mot de passe")}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${FIELD} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? t("login.hide_password", "Masquer le mot de passe")
                        : t("login.show_password", "Afficher le mot de passe")
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-gold"
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm" className={LABEL}>
                  {t("reset.confirm_password", "Confirmer le mot de passe")}
                </label>
                <input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className={FIELD}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex items-center justify-center gap-3 bg-gold px-[38px] py-[18px] font-condensed text-[13px] font-bold uppercase tracking-[.28em] text-[#0a1018] transition-transform duration-300 hover:-translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("reset.submit", "Enregistrer")}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
