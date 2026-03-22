"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BackButton } from "@/components/back-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)

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

    const t = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!cancelled && session) markReady()
      })
    }, 400)

    const timeoutErr = setTimeout(() => {
      if (!cancelled) setTimedOut(true)
    }, 12000)

    return () => {
      cancelled = true
      clearTimeout(t)
      clearTimeout(timeoutErr)
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.")
      return
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas.")
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
      toast.success("Mot de passe mis à jour.")
      await supabase.auth.signOut()
      setTimeout(() => router.push("/login"), 2000)
    } catch {
      toast.error("Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative bg-card">
        <div className="absolute inset-0 pattern-grid opacity-20" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <BackButton href="/login" className="w-fit mb-8" />
          <Link href="/" className="flex items-center mb-12 group">
            <div className="w-40 h-40 sm:w-48 sm:h-48 relative flex items-center justify-center transition-transform group-hover:scale-105">
              <Image
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/82c7d68c-6062-41a5-8b3b-7754c84ff796/Capture-d-ecran-2026-01-08-a-11.09.14-1767869085941.png?width=8000&height=8000&resize=contain"
                alt="Alpha Import Exchange RDC"
                fill
                className="object-contain"
              />
            </div>
          </Link>
          <h1 className="text-4xl font-bold mb-4">
            Nouveau <span className="text-gradient-gold">mot de passe</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Choisissez un mot de passe fort que vous n’utilisez pas ailleurs.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8">
            <BackButton href="/login" className="mb-4" />
          </div>

          {done ? (
            <div className="text-center space-y-6 py-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">C’est fait</h2>
              <p className="text-muted-foreground">
                Redirection vers la page de connexion…
              </p>
              <Button asChild>
                <Link href="/login">Se connecter</Link>
              </Button>
            </div>
          ) : timedOut && !ready ? (
            <div className="text-center space-y-4 py-12">
              <p className="text-lg font-medium">Lien invalide ou expiré</p>
              <p className="text-muted-foreground text-sm">
                Demandez un nouveau lien de réinitialisation.
              </p>
              <Button asChild className="mt-4">
                <Link href="/forgot-password">Mot de passe oublié</Link>
              </Button>
            </div>
          ) : !ready ? (
            <div className="text-center space-y-4 py-12">
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">
                Vérification du lien de réinitialisation…
              </p>
              <p className="text-sm text-muted-foreground">
                <Link href="/forgot-password" className="text-primary hover:underline">
                  Demander un nouveau lien
                </Link>
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2">Définir un nouveau mot de passe</h2>
              <p className="text-muted-foreground mb-8">
                Minimum 8 caractères.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="pl-10 pr-10 h-12"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      className="pl-10 h-12"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-12" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Enregistrer le mot de passe"
                  )}
                </Button>
              </form>
            </>
          )}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
