"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ArrowLeft, 
  ArrowRight,
  Globe2,
  Package,
  FileText,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Search
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DashboardHeader } from "@/components/dashboard/header"
import { PartnerProfileCard } from "@/components/dashboard/partner-profile-card"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const WorldMap = dynamic(() => import("@/components/dashboard/world-map").then(mod => mod.WorldMap), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] rounded-2xl bg-muted animate-pulse border border-border" />
})

const MAPBOX_TOKEN = "pk.eyJ1IjoiYW9ub3MiLCJhIjoiY21qeXFqNXV5NXlsZDNmczUybDl5MGZvOCJ9.GeNnocvMZI63AeO6K1ByjQ"

const allCountries = [
  { code: "AFG", name: "Afghanistan", flag: "🇦🇫" },
  { code: "ALB", name: "Albanie", flag: "🇦🇱" },
  { code: "DZA", name: "Algérie", flag: "🇩🇿" },
  { code: "DEU", name: "Allemagne", flag: "🇩🇪" },
  { code: "AND", name: "Andorre", flag: "🇦🇩" },
  { code: "AGO", name: "Angola", flag: "🇦🇴" },
  { code: "SAU", name: "Arabie Saoudite", flag: "🇸🇦" },
  { code: "ARG", name: "Argentine", flag: "🇦🇷" },
  { code: "ARM", name: "Arménie", flag: "🇦🇲" },
  { code: "AUS", name: "Australie", flag: "🇦🇺" },
  { code: "AUT", name: "Autriche", flag: "🇦🇹" },
  { code: "AZE", name: "Azerbaïdjan", flag: "🇦🇿" },
  { code: "BHS", name: "Bahamas", flag: "🇧🇸" },
  { code: "BHR", name: "Bahreïn", flag: "🇧🇭" },
  { code: "BGD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "BEL", name: "Belgique", flag: "🇧🇪" },
  { code: "BEN", name: "Bénin", flag: "🇧🇯" },
  { code: "BOL", name: "Bolivie", flag: "🇧🇴" },
  { code: "BRA", name: "Brésil", flag: "🇧🇷" },
  { code: "BGR", name: "Bulgarie", flag: "🇧🇬" },
  { code: "BFA", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "BDI", name: "Burundi", flag: "🇧🇮" },
  { code: "KHM", name: "Cambodge", flag: "🇰🇭" },
  { code: "CMR", name: "Cameroun", flag: "🇨🇲" },
  { code: "CAN", name: "Canada", flag: "🇨🇦" },
  { code: "CPV", name: "Cap-Vert", flag: "🇨🇻" },
  { code: "CHL", name: "Chili", flag: "🇨🇱" },
  { code: "CHN", name: "Chine", flag: "🇨🇳" },
  { code: "CYP", name: "Chypre", flag: "🇨🇾" },
  { code: "COL", name: "Colombie", flag: "🇨🇴" },
  { code: "COG", name: "Congo-Brazzaville", flag: "🇨🇬" },
  { code: "COD", name: "Congo-Kinshasa", flag: "🇨🇩" },
  { code: "KOR", name: "Corée du Sud", flag: "🇰🇷" },
  { code: "CIV", name: "Côte d’Ivoire", flag: "🇨🇮" },
  { code: "HRV", name: "Croatie", flag: "🇭🇷" },
  { code: "CUB", name: "Cuba", flag: "🇨🇺" },
  { code: "DNK", name: "Danemark", flag: "🇩🇰" },
  { code: "DJI", name: "Djibouti", flag: "🇩🇯" },
  { code: "EGY", name: "Égypte", flag: "🇪🇬" },
  { code: "ARE", name: "Émirats Arabes Unis", flag: "🇦🇪" },
  { code: "ECU", name: "Équateur", flag: "🇪🇨" },
  { code: "ESP", name: "Espagne", flag: "🇪🇸" },
  { code: "EST", name: "Estonie", flag: "🇪🇪" },
  { code: "USA", name: "États-Unis", flag: "🇺🇸" },
  { code: "ETH", name: "Éthiopie", flag: "🇪🇹" },
  { code: "FIN", name: "Finlande", flag: "🇫🇮" },
  { code: "FRA", name: "France", flag: "🇫🇷" },
  { code: "GAB", name: "Gabon", flag: "🇬🇦" },
  { code: "GMB", name: "Gambie", flag: "🇬🇲" },
  { code: "GHA", name: "Ghana", flag: "🇬🇭" },
  { code: "GRC", name: "Grèce", flag: "🇬🇷" },
  { code: "GTM", name: "Guatemala", flag: "🇬🇹" },
  { code: "GIN", name: "Guinée", flag: "🇬🇳" },
  { code: "HTI", name: "Haïti", flag: "🇭🇹" },
  { code: "HND", name: "Honduras", flag: "🇭🇳" },
  { code: "HUN", name: "Hongrie", flag: "🇭🇺" },
  { code: "IND", name: "Inde", flag: "🇮🇳" },
  { code: "IDN", name: "Indonésie", flag: "🇮🇩" },
  { code: "IRQ", name: "Irak", flag: "🇮🇶" },
  { code: "IRN", name: "Iran", flag: "🇮🇷" },
  { code: "IRL", name: "Irlande", flag: "🇮🇪" },
  { code: "ISL", name: "Islande", flag: "🇮🇸" },
  { code: "ISR", name: "Israël", flag: "🇮🇱" },
  { code: "ITA", name: "Italie", flag: "🇮🇹" },
  { code: "JAM", name: "Jamaïque", flag: "🇯🇲" },
  { code: "JPN", name: "Japon", flag: "🇯🇵" },
  { code: "JOR", name: "Jordanie", flag: "🇯🇴" },
  { code: "KAZ", name: "Kazakhstan", flag: "🇰🇿" },
  { code: "KEN", name: "Kenya", flag: "🇰🇪" },
  { code: "KWT", name: "Koweït", flag: "🇰🇼" },
  { code: "LBN", name: "Liban", flag: "🇱🇧" },
  { code: "LBR", name: "Liberia", flag: "🇱🇷" },
  { code: "LBY", name: "Libye", flag: "🇱🇾" },
  { code: "LUX", name: "Luxembourg", flag: "🇱🇺" },
  { code: "MDG", name: "Madagascar", flag: "🇲🇬" },
  { code: "MYS", name: "Malaisie", flag: "🇲🇾" },
  { code: "MLI", name: "Mali", flag: "🇲🇱" },
  { code: "MLT", name: "Malte", flag: "🇲🇹" },
  { code: "MAR", name: "Maroc", flag: "🇲🇦" },
  { code: "MEX", name: "Mexique", flag: "🇲🇽" },
  { code: "MCO", name: "Monaco", flag: "🇲🇨" },
  { code: "MNG", name: "Mongolie", flag: "🇲🇳" },
  { code: "NAM", name: "Namibie", flag: "🇳🇦" },
  { code: "NPL", name: "Népal", flag: "🇳🇵" },
  { code: "NER", name: "Niger", flag: "🇳🇪" },
  { code: "NGA", name: "Nigeria", flag: "🇳🇬" },
  { code: "NOR", name: "Norvège", flag: "🇳🇴" },
  { code: "NZL", name: "Nouvelle-Zélande", flag: "🇳🇿" },
  { code: "OMN", name: "Oman", flag: "🇴🇲" },
  { code: "UGA", name: "Ouganda", flag: "🇺🇬" },
  { code: "PAK", name: "Pakistan", flag: "🇵🇰" },
  { code: "PAN", name: "Panama", flag: "🇵🇦" },
  { code: "NLD", name: "Pays-Bas", flag: "🇳🇱" },
  { code: "PER", name: "Pérou", flag: "🇵🇪" },
  { code: "PHL", name: "Philippines", flag: "🇵🇭" },
  { code: "POL", name: "Pologne", flag: "🇵🇱" },
  { code: "PRT", name: "Portugal", flag: "🇵🇹" },
  { code: "QAT", name: "Qatar", flag: "🇶🇦" },
  { code: "ROU", name: "Roumanie", flag: "🇷🇴" },
  { code: "GBR", name: "Royaume-Uni", flag: "🇬🇧" },
  { code: "RUS", name: "Russie", flag: "🇷🇺" },
  { code: "RWA", name: "Rwanda", flag: "🇷🇼" },
  { code: "SEN", name: "Sénégal", flag: "🇸🇳" },
  { code: "SRB", name: "Serbie", flag: "🇷🇸" },
  { code: "SGP", name: "Singapour", flag: "🇸🇬" },
  { code: "SVK", name: "Slovaquie", flag: "🇸🇰" },
  { code: "SVN", name: "Slovénie", flag: "🇸🇮" },
  { code: "SOM", name: "Somalie", flag: "🇸🇴" },
  { code: "SDN", name: "Soudan", flag: "🇸🇩" },
  { code: "LKA", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "SWE", name: "Suède", flag: "🇸🇪" },
  { code: "CHE", name: "Suisse", flag: "🇨🇭" },
  { code: "SYR", name: "Syrie", flag: "🇸🇾" },
  { code: "TJK", name: "Tadjikistan", flag: "🇹🇯" },
  { code: "TZA", name: "Tanzanie", flag: "🇹🇿" },
  { code: "TCD", name: "Tchad", flag: "🇹🇩" },
  { code: "THA", name: "Thaïlande", flag: "🇹🇭" },
  { code: "TOG", name: "Togo", flag: "🇹🇬" },
  { code: "TUN", name: "Tunisie", flag: "🇹🇳" },
  { code: "TUR", name: "Turquie", flag: "🇹🇷" },
  { code: "UKR", name: "Ukraine", flag: "🇺🇦" },
  { code: "URY", name: "Uruguay", flag: "🇺🇾" },
  { code: "VEN", name: "Venezuela", flag: "🇻🇪" },
  { code: "VNM", name: "Vietnam", flag: "🇻🇳" },
  { code: "YEM", name: "Yémen", flag: "🇾🇪" },
  { code: "ZMB", name: "Zambie", flag: "🇿🇲" },
  { code: "ZWE", name: "Zimbabwe", flag: "🇿🇼" },
].sort((a, b) => a.name.localeCompare(b.name))

const categories = [
  "Électronique",
  "Textile & Habillement",
  "Automobile & Pièces",
  "Machines & Équipements",
  "Cosmétiques & Beauté",
  "Alimentation",
  "Matériaux de construction",
  "Autre"
]

const steps = [
  { id: 1, title: "Pays & Partenaire", icon: Globe2 },
  { id: 2, title: "Détails Produit", icon: Package },
  { id: 3, title: "Récapitulatif", icon: FileText },
]

const mockPartners: Record<string, any> = {
  "CHN": {
    id: "p1",
    full_name: "Chen Wei",
    company_name: "Alpha Logistics China (Shenzhen)",
    bio: "Expert en sourcing et logistique industrielle en Chine depuis plus de 15 ans. Spécialisé dans les produits électroniques et les machines industrielles. Nous garantissons une vérification rigoureuse des fournisseurs.",
    whatsapp_number: "+8613812345678",
    email: "chen.wei@alphaix-partner.cn",
    phone: "+8613812345678",
    experience_years: 15,
    total_orders_handled: 1250,
    performance_score: 4.9,
    country_name: "Chine"
  },
  "ARE": {
    id: "p2",
    full_name: "Ahmed Al-Maktoum",
    company_name: "Dubai Trade Hub & Logistics",
    bio: "Spécialiste du commerce international à Dubaï. Expertise approfondie en transit maritime et aérien. Nous facilitons vos échanges via le hub logistique le plus dynamique au monde.",
    whatsapp_number: "+971501234567",
    email: "ahmed@alphaix-partner.ae",
    phone: "+971501234567",
    experience_years: 10,
    total_orders_handled: 850,
    performance_score: 4.8,
    country_name: "Émirats Arabes Unis"
  },
  "TUR": {
    id: "p3",
    full_name: "Mehmet Demir",
    company_name: "Istanbul Export Solutions",
    bio: "Expert en textile et matériaux de construction basés en Turquie. Connecté aux meilleurs fabricants d'Istanbul et d'Ankara. Votre partenaire de confiance pour le sourcing de qualité européenne.",
    whatsapp_number: "+905321234567",
    email: "mehmet@alphaix-partner.tr",
    phone: "+905321234567",
    experience_years: 12,
    total_orders_handled: 620,
    performance_score: 4.7,
    country_name: "Turquie"
  },
  "THA": {
    id: "p4",
    full_name: "Somchai Patana",
    company_name: "Bangkok Global Sourcing",
    bio: "Spécialisé dans l'agroalimentaire et les produits manufacturés en Thaïlande. Nous assurons la liaison entre les producteurs locaux et le marché international avec une transparence totale.",
    whatsapp_number: "+66812345678",
    email: "somchai@alphaix-partner.th",
    phone: "+66812345678",
    experience_years: 8,
    total_orders_handled: 450,
    performance_score: 4.6,
    country_name: "Thaïlande"
  }
}

export default function NewRequestPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [countries, setCountries] = useState<any[]>([])
  const [selectedPartner, setSelectedPartner] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    country: "",
    category: "",
    productName: "",
    description: "",
    quantity: "",
    unit: "",
    budgetMin: "",
    budgetMax: "",
    deadline: "",
    additionalNotes: "",
  })

  useEffect(() => {
    async function fetchCountries() {
      const supabase = createClient()
      const { data } = await supabase
        .from("countries")
        .select("*")
        .eq("is_active", true)
      
      if (data) {
        setCountries(data)
      }
    }
    fetchCountries()
  }, [])

  useEffect(() => {
    if (formData.country) {
      // In a real app, we would fetch the partner from the DB
      // For this test mode, we use the mock data
      const partner = mockPartners[formData.country]
      setSelectedPartner(partner || null)
    } else {
      setSelectedPartner(null)
    }
  }, [formData.country])

  function handleNext() {
    if (currentStep === 1 && !formData.country) {
      toast.error("Veuillez sélectionner un pays")
      return
    }
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  async function handleSubmit() {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error("Non authentifié")

      const { error } = await supabase
        .from("import_requests")
        .insert({
          buyer_id: user.id,
          country_id: countries.find(c => c.code === formData.country)?.id,
          category: formData.category,
          product_name: formData.productName,
          specifications: {
            description: formData.description,
            additionalNotes: formData.additionalNotes
          },
          quantity: parseInt(formData.quantity),
          unit: formData.unit,
          budget_min: parseFloat(formData.budgetMin),
          budget_max: parseFloat(formData.budgetMax),
          deadline: formData.deadline || null,
          status: "PENDING"
        })

      if (error) throw error

      toast.success("Demande créée avec succès !")
      router.push("/dashboard/requests")
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <DashboardHeader 
        title="Nouvelle demande" 
        subtitle="Trouvez votre partenaire certifié et lancez votre importation"
      />

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/requests" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Retour aux demandes
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center gap-3 ${currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    currentStep >= step.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="hidden sm:block text-sm font-medium">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 sm:w-24 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-border'
                  }`} />
                )}
              </div>
            ))}
          </div>

          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-8 rounded-2xl bg-card border border-border shadow-sm"
          >
            {currentStep === 1 && (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Sélection du pays d'achat</h2>
                    <p className="text-muted-foreground">
                      Choisissez le pays où vous souhaitez effectuer votre achat pour voir votre partenaire dédié.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-primary bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="text-sm font-semibold">Partenaires Certifiés 100%</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 items-start">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Pays d'origine *</Label>
                      <Select
                        value={formData.country}
                        onValueChange={(value) => setFormData({ ...formData, country: value })}
                      >
                        <SelectTrigger className="h-14 text-lg">
                          <SelectValue placeholder="Où achetez-vous ?" />
                        </SelectTrigger>
                          <SelectContent>
                            {allCountries.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                <span className="flex items-center gap-3 py-1">
                                  <span className="text-2xl">{country.flag}</span>
                                  {country.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-base font-semibold italic opacity-70">Aperçu géographique</Label>
                        <WorldMap 
                          mapboxToken={MAPBOX_TOKEN}
                          selectedCountry={formData.country}
                          onCountrySelect={(code) => setFormData({ ...formData, country: code })}
                          partners={mockPartners}
                        />
                      </div>

                      <div className="p-4 rounded-xl bg-muted/30 border border-border">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Search className="w-4 h-4 text-primary" />
                        Pourquoi cette étape ?
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        AlphaIX vous connecte directement avec un expert local certifié. 
                        Chaque pays dispose d'une équipe dédiée pour garantir la sécurité 
                        de vos fonds et la conformité de vos produits.
                      </p>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {selectedPartner ? (
                      <div className="space-y-4">
                        <Label className="text-base font-semibold">Votre partenaire dédié</Label>
                        <PartnerProfileCard 
                          partner={selectedPartner}
                          onContact={(method) => {
                            toast.info(`Contact via ${method} initié`)
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-full min-h-[250px] flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-8 text-center bg-muted/10">
                        <Globe2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
                        <h3 className="font-semibold text-muted-foreground">Sélectionnez un pays</h3>
                        <p className="text-sm text-muted-foreground max-w-[200px] mt-2">
                          Le profil de votre partenaire certifié s'affichera ici.
                        </p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Détails de votre demande</h2>
                  <p className="text-muted-foreground">
                    Décrivez précisément ce que vous recherchez pour obtenir la meilleure cotation.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-semibold">Catégorie *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Sélectionnez" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold">Nom du produit *</Label>
                    <Input
                      placeholder="Ex: iPhone 15 Pro Max 256GB"
                      className="h-12"
                      value={formData.productName}
                      onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Description détaillée & Spécifications *</Label>
                  <Textarea
                    placeholder="Couleurs, dimensions, puissance, emballage requis..."
                    className="min-h-[120px] resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-1">
                    <Label className="font-semibold">Quantité *</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 50"
                      className="h-12"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 col-span-1">
                    <Label className="font-semibold">Unité *</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Unité" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="units">Unités</SelectItem>
                        <SelectItem value="kg">KG</SelectItem>
                        <SelectItem value="tons">Tonnes</SelectItem>
                        <SelectItem value="cartons">Cartons</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label className="font-semibold">Budget total estimé ($)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        className="h-12"
                        value={formData.budgetMin}
                        onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        className="h-12"
                        value={formData.budgetMax}
                        onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Vérification finale</h2>
                  <p className="text-muted-foreground">
                    Relisez votre demande avant l'envoi à votre partenaire.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-6">
                    <div className="p-6 rounded-2xl bg-muted/30 border border-border">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        Détails de la commande
                      </h3>
                      <div className="grid grid-cols-2 gap-y-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Produit</p>
                          <p className="font-semibold">{formData.productName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Catégorie</p>
                          <p className="font-semibold">{formData.category}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Quantité</p>
                          <p className="font-semibold">{formData.quantity} {formData.unit}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Budget</p>
                          <p className="font-semibold">${formData.budgetMin} - ${formData.budgetMax}</p>
                        </div>
                        <div className="col-span-2 pt-2">
                          <p className="text-muted-foreground">Description</p>
                          <p className="text-sm mt-1 leading-relaxed">{formData.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="font-semibold">Partenaire Responsable</Label>
                    {selectedPartner && (
                      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                            {selectedPartner.full_name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{selectedPartner.full_name}</p>
                            <p className="text-xs text-muted-foreground">{selectedPartner.company_name}</p>
                          </div>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Score</span>
                            <span className="font-bold text-amber-500">{selectedPartner.performance_score}/5.0</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Commandes</span>
                            <span className="font-bold">{selectedPartner.total_orders_handled}+</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs">
                      <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
                      <p className="text-amber-700 font-medium">
                        Vos fonds sont sécurisés via notre compte séquestre jusqu'à validation de la livraison.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-12 pt-8 border-t border-border">
              <Button
                variant="outline"
                size="lg"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="px-8"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Précédent
              </Button>

              {currentStep < 3 ? (
                <Button size="lg" onClick={handleNext} className="px-10">
                  Suivant
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button size="lg" onClick={handleSubmit} disabled={isLoading} className="px-10 bg-primary hover:bg-primary/90">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Confirmer et Envoyer
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
