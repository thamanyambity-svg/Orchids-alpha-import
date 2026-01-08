"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, User, Phone, Building2, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BackButton } from "@/components/back-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    company_name: "",
    activity_type: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            phone: formData.phone,
          }
        }
      })

      if (authError) {
        toast.error(authError.message)
        return
      }

      if (authData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.full_name,
            phone: formData.phone,
            company_name: formData.company_name || null,
            role: "BUYER",
            status: "PENDING",
          })

        if (profileError) {
          console.error(profileError)
        }

        const { error: buyerError } = await supabase
          .from("buyer_profiles")
          .insert({
            user_id: authData.user.id,
            activity_type: formData.activity_type,
          })

        if (buyerError) {
          console.error(buyerError)
        }
      }

      toast.success("Compte créé avec succès ! Vérifiez votre email.")
      router.push("/login")
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
          <BackButton className="w-fit mb-8" />
          <Link href="/" className="flex items-center gap-3 mb-12">
            <div className="w-16 h-16 relative flex items-center justify-center">
              <Image 
                src="https://slelguoygbfzlbylpxfs.supabase.co/storage/v1/object/public/project-uploads/82c7d68c-6062-41a5-8b3b-7754c84ff796/Capture-d-ecran-2026-01-08-a-11.09.14-1767867010685.png"
                alt="Alpha Import Exchange RDC Logo"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight">
                ALPHA<span className="text-gradient-gold">IX</span>
              </span>
              <span className="block text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                Import Exchange RDC
              </span>
            </div>
          </Link>

          <h1 className="text-4xl font-bold mb-4">
            Rejoignez{" "}
            <span className="text-gradient-gold">Alpha Import Exchange RDC</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Créez votre compte Acheteur et commencez à sécuriser vos importations 
            dès aujourd&apos;hui.
          </p>

          <div className="mt-12 space-y-6">
            {[
              { title: "Gratuit", desc: "Aucun frais d'inscription" },
              { title: "Sécurisé", desc: "Vos données sont protégées" },
              { title: "Simple", desc: "Processus en quelques minutes" },
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">{index + 1}</span>
                </div>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
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
              <BackButton />
            </div>
            <Link href="/" className="flex items-center gap-3">
              <div className="w-12 h-12 relative flex items-center justify-center">
                <Image 
                  src="https://slelguoygbfzlbylpxfs.supabase.co/storage/v1/object/public/project-uploads/82c7d68c-6062-41a5-8b3b-7754c84ff796/Capture-d-ecran-2026-01-08-a-11.09.14-1767867010685.png"
                  alt="Alpha Import Exchange RDC Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight">
                  ALPHA<span className="text-gradient-gold">IX</span>
                </span>
                <span className="block text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                  Import Exchange RDC
                </span>
              </div>
            </Link>
          </div>

          <h2 className="text-2xl font-bold mb-2">Créer un compte</h2>
          <p className="text-muted-foreground mb-8">
            Remplissez le formulaire pour commencer
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nom complet *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Jean Dupont"
                  className="pl-10 h-12"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
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
              <Label htmlFor="phone">Téléphone *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+243 000 000 000"
                  className="pl-10 h-12"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name">Entreprise (optionnel)</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="company_name"
                  type="text"
                  placeholder="Nom de votre entreprise"
                  className="pl-10 h-12"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity_type">Type d&apos;activité *</Label>
              <Select
                value={formData.activity_type}
                onValueChange={(value) => setFormData({ ...formData, activity_type: value })}
                required
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Sélectionnez votre activité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Particulier</SelectItem>
                  <SelectItem value="retailer">Commerce de détail</SelectItem>
                  <SelectItem value="wholesaler">Commerce de gros</SelectItem>
                  <SelectItem value="manufacturer">Industrie / Production</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe *</Label>
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
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Minimum 8 caractères</p>
            </div>

            <Button type="submit" className="w-full h-12" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Créer mon compte
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            En créant un compte, vous acceptez nos{" "}
            <Link href="/terms" className="text-primary hover:underline">CGU</Link>
            {" "}et notre{" "}
            <Link href="/privacy" className="text-primary hover:underline">politique de confidentialité</Link>
          </p>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
