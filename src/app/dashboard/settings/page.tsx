"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  User, 
  Building2, 
  ShieldCheck, 
  Bell, 
  Lock, 
  CreditCard,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Mail,
  Phone,
  Globe,
  MapPin
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { DashboardHeader } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [countries, setCountries] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
    fetchCountries()
  }, [])

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error("Impossible de charger votre profil")
    } finally {
      setLoading(false)
    }
  }

  async function fetchCountries() {
    const { data } = await supabase
      .from('countries')
      .select('*')
      .order('name')
    if (data) setCountries(data)
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          company_name: profile.company_name,
          city: profile.city,
          country_id: profile.country_id,
          updated_at: new Error().stack?.includes('at ') ? new Date().toISOString() : undefined // Dummy check for ISO string
        })
        .eq('id', profile.id)

      if (error) throw error
      toast.success("Profil mis à jour avec succès")
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="pb-10">
      <DashboardHeader 
        title="Paramètres" 
        subtitle="Gérez vos informations personnelles et les paramètres de votre compte"
      />

      <div className="p-6 max-w-5xl mx-auto">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-background border border-border p-1">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Profil Personnel
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="w-4 h-4" />
              Entreprise
            </TabsTrigger>
            <TabsTrigger value="verification" className="gap-2">
              <ShieldCheck className="w-4 h-4" />
              Vérification
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="w-4 h-4" />
              Sécurité
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <form onSubmit={handleUpdateProfile}>
              <Card>
                <CardHeader>
                  <CardTitle>Informations Personnelles</CardTitle>
                  <CardDescription>
                    Mettez à jour vos coordonnées et votre photo de profil.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-dashed border-primary/30 overflow-hidden">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-primary" />
                        )}
                      </div>
                      <button type="button" className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform">
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Photo de profil</h4>
                      <p className="text-sm text-muted-foreground">JPG, GIF ou PNG. Max 2MB.</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nom complet</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input 
                          id="full_name" 
                          className="pl-9" 
                          value={profile?.full_name || ''} 
                          onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                          placeholder="Jean Dupont" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input 
                          id="email" 
                          className="pl-9" 
                          value={profile?.email || ''} 
                          disabled 
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">L'email ne peut pas être modifié pour des raisons de sécurité.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input 
                          id="phone" 
                          className="pl-9" 
                          value={profile?.phone || ''} 
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          placeholder="+243..." 
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border bg-secondary/10 px-6 py-4">
                  <Button type="submit" disabled={saving} className="ml-auto gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Enregistrer les modifications
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </TabsContent>

          <TabsContent value="company" className="space-y-6">
            <form onSubmit={handleUpdateProfile}>
              <Card>
                <CardHeader>
                  <CardTitle>Informations Entreprise</CardTitle>
                  <CardDescription>
                    Détails de votre entité commerciale pour la facturation et les contrats.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Nom de l'entreprise</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input 
                          id="company_name" 
                          className="pl-9" 
                          value={profile?.company_name || ''} 
                          onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                          placeholder="Alpha Trading SARL" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Pays de résidence</Label>
                      <Select 
                        value={profile?.country_id || ''} 
                        onValueChange={(val) => setProfile({ ...profile, country_id: val })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionnez un pays" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.id} value={country.id}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Ville</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input 
                          id="city" 
                          className="pl-9" 
                          value={profile?.city || ''} 
                          onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                          placeholder="Kinshasa" 
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border bg-secondary/10 px-6 py-4">
                  <Button type="submit" disabled={saving} className="ml-auto gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Sauvegarder les infos entreprise
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </TabsContent>

          <TabsContent value="verification" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Statut de vérification</CardTitle>
                    <CardDescription>
                      Vérifiez votre identité pour augmenter vos limites de transaction.
                    </CardDescription>
                  </div>
                  <Badge variant={profile?.status === 'VERIFIED' ? 'success' : 'outline'} className="h-6">
                    {profile?.status === 'VERIFIED' ? 'Vérifié' : 'Non vérifié'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30 border border-border">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium">Adresse Email</p>
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      </div>
                      <p className="text-sm text-muted-foreground">Votre adresse email a été vérifiée lors de l'inscription.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30 border border-border">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium">Numéro de Téléphone</p>
                        {profile?.phone ? (
                           <CheckCircle2 className="w-4 h-4 text-success" />
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Non vérifié</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Vérifiez votre numéro par SMS pour sécuriser vos retraits.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl border border-dashed border-border group hover:border-primary/50 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                      <ShieldCheck className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium">Identité (KYC)</p>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">Téléchargez une pièce d'identité valide (Passeport, CNI).</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sécurité du compte</CardTitle>
                <CardDescription>
                  Protégez votre compte avec l'authentification à deux facteurs et gérez vos sessions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Double Authentification (MFA)</p>
                      <p className="text-sm text-muted-foreground">Une couche de sécurité supplémentaire lors de la connexion.</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Activer</Button>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Changer le mot de passe</h4>
                  <div className="grid gap-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="current_password">Mot de passe actuel</Label>
                      <Input id="current_password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new_password">Nouveau mot de passe</Label>
                      <Input id="new_password" type="password" />
                    </div>
                    <Button variant="outline" className="w-fit">Mettre à jour le mot de passe</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
