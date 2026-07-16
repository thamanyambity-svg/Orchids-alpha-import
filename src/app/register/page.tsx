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
import { useLanguage } from "@/lib/i18n-context"

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useLanguage()
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

      toast.success(t("register.success", "Compte créé avec succès ! Vérifiez votre email."))
      router.push("/login")
    } catch {
      toast.error(t("register.error.generic", "Une erreur est survenue"))
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
            {t("register.title", "Rejoignez ")}
            <span className="text-gradient-gold">{t("register.brand", "Alpha Import Exchange RDC")}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            {t("register.subtitle", "Créez votre compte Acheteur et commencez à sécuriser vos importations dès aujourd'hui.")}
          </p>

          <div className="mt-12 space-y-6">
            {[
              { title: t("register.benefit.free_title", "Gratuit"), desc: t("register.benefit.free_desc", "Aucun frais d'inscription") },
              { title: t("register.benefit.secure_title", "Sécurisé"), desc: t("register.benefit.secure_desc", "Vos données sont protégées") },
              { title: t("register.benefit.simple_title", "Simple"), desc: t("register.benefit.simple_desc", "Processus en quelques minutes") },
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
              <BackButton href="/" />
            </div>
            <Link href="/" className="flex items-center">
              <div className="w-24 h-24 sm:w-32 sm:h-32 relative flex items-center justify-center">
                <Image 
                  src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/82c7d68c-6062-41a5-8b3b-7754c84ff796/Capture-d-ecran-2026-01-08-a-11.09.14-1767869085941.png?width=8000&height=8000&resize=contain"
                  alt="Alpha Import Exchange RDC"
                  fill
                  className="object-contain"
                />
              </div>
            </Link>
          </div>

          <h2 className="text-2xl font-bold mb-2">{t("register.form_title", "Créer un compte")}</h2>
          <p className="text-muted-foreground mb-8">
            {t("register.form_subtitle", "Remplissez le formulaire pour commencer")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name">{t("register.name", "Nom complet *")}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="full_name"
                  type="text"
                  placeholder={t("register.name_placeholder", "Jean Dupont")}
                  className="pl-10 h-12"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("register.email", "Email *")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t("register.email_placeholder", "votre@email.com")}
                  className="pl-10 h-12"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t("register.phone", "Téléphone *")}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t("register.phone_placeholder", "+243 000 000 000")}
                  className="pl-10 h-12"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name">{t("register.company", "Entreprise (optionnel)")}</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="company_name"
                  type="text"
                  placeholder={t("register.company_placeholder", "Nom de votre entreprise")}
                  className="pl-10 h-12"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity_type">{t("register.activity", "Type d'activité *")}</Label>
              <Select
                value={formData.activity_type}
                onValueChange={(value) => setFormData({ ...formData, activity_type: value })}
                required
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder={t("register.activity_placeholder", "Sélectionnez votre activité")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">{t("register.activity.individual", "Particulier")}</SelectItem>
                  <SelectItem value="retailer">{t("register.activity.retailer", "Commerce de détail")}</SelectItem>
                  <SelectItem value="wholesaler">{t("register.activity.wholesaler", "Commerce de gros")}</SelectItem>
                  <SelectItem value="manufacturer">{t("register.activity.manufacturer", "Industrie / Production")}</SelectItem>
                  <SelectItem value="other">{t("register.activity.other", "Autre")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("register.password", "Mot de passe *")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("register.password_placeholder", "••••••••")}
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
              <p className="text-xs text-muted-foreground">{t("register.password_min", "Minimum 8 caractères")}</p>
            </div>

            <Button type="submit" className="w-full h-12" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {t("register.submit", "Créer mon compte")}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("register.cgu_prefix", "En créant un compte, vous acceptez nos")}{" "}
            <Link href="/terms" className="text-primary hover:underline">{t("register.cgu", "CGU")}</Link>
            {" "}{t("register.privacy_and", "et notre")}{" "}
            <Link href="/privacy" className="text-primary hover:underline">{t("register.privacy", "politique de confidentialité")}</Link>
          </p>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("register.already_account", "Déjà un compte ?")}{" "}
            <Link href="/login" className="text-primary hover:underline">
              {t("register.login_link", "Se connecter")}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
