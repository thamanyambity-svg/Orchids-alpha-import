"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Mail, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BackButton } from "@/components/back-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
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

      setSent(true)
      toast.success("Si un compte existe, un email vous a été envoyé.")
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
            Récupération du <span className="text-gradient-gold">mot de passe</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Nous vous enverrons un lien sécurisé pour définir un nouveau mot de passe.
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
            <Link href="/" className="flex items-center">
              <div className="w-24 h-24 relative">
                <Image
                  src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/82c7d68c-6062-41a5-8b3b-7754c84ff796/Capture-d-ecran-2026-01-08-a-11.09.14-1767869085941.png?width=8000&height=8000&resize=contain"
                  alt="Alpha Import Exchange"
                  fill
                  className="object-contain"
                />
              </div>
            </Link>
          </div>

          <h2 className="text-2xl font-bold mb-2">Mot de passe oublié ?</h2>
          <p className="text-muted-foreground mb-8">
            {sent
              ? "Consultez votre boîte mail et cliquez sur le lien reçu (vérifiez les spams)."
              : "Saisissez l’adresse email de votre compte."}
          </p>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    className="pl-10 h-12"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Envoyer le lien de réinitialisation"
                )}
              </Button>
            </form>
          ) : (
            <Button variant="outline" className="w-full h-12" asChild>
              <Link href="/login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la connexion
              </Link>
            </Button>
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
