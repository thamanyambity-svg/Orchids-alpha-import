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
  MapPin,
  Building2,
  Upload
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"

export default function PartnerSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [country, setCountry] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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

      setProfile({ ...profile, avatar_url: publicUrl })
      toast.success("Photo mise à jour")
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error("Erreur lors de l'upload")
    } finally {
      setUploadingAvatar(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, countries(*)')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)
      setCountry(profileData.countries)
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error("Erreur lors du chargement du profil")
    } finally {
      setLoading(false)
    }
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
          updated_at: new Date().toISOString()
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
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Paramètres Partenaire</h1>
        <p className="text-muted-foreground">Gérez vos informations de partenaire local et la sécurité de votre compte.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-background border border-border p-1">
              <TabsTrigger value="profile" className="gap-2">
                <User className="w-4 h-4" />
                Profil
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Lock className="w-4 h-4" />
                Sécurité
              </TabsTrigger>
            </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleAvatarUpload}
            />
            <form onSubmit={handleUpdateProfile}>
              <Card>
                <CardHeader>
                  <CardTitle>Informations Générales</CardTitle>
                  <CardDescription>
                    Vos coordonnées de contact et informations d&apos;entreprise.
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
                      <h4 className="font-medium mb-1">Logo / Photo</h4>
                      <p className="text-sm text-muted-foreground">Utilisé pour vos rapports de sourcing.</p>
                    </div>
                  </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Nom du contact</Label>
                        <Input 
                          id="full_name" 
                          value={profile?.full_name || ''} 
                          onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                          placeholder="Nom complet" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company_name">Nom de l&apos;entreprise</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input 
                            id="company_name" 
                            className="pl-9"
                            value={profile?.company_name || ''} 
                            onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                            placeholder="Alpha Partner SARL" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email professionnel</Label>
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
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                            placeholder="+..." 
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border bg-secondary/10 px-6 py-4">
                    <Button type="submit" disabled={saving} className="ml-auto gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Enregistrer
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sécurité</CardTitle>
                  <CardDescription>Protégez l&apos;accès à vos dossiers de sourcing.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">Mot de passe</p>
                        <p className="text-sm text-muted-foreground">Modifié récemment</p>
                      </div>
                    </div>
                    <Button variant="outline">Changer</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Juridiction & Statut</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-2xl">{country?.flag || '🌐'}</div>
                  <div>
                    <p className="font-bold">{country?.name || 'Non assigné'}</p>
                    <p className="text-xs text-muted-foreground">Zone d&apos;opération exclusive</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-success bg-success/10 p-2 rounded-lg">
                  <ShieldCheck className="w-3 h-3" />
                  Partenaire certifié Alpha
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Statut KYC</span>
                  <span className="text-success font-medium">Validé</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Caution déposée</span>
                  <span className="text-success font-medium">Oui</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Support Partenaire</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                Besoin d&apos;aide avec un dossier ou une mise à jour de statut ?
              </p>
              <Button variant="outline" className="w-full text-xs">Contacter l&apos;Admin</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
