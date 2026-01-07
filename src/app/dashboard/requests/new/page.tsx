"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { 
  ArrowLeft, 
  ArrowRight,
  Globe2,
  Package,
  FileText,
  CheckCircle2,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DashboardHeader } from "@/components/dashboard/header"
import { toast } from "sonner"

const countries = [
  { code: "CHN", name: "Chine", flag: "🇨🇳" },
  { code: "ARE", name: "Émirats Arabes Unis", flag: "🇦🇪" },
  { code: "TUR", name: "Turquie", flag: "🇹🇷" },
  { code: "THA", name: "Thaïlande", flag: "🇹🇭" },
]

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
  { id: 1, title: "Pays & Produit", icon: Globe2 },
  { id: 2, title: "Spécifications", icon: Package },
  { id: 3, title: "Récapitulatif", icon: FileText },
]

export default function NewRequestPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
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

  function handleNext() {
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
    await new Promise(resolve => setTimeout(resolve, 2000))
    toast.success("Demande créée avec succès !")
    router.push("/dashboard/requests")
  }

  return (
    <div>
      <DashboardHeader 
        title="Nouvelle demande" 
        subtitle="Créez une nouvelle demande d'importation"
      />

      <div className="p-6">
        <div className="max-w-3xl mx-auto">
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
                  <div className={`w-16 sm:w-24 h-0.5 mx-4 ${
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
            className="p-6 rounded-xl bg-card border border-border"
          >
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Pays source & Catégorie</h2>
                  <p className="text-sm text-muted-foreground">
                    Sélectionnez le pays d&apos;origine et la catégorie de produit
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pays source *</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => setFormData({ ...formData, country: value })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Sélectionnez un pays" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            <span className="flex items-center gap-2">
                              <span>{country.flag}</span>
                              {country.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Catégorie de produit *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Sélectionnez une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Nom du produit *</Label>
                    <Input
                      placeholder="Ex: Smartphones Samsung Galaxy"
                      className="h-12"
                      value={formData.productName}
                      onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Spécifications détaillées</h2>
                  <p className="text-sm text-muted-foreground">
                    Décrivez précisément votre besoin
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Description détaillée *</Label>
                    <Textarea
                      placeholder="Décrivez les spécifications techniques, les caractéristiques souhaitées..."
                      className="min-h-32"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantité *</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 500"
                        className="h-12"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unité *</Label>
                      <Select
                        value={formData.unit}
                        onValueChange={(value) => setFormData({ ...formData, unit: value })}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Sélectionnez" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="units">Unités</SelectItem>
                          <SelectItem value="kg">Kilogrammes</SelectItem>
                          <SelectItem value="tonnes">Tonnes</SelectItem>
                          <SelectItem value="meters">Mètres</SelectItem>
                          <SelectItem value="containers">Containers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Budget minimum ($)</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 5000"
                        className="h-12"
                        value={formData.budgetMin}
                        onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Budget maximum ($)</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 10000"
                        className="h-12"
                        value={formData.budgetMax}
                        onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Date limite souhaitée</Label>
                    <Input
                      type="date"
                      className="h-12"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes additionnelles</Label>
                    <Textarea
                      placeholder="Informations complémentaires, exigences particulières..."
                      value={formData.additionalNotes}
                      onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Récapitulatif</h2>
                  <p className="text-sm text-muted-foreground">
                    Vérifiez les informations avant de soumettre
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <h3 className="font-medium mb-3">Informations générales</h3>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Pays source:</span>
                        <span className="ml-2 font-medium">
                          {countries.find(c => c.code === formData.country)?.flag} {countries.find(c => c.code === formData.country)?.name}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Catégorie:</span>
                        <span className="ml-2 font-medium">{formData.category}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground">Produit:</span>
                        <span className="ml-2 font-medium">{formData.productName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/50">
                    <h3 className="font-medium mb-3">Spécifications</h3>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Quantité:</span>
                        <span className="ml-2 font-medium">{formData.quantity} {formData.unit}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Budget:</span>
                        <span className="ml-2 font-medium">${formData.budgetMin} - ${formData.budgetMax}</span>
                      </div>
                      {formData.deadline && (
                        <div>
                          <span className="text-muted-foreground">Deadline:</span>
                          <span className="ml-2 font-medium">{formData.deadline}</span>
                        </div>
                      )}
                    </div>
                    {formData.description && (
                      <div className="mt-3 text-sm">
                        <span className="text-muted-foreground">Description:</span>
                        <p className="mt-1">{formData.description}</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium">Prochaine étape</p>
                        <p className="text-muted-foreground">
                          Votre demande sera analysée par notre équipe. Vous recevrez un devis 
                          détaillé sous 24-48h.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Précédent
              </Button>

              {currentStep < 3 ? (
                <Button onClick={handleNext}>
                  Suivant
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Soumettre la demande
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
