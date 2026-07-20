"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n-context"
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
  Search,
  Sparkles,
  Plus,
  Trash2,
  Settings2,
  AlertCircle,
  Ship,
  Plane
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DashboardHeader } from "@/components/dashboard/header"
import { PartnerProfileCard } from "@/components/dashboard/partner-profile-card"
import { TextileSpecForm } from "@/components/dashboard/textile-spec-form"
import { VehicleSpecForm } from "@/components/dashboard/vehicle-spec-form"
import { GeneralSpecForm } from "@/components/dashboard/general-spec-form"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const WorldMap = dynamic(() => import("@/components/dashboard/world-map").then(mod => mod.WorldMap), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] rounded-2xl bg-muted animate-pulse border border-border" />
})

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

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
  { code: "CIV", name: "Côte d'Ivoire", flag: "🇨🇮" },
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

const REQUEST_CATEGORIES = [
  { value: "TEXTILE", labelKey: "dashboard.requests.new.cat_textile", label: "Textile & Habillement" },
  { value: "VEHICULE", labelKey: "dashboard.requests.new.cat_automotive", label: "Véhicules & Transport" },
  { value: "ELECTRONIQUE", labelKey: "dashboard.requests.new.cat_electronics", label: "Électronique & High-Tech" },
  { value: "MACHINERIE", labelKey: "dashboard.requests.new.cat_machinery", label: "Machinerie & Équipements" },
  { value: "COSMETIQUE", labelKey: "dashboard.requests.new.cat_cosmetics", label: "Cosmétiques & Beauté" },
  { value: "ALIMENTAIRE", labelKey: "dashboard.requests.new.cat_food", label: "Agroalimentaire" },
  { value: "CONSTRUCTION", labelKey: "dashboard.requests.new.cat_construction", label: "Matériaux de Construction" },
  { value: "AUTRE", labelKey: "dashboard.requests.new.cat_other", label: "Autre / Divers" },
]

const steps = [
  { id: 1, titleKey: "dashboard.requests.new.step_country", icon: Globe2 },
  { id: 2, titleKey: "dashboard.requests.new.step_product", icon: Package },
  { id: 3, titleKey: "dashboard.requests.new.step_summary", icon: FileText },
]

const mockPartners: Record<string, any> = {
  "CHN": {
    id: "p1", full_name: "Chen Wei", company_name: "Alpha Logistics China (Shenzhen)",
    bio: "Expert en sourcing et logistique industrielle en Chine depuis plus de 15 ans.",
    whatsapp_number: "+8613812345678", email: "chen.wei@alphaix-partner.cn",
    phone: "+8613812345678", experience_years: 15, total_orders_handled: 1250,
    performance_score: 4.9, country_name: "Chine"
  },
  "ARE": {
    id: "p2", full_name: "Achignon Bilongo", company_name: "MAARMALA - Head Officer",
    avatar_url: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/WhatsApp-Image-2026-01-07-at-22.12.11-1767820691638.jpeg?width=8000&height=8000&resize=contain",
    bio: "Spécialiste du commerce international à Dubaï chez MAARMALA.",
    whatsapp_number: "+971508253190", email: "maarmalasarl@gmail.com",
    phone: "+971508253190", experience_years: 12, total_orders_handled: 980,
    performance_score: 4.9, country_name: "Émirats Arabes Unis"
  },
  "TUR": {
    id: "p3", full_name: "Mehmet Demir", company_name: "Istanbul Export Solutions",
    bio: "Expert en textile et matériaux de construction basés en Turquie.",
    whatsapp_number: "+905321234567", email: "mehmet@alphaix-partner.tr",
    phone: "+905321234567", experience_years: 12, total_orders_handled: 620,
    performance_score: 4.7, country_name: "Turquie"
  },
  "THA": {
    id: "p4", full_name: "Somchai Patana", company_name: "Bangkok Global Sourcing",
    bio: "Spécialisé dans l'agroalimentaire et les produits manufacturés en Thaïlande.",
    whatsapp_number: "+66812345678", email: "somchai@alphaix-partner.th",
    phone: "+66812345678", experience_years: 8, total_orders_handled: 450,
    performance_score: 4.6, country_name: "Thaïlande"
  },
  "JPN": {
    id: "p5", full_name: "Hiroshi Tanaka", company_name: "Tokyo Precision Trading",
    bio: "Expert en ingénierie de précision et électronique de pointe au Japon.",
    whatsapp_number: "+819012345678", email: "hiroshi@alphaix-partner.jp",
    phone: "+819012345678", experience_years: 20, total_orders_handled: 1100,
    performance_score: 5.0, country_name: "Japon"
  }
}

