
"use client"

import { useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Check, Building2, Globe2, ShieldCheck, Upload, AlertCircle, Banknote, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Step = 1 | 2 | 3 | 4

export function PartnerWizard() {
    const router = useRouter()
    const [step, setStep] = useState<Step>(1)
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        company_name: "",
        email: "",
        phone: "",
        address: "",
        rccm_number: "",
        id_nat: "",
        tax_number: "",
    })

    // File states (URLs after upload)
    const [documents, setDocuments] = useState<{ name: string, url: string }[]>([])
    const [uploading, setUploading] = useState(false)

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
        if (!e.target.files || e.target.files.length === 0) return

        setUploading(true)
        const file = e.target.files[0]
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        const filePath = `partner-applications/${fileName}`

        try {
            const { data, error } = await supabase.storage
                .from('project-uploads')
                .upload(filePath, file)

            if (error) throw error

            const { data: { publicUrl } } = supabase.storage
                .from('project-uploads')
                .getPublicUrl(filePath)

            setDocuments(prev => [...prev, { name: docType, url: publicUrl }])
            toast.success(`${docType} téléchargé avec succès`)
        } catch (error) {
            console.error(error)
            toast.error("Erreur lors du téléchargement")
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async () => {
        setIsLoading(true)
        try {
            const { error } = await supabase
                .from('partner_applications')
                .insert({
                    email: formData.email,
                    company_name: formData.company_name,
                    phone: formData.phone,
                    company_details: {
                        address: formData.address,
                        rccm: formData.rccm_number,
                        id_nat: formData.id_nat,
                        tax_id: formData.tax_number
                    },
                    documents: documents,
                    status: 'PENDING',
                    agreements: {
                        finance_accepted: true,
                        privacy_accepted: true,
                        date: new Date().toISOString()
                    }
                })

            if (error) throw error

            setStep(4) // Success step
            toast.success("Candidature envoyée avec succès !")
        } catch (error) {
            console.error(error)
            toast.error("Erreur lors de l'envoi de la candidature")
        } finally {
            setIsLoading(false)
        }
    }

    const Step1Intro = () => (
        <div className="space-y-6">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-amber-500 mb-4">
                    Charte de Partenariat
                </h2>
                <p className="text-muted-foreground">
                    Avant de postuler, veuillez prendre connaissance de nos valeurs fondamentales.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-6 border-l-4 border-l-primary hover:bg-muted/50 transition-colors">
                    <ShieldCheck className="w-10 h-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Confiance & Transparence</h3>
                    <p className="text-muted-foreground text-sm">
                        Nous exigeons une transparence totale sur vos activités commerciales.
                        Aucune opération floue ne sera tolérée.
                    </p>
                </Card>

                <Card className="p-6 border-l-4 border-l-primary hover:bg-muted/50 transition-colors">
                    <Shield className="w-10 h-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Confidentialité</h3>
                    <p className="text-muted-foreground text-sm">
                        Vos données et celles de vos clients sont protégées.
                        Nous opérons selon un strict accord de non-divulgation (NDA).
                    </p>
                </Card>

                <Card className="p-6 border-l-4 border-l-primary hover:bg-muted/50 transition-colors">
                    <Building2 className="w-10 h-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Conformité Légale</h3>
                    <p className="text-muted-foreground text-sm">
                        Vous devez être une entité légalement enregistrée dans votre pays de résidence
                        et respecter les lois en vigueur.
                    </p>
                </Card>

                <Card className="p-6 border-l-4 border-l-primary hover:bg-muted/50 transition-colors">
                    <Banknote className="w-10 h-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Engagement Financier</h3>
                    <p className="text-muted-foreground text-sm">
                        L'accès à la plateforme nécessite un dépôt de garantie pour assurer
                        la solvabilité des opérations.
                    </p>
                </Card>
            </div>

            <div className="pt-8 flex justify-end">
                <Button onClick={() => setStep(2)} size="lg" className="group">
                    J'accepte ces engagements
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    )

    const Step2Finance = () => (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Engagements Financiers</h2>
                <p className="text-muted-foreground">
                    Comprendre le modèle économique est essentiel pour devenir partenaire.
                </p>
            </div>

            <Card className="p-8 bg-card/50 border-amber-500/20">
                <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-500 mt-1 flex-shrink-0" />
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-amber-500">Caution de Garantie</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            Pour valider votre compte Partenaire, une caution remboursable sera exigée après validation de votre dossier juridique.
                            Cette caution sert à couvrir les risques liés aux premières commandes et démontre votre sérieux.
                        </p>
                        <div className="p-4 rounded-lg bg-background/50 text-sm">
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Montant fixé selon volume prévisionnel.</li>
                                <li>Fonds séquestrés sur compte tiers sécurisé.</li>
                                <li>Remboursable après 12 mois sans incident.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="flex justify-between pt-8">
                <Button variant="ghost" onClick={() => setStep(1)}>Retour</Button>
                <Button onClick={() => setStep(3)} size="lg">
                    Je confirme ma capacité financière
                    <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
            </div>
        </div>
    )

    const Step3Form = () => (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Dossier Juridique</h2>
                <p className="text-muted-foreground">
                    Veuillez fournir les informations légales de votre entreprise.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <Label>Nom de l'entreprise</Label>
                    <Input
                        name="company_name"
                        placeholder="Ex: Trading Import SARL"
                        value={formData.company_name}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Adresse Email Professionnelle</Label>
                    <Input
                        name="email"
                        type="email"
                        placeholder="contact@entreprise.com"
                        value={formData.email}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Téléphone / WhatsApp</Label>
                    <Input
                        name="phone"
                        placeholder="+243..."
                        value={formData.phone}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Adresse du Siège</Label>
                    <Input
                        name="address"
                        placeholder="Adresse complète"
                        value={formData.address}
                        onChange={handleInputChange}
                    />
                </div>
            </div>

            <div className="border-t border-border pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4 text-gradient-gold">Documents Officiels</h3>
                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="p-4 border-dashed border-2 flex flex-col items-center justify-center text-center gap-2 hover:bg-muted/50 cursor-pointer relative overflow-hidden">
                        <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => handleFileUpload(e, 'RCCM')}
                        />
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm font-medium">Registre Commerce (RCCM)</span>
                        {documents.find(d => d.name === 'RCCM') && <Check className="w-4 h-4 text-green-500" />}
                    </Card>

                    <Card className="p-4 border-dashed border-2 flex flex-col items-center justify-center text-center gap-2 hover:bg-muted/50 cursor-pointer relative overflow-hidden">
                        <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => handleFileUpload(e, 'ID_NAT')}
                        />
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm font-medium">Identification Nationale</span>
                        {documents.find(d => d.name === 'ID_NAT') && <Check className="w-4 h-4 text-green-500" />}
                    </Card>

                    <Card className="p-4 border-dashed border-2 flex flex-col items-center justify-center text-center gap-2 hover:bg-muted/50 cursor-pointer relative overflow-hidden">
                        <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => handleFileUpload(e, 'TAX_ID')}
                        />
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm font-medium">Numéro Impôt</span>
                        {documents.find(d => d.name === 'TAX_ID') && <Check className="w-4 h-4 text-green-500" />}
                    </Card>
                </div>
                {uploading && <p className="text-xs text-primary mt-2 animate-pulse text-center">Téléchargement en cours...</p>}
            </div>

            <div className="flex justify-between pt-8">
                <Button variant="ghost" onClick={() => setStep(2)}>Retour</Button>
                <Button
                    onClick={handleSubmit}
                    size="lg"
                    disabled={isLoading || !formData.email || !formData.company_name}
                >
                    {isLoading ? "Envoi..." : "Soumettre ma candidature"}
                </Button>
            </div>
        </div>
    )

    const Step4Success = () => (
        <div className="max-w-2xl mx-auto text-center py-20">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                <Check className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-4xl font-bold mb-6">Candidature Reçue !</h2>
            <p className="text-xl text-muted-foreground mb-8">
                Votre dossier a été transmis à notre service de conformité.
                Un administrateur va vérifier vos documents sous 24h à 48h.
            </p>
            <div className="bg-card p-6 rounded-lg max-w-md mx-auto text-sm text-left space-y-2 border border-border">
                <p><strong>Prochaines étapes :</strong></p>
                <p>1. Validation des documents légaux.</p>
                <p>2. Envoi du contrat de partenariat et facture de caution.</p>
                <p>3. Ouverture de votre compte Partenaire sécurisé.</p>
            </div>
            <div className="mt-10">
                <Button onClick={() => router.push('/')} variant="outline">
                    Retour à l'accueil
                </Button>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-background text-foreground py-20 px-4 md:px-8">
            {/* Progress Bar */}
            <div className="max-w-4xl mx-auto mb-16">
                <div className="flex items-center justify-between relative">
                    <div className={`absolute top-1/2 left-0 w-full h-1 bg-muted -z-10`} />
                    <div
                        className={`absolute top-1/2 left-0 h-1 bg-primary -z-10 transition-all duration-500`}
                        style={{ width: `${((step - 1) / 3) * 100}%` }}
                    />

                    {[1, 2, 3, 4].map((s) => (
                        <div
                            key={s}
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all
                    ${step >= s ? 'bg-primary text-primary-foreground scale-110' : 'bg-muted text-muted-foreground'}
                    `}
                        >
                            {s}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground font-medium px-2">
                    <span>Valeurs</span>
                    <span>Finance</span>
                    <span>Dossier</span>
                    <span>Validation</span>
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    {step === 1 && <Step1Intro />}
                    {step === 2 && <Step2Finance />}
                    {step === 3 && <Step3Form />}
                    {step === 4 && <Step4Success />}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
