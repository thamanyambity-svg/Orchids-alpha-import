"use client"

import { useState, useEffect, useRef } from "react"
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
  MapPin,
  ExternalLink,
  Plus,
  FileText,
  Upload
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
import { KycUploadModal } from "@/components/dashboard/kyc-upload-modal"

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [countries, setCountries] = useState<any[]>([])
  const [kycDocuments, setKycDocuments] = useState<any[]>([])
  const [kycModalOpen, setKycModalOpen] = useState(false)
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
      toast.success("Photo de profil mise à jour")
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error("Erreur lors de l'upload")
    } finally {
      setUploadingAvatar(false)
    }
  }

  const documentTypeLabels: Record<string, string> = {
    PASSPORT: "Passeport",
    ID_CARD: "Carte d'Identité",
    DRIVERS_LICENSE: "Permis de Conduire",
    PROOF_OF_ADDRESS: "Justificatif de Domicile",
    COMPANY_REGISTRATION: "RCCM / Registre",
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, kycRes, countriesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('request_documents').select('*').eq('uploaded_by', user.id).is('request_id', null).order('created_at', { ascending: false }),
        supabase.from('countries').select('*').order('name')
      ])

      if (profileRes.error) throw profileRes.error
      setProfile(profileRes.data)
      setKycDocuments(kycRes.data || [])
      setCountries(countriesRes.data || [])
    } catch (error) {
      console.error('Error fetching settings data:', error)
      toast.error("Erreur lors du chargement des paramètres")
    } finally {
      setLoading(false)
    }
  }

  const fetchKycDocuments = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('request_documents')
      .select('*')
      .eq('uploaded_by', user.id)
      .is('request_id', null)
      .order('created_at', { ascending: false })
    if (data) setKycDocuments(data)
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

    const selectedCountry = countries.find(c => c.id === profile?.country_id)

    return (
      <div className="pb-10">
        <DashboardHeader 
          title="Mon Profil" 
          subtitle="Consultez et gérez vos informations personnelles"
        />

        <div className="p-6 max-w-5xl mx-auto">
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
                    {profile?.status === 'VERIFIED' && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center border-2 border-background z-10">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold">{profile?.full_name || 'Nom non défini'}</h2>
                    <Badge variant={profile?.status === 'VERIFIED' ? 'success' : 'outline'} className="text-[10px]">
                      {profile?.status === 'VERIFIED' ? 'Vérifié' : 'Non vérifié'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{profile?.company_name || 'Entreprise non renseignée'}</p>
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
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-muted-foreground mb-1">ID Client</p>
                  <p className="font-mono text-xs bg-muted px-2 py-1 rounded">{profile?.id?.slice(0, 8).toUpperCase() || '-'}</p>
                </div>
              </div>
            </div>
          </Card>

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
                  <CardTitle>Informations Personnelles</CardTitle>
                  <CardDescription>
                    Mettez à jour vos coordonnées et votre photo de profil.
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

                    <div className="flex items-start gap-4 p-4 rounded-xl border border-dashed border-border group hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setKycModalOpen(true)}>
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                        <ShieldCheck className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">Identité (KYC)</p>
                          <Plus className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground">Téléchargez une pièce d'identité valide (Passeport, CNI).</p>
                      </div>
                    </div>

                    {kycDocuments.length > 0 && (
                      <div className="space-y-3 pt-4">
                        <h4 className="text-sm font-semibold">Documents soumis</h4>
                        <div className="grid gap-3">
                          {kycDocuments.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                              <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-primary" />
                                <div>
                                  <p className="text-xs font-medium">{documentTypeLabels[doc.type] || doc.type}</p>
                                  <p className="text-[10px] text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] uppercase">{doc.status}</Badge>
                                <Button size="icon" variant="ghost" asChild className="h-7 w-7">
                                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <KycUploadModal 
          open={kycModalOpen} 
          onOpenChange={setKycModalOpen} 
          onSuccess={fetchKycDocuments} 
        />
      </div>
    )
  }

