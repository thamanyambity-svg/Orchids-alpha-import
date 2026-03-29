"use client"

import { useState, useEffect, useRef } from "react"
import {
  User,
  ShieldCheck,
  Lock,
  Loader2,
  Save,
  Mail,
  Phone,
  Camera,
  Building2,
  MapPin,
  CheckCircle2,
  Upload
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
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

interface AdminProfile {
  id: string
  email: string
  full_name: string
  phone: string
  company_name: string
  country_id: string | null
  city: string | null
  status: string
  role?: string
  avatar_url?: string | null
}

interface CountryOption {
  id: string
  name: string
  code?: string
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [countries, setCountries] = useState<CountryOption[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2MB")
      return
    }

    setUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : prev)
      toast.success("Photo de profil mise à jour")
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error("Erreur lors de l'upload")
    } finally {
      setUploadingAvatar(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, countriesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('countries').select('*').order('name')
      ])

      if (profileRes.error) throw profileRes.error

      // If no profile, use default structure with user.id and email
      setProfile(profileRes.data || {
        id: user.id,
        email: user.email,
        full_name: '',
        phone: '',
        company_name: '',
        country_id: null,
        city: null,
        status: 'PENDING'
      })
      setCountries(countriesRes.data || [])
    } catch (error) {
      console.error('Error fetching admin profile:', error)
      toast.error("Erreur lors du chargement du profil")
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: profile.id, // Ensure ID is included for upsert
          email: profile.email, // Ensure email is preserved
          role: profile.role || 'ADMIN', // Default role if missing
          status: profile.status || 'VERIFIED',
          full_name: profile.full_name,
          phone: profile.phone,
          company_name: profile.company_name,
          city: profile.city,
          country_id: profile.country_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (error) throw error
      toast.success("Profil administrateur mis à jour")
    } catch (error) {
      console.error('Error updating admin profile:', error)
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

  const selectedCountry = countries.find(c => c.id === profile?.country_id)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Paramètres Administrateur</h1>
        <p className="text-muted-foreground">Gérez vos informations personnelles et la sécurité de votre compte admin.</p>
      </div>

      <Card className="mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-xl overflow-hidden relative">
                {uploadingAvatar ? (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-primary" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center border-2 border-background z-10">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">{profile?.full_name || 'Admin'}</h2>
                <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-200 text-[10px]">Administrateur</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{profile?.company_name || 'AlphaIX Admin'}</p>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{profile?.email || '-'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{profile?.phone || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{profile?.city ? `${profile.city}, ${selectedCountry?.name || ''}` : 'Localisation non renseignée'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="profile" className="space-y-6">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleAvatarUpload}
        />
        <TabsList className="bg-background border border-border p-1">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profil Personnel
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="w-4 h-4" />
            Institution
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
                  Mettez à jour vos coordonnées d&apos;administrateur.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-dashed border-primary/30 overflow-hidden relative">
                      {uploadingAvatar ? (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                      ) : profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-primary" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="w-8 h-8 text-white" />
                      </div>
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
                        onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : prev)}
                        placeholder="Admin Alpha"
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        className="pl-9"
                        value={profile?.phone || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, phone: e.target.value } : prev)}
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
                <CardTitle>Informations Institutionnelles</CardTitle>
                <CardDescription>
                  Détails de l&apos;entité administratrice.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Nom de l&apos;institution</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="company_name"
                        className="pl-9"
                        value={profile?.company_name || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, company_name: e.target.value } : prev)}
                        placeholder="Alpha Trading SARL"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Pays</Label>
                    <Select
                      value={profile?.country_id || ''}
                      onValueChange={(val) => setProfile(prev => prev ? { ...prev, country_id: val } : prev)}
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
                        onChange={(e) => setProfile(prev => prev ? { ...prev, city: e.target.value } : prev)}
                        placeholder="Kinshasa"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border bg-secondary/10 px-6 py-4">
                <Button type="submit" disabled={saving} className="ml-auto gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Sauvegarder les infos institutionnelles
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sécurité du compte</CardTitle>
              <CardDescription>
                Gérez votre mot de passe et l&apos;authentification à deux facteurs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Mot de passe</p>
                    <p className="text-sm text-muted-foreground">Dernière modification il y a 3 mois</p>
                  </div>
                </div>
                <Button variant="outline">Modifier</Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Authentification à deux facteurs</p>
                    <p className="text-sm text-muted-foreground">Sécurisez votre compte avec un code MFA</p>
                  </div>
                </div>
                <Button variant="outline">Activer</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