export default function NewRequestPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [countries, setCountries] = useState<any[]>([])
  const [selectedPartner, setSelectedPartner] = useState<any>(null)

  const [formData, setFormData] = useState({
    buyerCountry: "",
    country: "",
    category: "TEXTILE",
    deadline: "",
    transportMode: "SEA",
  })

  const [items, setItems] = useState<any[]>([
    { id: Math.random().toString(36).substr(2, 9), productName: "", description: "", quantity: "", unit: "units", budgetMin: "", budgetMax: "", specs: {} }
  ])

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(36).substr(2, 9), productName: "", description: "", quantity: "", unit: "units", budgetMin: "", budgetMax: "", specs: {} }])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        if (field === "specs") {
          return { ...item, specs: { ...item.specs, ...value } }
        }
        return { ...item, [field]: value }
      }
      return item
    }))
  }

  useEffect(() => {
    async function fetchCountries() {
      const supabase = createClient()
      const { data } = await supabase.from("countries").select("*").eq("is_active", true)
      if (data) setCountries(data)
    }
    fetchCountries()
  }, [])

  useEffect(() => {
    if (formData.country) {
      const partner = mockPartners[formData.country]
      setSelectedPartner(partner || null)
    } else {
      setSelectedPartner(null)
    }
  }, [formData.country])

  const handleNext = () => {
    if (currentStep === 1 && (!formData.country || !formData.buyerCountry)) {
      toast.error(t("dashboard.requests.new.select_countries_error", "Veuillez sélectionner le pays d'origine et le pays d'achat"))
      return
    }
    if (currentStep === 2) {
      const invalidItems = items.some(item => 
        !item.productName || !item.quantity || !item.budgetMin || !item.budgetMax
      )
      if (invalidItems) {
        toast.error(t("dashboard.requests.new.incomplete_items", "Tous les champs produit sont requis"))
        return
      }
    }
    if (currentStep < 3) setCurrentStep(currentStep + 1)
  }

  const handleBack = () => { if (currentStep > 1) setCurrentStep(currentStep - 1) }

  const getCategoryForm = (item: any) => {
    const category = formData.category
    const itemData = { ...item, specs: item.specs || {} }
    
    if (category === "TEXTILE") {
      return (
        <TextileSpecForm
          initialData={itemData}
          onChange={(data) => updateItem(item.id, "specs", data)}
          lineNumber={items.findIndex(i => i.id === item.id) + 1}
        />
      )
    }
    if (category === "VEHICULE") {
      return (
        <VehicleSpecForm
          initialData={itemData}
          onChange={(data) => updateItem(item.id, "specs", data)}
          lineNumber={items.findIndex(i => i.id === item.id) + 1}
        />
      )
    }
    return (
      <GeneralSpecForm
        initialData={itemData}
        onChange={(data) => updateItem(item.id, "specs", data)}
        lineNumber={items.findIndex(i => i.id === item.id) + 1}
      />
    )
  }

  async function handleSubmit() {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error(t("dashboard.requests.new.not_authenticated", "Non authentifié"))

      const countryId = countries.find(c => c.code === formData.country)?.id

      const promises = items.map(item => {
        return fetch("/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buyer_id: user.id,
            country_id: countryId,
            buyer_country: formData.buyerCountry,
            category: formData.category,
            product_name: item.productName,
            specifications: {
              description: item.description,
              category_specific: item.specs || {}
            },
            quantity: parseInt(item.quantity),
            unit: item.unit,
            budget_min: parseFloat(item.budgetMin),
            budget_max: parseFloat(item.budgetMax),
            deadline: formData.deadline || null,
            transport_mode: formData.transportMode
          })
        })
      })

      const results = await Promise.all(promises)
      const failed = results.find(r => !r.ok)

      if (failed) {
        const data = await failed.json()
        throw new Error(data.error || t("dashboard.requests.new.create_error", "Erreur lors de la création"))
      }

      const created = await Promise.all(results.map(r => r.json()))
      toast.success(`${items.length} ${t("dashboard.requests.new.requests_created", "demande(s) créée(s) ! Prochaine étape : paiement 60%.")}`)
      router.push(`/dashboard/requests/${created[0].id}`)
    } catch (error: any) {
      toast.error(error.message || t("dashboard.requests.new.error_occurred", "Une erreur est survenue"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <DashboardHeader
        title={t("dashboard.requests.new.title", "Nouvelle demande")}
        subtitle={t("dashboard.requests.new.subtitle", "Trouvez votre partenaire certifié et lancez votre importation")}
      />

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/requests" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                {t("dashboard.requests.new.back_to_requests", "Retour aux demandes")}
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center gap-3 ${currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${currentStep >= step.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="hidden sm:block text-sm font-medium">{t(step.titleKey, step.title)}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 sm:w-24 h-0.5 mx-4 ${currentStep > step.id ? 'bg-primary' : 'bg-border'}`} />
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
                    <h2 className="text-2xl font-bold mb-1">{t("dashboard.requests.new.select_country", "Sélection du pays d'achat")}</h2>
                    <p className="text-muted-foreground">
                      {t("dashboard.requests.new.select_country_desc", "Choisissez le pays où vous souhaitez effectuer votre achat pour voir votre partenaire dédié.")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-primary bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="text-sm font-semibold">{t("dashboard.requests.new.certified_partners", "Partenaires Certifiés 100%")}</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 items-start">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">{t("dashboard.requests.new.buyer_country", "Pays d'origine de l'acheteur *")}</Label>
                      <Select value={formData.buyerCountry} onValueChange={(value) => setFormData({ ...formData, buyerCountry: value })}>
                        <SelectTrigger className="h-14 text-lg"><SelectValue placeholder={t("dashboard.requests.new.buyer_country_placeholder", "Votre pays de résidence")} /></SelectTrigger>
                        <SelectContent>
                          {allCountries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              <span className="flex items-center gap-3 py-1">
                                {country.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base font-semibold">{t("dashboard.requests.new.purchase_country", "Pays d'achat *")}</Label>
                      <Select value={formData.country} onValueChange={(value) => setFormData({ ...formData, country: value })}>
                        <SelectTrigger className="h-14 text-lg"><SelectValue placeholder={t("dashboard.requests.new.purchase_country_placeholder", "Où achetez-vous ?")} /></SelectTrigger>
                        <SelectContent>
                          {countries.length > 0 ? (
                            countries.map((country) => {
                              const countryInfo = allCountries.find(c => c.code === country.code);
                              return (
                                <SelectItem key={country.code} value={country.code}>
                                  <span className="flex items-center gap-3 py-1">
                                    {countryInfo?.name || country.name}
                                  </span>
                                </SelectItem>
                              );
                            })
                          ) : (
                            allCountries.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                <span className="flex items-center gap-3 py-1">
                                  {country.name}
                                </span>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base font-semibold italic opacity-70">{t("dashboard.requests.new.category", "Catégorie de produits *")}</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                        <SelectTrigger className="h-12"><SelectValue placeholder={t("dashboard.requests.new.category_placeholder", "Sélectionnez une catégorie")} /></SelectTrigger>
                        <SelectContent>
                          {REQUEST_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {t(cat.labelKey, cat.label)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/30 border border-border">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Search className="w-4 h-4 text-primary" />
                        {t("dashboard.requests.new.why_this_step", "Pourquoi cette étape ?")}
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t("dashboard.requests.new.why_this_step_desc", "AlphaIX vous connecte directement avec un expert local certifié. Chaque pays dispose d'une équipe dédiée pour garantir la sécurité de vos fonds et la conformité de vos produits.")}
                      </p>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {selectedPartner ? (
                      <div className="space-y-4" id="partner-card-container">
                        <Label className="text-base font-semibold">{t("dashboard.requests.new.your_dedicated_partner", "Votre partenaire dédié")}</Label>
                        <PartnerProfileCard
                          partner={selectedPartner}
                          onContact={(method) => {
                            toast.info(`${t("dashboard.requests.new.contact_via", "Contact via")} ${method} ${t("dashboard.requests.new.initiated", "initié")}`)
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-full min-h-[250px] flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-8 text-center bg-muted/10">
                        <Globe2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
                        <h3 className="font-semibold text-muted-foreground">{t("dashboard.requests.new.select_country_hint", "Sélectionnez un pays")}</h3>
                        <p className="text-sm text-muted-foreground max-w-[200px] mt-2">
                          {t("dashboard.requests.new.select_country_hint_desc", "Le profil de votre partenaire certifié s'affichera ici.")}
                        </p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{t("dashboard.requests.new.request_details", "Détails de votre demande")}</h2>
                    <p className="text-muted-foreground">
                      {t("dashboard.requests.new.request_details_desc", "Décrivez précisément ce que vous recherchez pour obtenir la meilleure cotation.")}
                    </p>
                  </div>

                </div>

                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="font-semibold">{t("dashboard.requests.new.category", "Catégorie de la demande *")}</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                        <SelectTrigger className="h-12 border-primary/20"><SelectValue placeholder={t("dashboard.requests.new.category_placeholder", "Sélectionnez une catégorie")} /></SelectTrigger>
                        <SelectContent>
                          {REQUEST_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {t(cat.labelKey, cat.label)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("dashboard.requests.new.transport_mode", "Mode d'expédition")} *</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          onClick={() => setFormData({ ...formData, transportMode: 'SEA' })}
                          className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-primary/50 ${formData.transportMode === 'SEA' ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Ship className="w-4 h-4 text-primary" />
                              <span className="font-semibold text-sm">{t("dashboard.requests.new.maritime_standard", "Maritime")}</span>
                            </div>
                            {formData.transportMode === 'SEA' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{t("dashboard.requests.new.maritime_desc", "Économique · 30–45 jours")}</p>
                        </div>
                        <div
                          onClick={() => setFormData({ ...formData, transportMode: 'AIR' })}
                          className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-primary/50 ${formData.transportMode === 'AIR' ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Plane className="w-4 h-4 text-primary" />
                              <span className="font-semibold text-sm">{t("dashboard.requests.new.air_express", "Aérien")}</span>
                            </div>
                            {formData.transportMode === 'AIR' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{t("dashboard.requests.new.air_desc", "Express · 5–7 jours")}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("dashboard.requests.new.deadline", "Date limite souhaitée")}</Label>
                    <Input type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-6">
                  {items.map((item, index) => (
                    <div key={item.id} className="relative p-6 rounded-2xl border border-border bg-muted/10 space-y-6">
                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-4 right-4 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}

                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {index + 1}
                        </div>
                        <h3 className="font-semibold">{t("dashboard.requests.new.product", "Produit")} {index + 1}</h3>
                      </div>

                      {getCategoryForm(item)}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border">
                        <div className="space-y-2">
                          <Label>{t("dashboard.requests.new.quantity", "Quantité *")}</Label>
                          <Input type="number" placeholder={t("dashboard.requests.new.quantity_placeholder", "Ex: 1")} className="h-12" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("dashboard.requests.new.unit", "Unité *")}</Label>
                          <Select value={item.unit} onValueChange={(value) => updateItem(item.id, "unit", value)}>
                            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="units">{t("dashboard.requests.new.units", "Unités")}</SelectItem>
                              <SelectItem value="kg">KG</SelectItem>
                              <SelectItem value="tons">{t("dashboard.requests.new.tons", "Tonnes")}</SelectItem>
                              <SelectItem value="cartons">{t("dashboard.requests.new.cartons", "Cartons")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label>{t("dashboard.requests.new.estimated_budget", "Budget estimé ($)")}</Label>
                          <div className="flex items-center gap-2">
                            <Input type="number" placeholder={t("dashboard.requests.new.budget_min", "Min")} className="h-12" value={item.budgetMin} onChange={(e) => updateItem(item.id, "budgetMin", e.target.value)} />
                            <span className="text-muted-foreground">-</span>
                            <Input type="number" placeholder={t("dashboard.requests.new.budget_max", "Max")} className="h-12" value={item.budgetMax} onChange={(e) => updateItem(item.id, "budgetMax", e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    className="w-full h-12 border-dashed border-2 hover:bg-primary/5 hover:border-primary/50 text-primary transition-all"
                    onClick={addItem}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("dashboard.requests.new.add_another_product", "Ajouter un autre produit à cette demande")}
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{t("dashboard.requests.new.final_verification", "Vérification finale")}</h2>
                  <p className="text-muted-foreground">
                    {t("dashboard.requests.new.final_verification_desc", "Relisez votre demande avant l'envoi à votre partenaire.")} {items.length > 1 && <span className="text-primary font-medium">{items.length} {t("dashboard.requests.new.sheets_will_be_created", "fiches seront créées.")}</span>}
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-6">
                    <div className="p-6 rounded-2xl bg-muted/30 border border-border">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        {t("dashboard.requests.new.summary_title", "Récapitulatif de l'Importation")}
                      </h3>
                      <div className="grid grid-cols-2 gap-y-4 text-sm mb-6 pb-6 border-b border-border/50">
                        <div className="col-span-2">
                          <p className="text-muted-foreground mb-2">{t("dashboard.requests.new.shipping_mode", "Mode d'expédition")}</p>
                          <div className="flex gap-3">
                            <button type="button" onClick={() => setFormData({ ...formData, transportMode: 'SEA' })} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${formData.transportMode === 'SEA' ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border hover:border-primary/50'}`}>
                              <Ship className="w-4 h-4" /> {t("dashboard.requests.new.maritime", "Maritime")}
                            </button>
                            <button type="button" onClick={() => setFormData({ ...formData, transportMode: 'AIR' })} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${formData.transportMode === 'AIR' ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border hover:border-primary/50'}`}>
                              <Plane className="w-4 h-4" /> {t("dashboard.requests.new.by_air", "Par avion")}
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("dashboard.requests.new.buyer_country_review", "Pays d'origine (Acheteur)")}</p>
                          <p className="font-semibold">{allCountries.find(c => c.code === formData.buyerCountry)?.name || formData.buyerCountry}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("dashboard.requests.new.purchase_country_review", "Pays d'achat")}</p>
                          <p className="font-semibold">{allCountries.find(c => c.code === formData.country)?.name || formData.country}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("dashboard.requests.new.category_review", "Catégorie")}</p>
                          <p className="font-semibold">{t(`dashboard.requests.new.cat_${formData.category.toLowerCase()}`, formData.category)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("dashboard.requests.new.sheets_count", "Nombre de fiches")}</p>
                          <p className="font-semibold">{items.length}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("dashboard.requests.new.product_list", "Liste des Produits")}</p>
                        {items.map((item, idx) => (
                          <div key={item.id} className="p-4 rounded-xl bg-card border border-border">
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-bold text-primary"># {idx + 1} - {item.productName || t("dashboard.requests.new.unnamed", "Sans nom")}</p>
                              <Badge variant="outline">{item.quantity} {item.unit}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                            <p className="text-xs font-semibold mt-2">{t("dashboard.requests.new.budget", "Budget")}: ${item.budgetMin} - ${item.budgetMax}</p>
                            <p className="text-xs text-muted-foreground mt-1">Catégorie: {formData.category}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="font-semibold">{t("dashboard.requests.new.responsible_partner", "Partenaire Responsable")}</Label>
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
                            <span className="text-muted-foreground">{t("dashboard.requests.new.score", "Score")}</span>
                            <span className="font-bold text-amber-500">{selectedPartner.performance_score}/5.0</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("dashboard.requests.new.orders", "Commandes")}</span>
                            <span className="font-bold">{selectedPartner.total_orders_handled}+</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs">
                        <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
                        <p className="text-amber-700 font-medium">
                          {t("dashboard.requests.new.secured_funds", "Vos fonds sont sécurisés via notre compte séquestre jusqu'à validation de la livraison.")}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <p className="text-sm text-muted-foreground">
                          {t("dashboard.requests.new.next_steps", "Après soumission :")} 
                          <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
                            <li>{t("dashboard.requests.new.step1_admin", "Validation admin (24-48h)")}</li>
                            <li>{t("dashboard.requests.new.step2_partner_quote", "Devis partenaire (proforma tout inclus)")}</li>
                            <li>{t("dashboard.requests.new.step3_accept_quote", "Vous validez le devis → Bon de commande auto")}</li>
                            <li>{t("dashboard.requests.new.step4_48h", "48h pour annuler sans frais")}</li>
                            <li>{t("dashboard.requests.new.step5_deposit", "Paiement acompte 60% (carte/SEPA)")}</li>
                          </ol>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-border">
                  <Button variant="outline" onClick={handleBack} disabled={isLoading}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t("dashboard.requests.new.back", "Retour")}
                  </Button>
                  <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {t("dashboard.requests.new.submit", "Soumettre la demande")}
                  </Button>
                </div>
              </div>
            )}

          </motion.div>

          <div className="flex items-center justify-between mb-8">
            {currentStep === 1 ? (
              <Button onClick={handleNext} disabled={isLoading} className="ml-auto gap-2">
                {t("dashboard.requests.new.next", "Suivant")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : currentStep === 2 ? (
              <div className="flex gap-3 ml-auto">
                <Button variant="outline" onClick={handleBack} disabled={isLoading}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t("dashboard.requests.new.back", "Retour")}
                </Button>
                <Button onClick={handleNext} disabled={isLoading} className="gap-2">
                  {t("dashboard.requests.new.next", "Suivant")}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={handleBack} disabled={isLoading}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t("dashboard.requests.new.back", "Retour")}
                </Button>
                <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {t("dashboard.requests.new.submit", "Soumettre la demande")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}