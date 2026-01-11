"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BackButton } from "@/components/back-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
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
        toast.error("Utilisateur non trouvé")
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

      toast.success("Connexion réussie")
    } catch {
      toast.error("Une erreur est survenue")
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
          toast.error("Identifiants incorrects")
          setIsLoading(false)
          return
        }
      } catch {
        toast.error("Erreur lors de la connexion")
        setIsLoading(false)
        return
      } finally {
        setIsLoading(false)
      }
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.info("Veuillez saisir vos identifiants administrateur puis cliquer sur 'Se connecter' ou 'Accès Administration'.")
      return
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role === "ADMIN") {
      toast.success("Accès Administrateur accordé")
      router.push("/admin")
    } else {
      toast.error("Vous n'avez pas les droits d'administration.")
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative bg-card">
        <div className="absolute inset-0 pattern-grid opacity-20" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-16">
          <BackButton href="/" className="w-fit mb-8" />
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
            Bienvenue sur votre{" "}
            <span className="text-gradient-gold">espace sécurisé</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Accédez à votre tableau de bord pour gérer vos importations,
            suivre vos commandes et consulter vos documents.
          </p>

          <div className="mt-12 space-y-4">
            {[
              "Suivi en temps réel de vos commandes",
              "Documents sécurisés et horodatés",
              "Messagerie directe avec votre partenaire",
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8">
            <div className="flex items-center justify-between mb-4">
              <BackButton href="/" />
            </div>
            <Link href="/" className="flex items-center">
              <div className="w-24 h-24 sm:w-32 sm:h-32 relative flex items-center justify-center">
                <Image
                  src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/82c7d68c-6062-41a5-8b3b-7754c84ff796/Capture-d-ecran-2026-01-08-a-11.09.14-1767869085941.png?width=8000&height=8000&resize=contain"
                  alt="Alpha A Ambity"
                  fill
                  className="object-contain"
                />
              </div>
            </Link>
          </div>

          <h2 className="text-2xl font-bold mb-2">Connexion</h2>
          <p className="text-muted-foreground mb-8">
            Entrez vos identifiants pour accéder à votre espace
          </p>

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
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-12"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
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

            <Button type="submit" className="w-full h-12" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Créer un compte Acheteur
            </Link>
          </p>


          <div className="mt-6 pt-6 border-t border-border flex justify-center gap-4">
            <button
              type="button"
              onClick={handleAdminClick}
              className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              <Shield className="w-3 h-3" />
              Accès Administration
            </button>

            {/* Dev Helper - TO BE REMOVED IN PROD */}
            <button
              type="button"
              onClick={async () => {
                const supabase = createClient()
                setIsLoading(true)
                const { error } = await supabase.auth.signInWithPassword({
                  email: 'smoke-688@test.com', // The user created by smoke test
                  password: 'Password123!'
                })
                if (error) toast.error(error.message)
                else {
                  toast.success("Mode Dev Admin Activé")
                  // Force redirect to admin
                  window.location.href = "/admin"
                }
                setIsLoading(false)
              }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors inline-flex items-center gap-1 border border-red-500/20 px-2 py-1 rounded"
            >
              <Shield className="w-3 h-3" />
              DEV: Auto Business Admin
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
