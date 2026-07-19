
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
import { useLanguage } from "@/lib/i18n-context"

type Step = 1 | 2 | 3 | 4

export function PartnerWizard() {
    const { t } = useLanguage()
    const router = useRouter()
    const [step, setStep] = useState<Step>(1)
    const [isLoading, setIsLoading] = useState(false)
    const supabase: any = typeof window !== 'undefined'
        ? createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        : null
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
            toast.success(t("partner_wizard.upload_success", "Téléchargement réussi"))
        } catch (error) {
            console.error(error)
            toast.error(t("partner_wizard.upload_error", "Erreur lors du téléchargement"))
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
            toast.success(t("partner_wizard.submit_success", "Candidature envoyée avec succès !"))
        } catch (error) {
            console.error(error)
            toast.error(t("partner_wizard.submit_error", "Erreur lors de l'envoi de la candidature"))
        } finally {
            setIsLoading(false)
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                CHARTER CONTENT                             */
    /* -------------------------------------------------------------------------- */
    const charterDetails = {
        trust: {
            title: t("partner_wizard.article1_title", "Confiance & Transparence (Article 1)"),
            content: t("partner_wizard.article1_content", `
            <h4 class="font-bold mb-2">1.1. Obligations de Transparence</h4>
            <p class="mb-2">Le Partenaire s'engage à fournir des informations exactes, complètes et actualisées concernant son identité, sa structure juridique et ses activités commerciales. Toute dissimulation d'information (fausses déclarations, documents falsifiés, prête-noms) entraînera la résiliation immédiate de ce partenariat et des poursuites judiciaires.</p>
            
            <h4 class="font-bold mb-2">1.2. Traçabilité des Opérations</h4>
            <p class="mb-2">Toutes les transactions effectuées via la plateforme Alpha A Ambity doivent être justifiées. Le Partenaire accepte de soumettre, sur demande, tout document prouvant l'origine des fonds ou la destination réelle des marchandises (Factures Proforma, BL, Preuves de virement).</p>
            
            <h4 class="font-bold mb-2">1.3. Lutte Anti-Fraude</h4>
            <p>Nous appliquons une tolérance zéro envers la fraude, la corruption et le blanchiment d'argent. Tout soupçon d'activité illicite sera immédiatement signalé aux autorités compétentes (Cellule de Renseignement Financier).</p>
        `)
        },
        privacy: {
            title: t("partner_wizard.article2_title", "Confidentialité & Protection des Données (Article 2)"),
            content: t("partner_wizard.article2_content", `
            <h4 class="font-bold mb-2">2.1. Accord de Non-Divulgation (NDA)</h4>
            <p class="mb-2">Alpha A Ambity et le Partenaire s'engagent à garder strictement confidentielles toutes les informations échangées (fichiers clients, stratégies tarifaires, données fournisseurs, secrets commerciaux).</p>
            
            <h4 class="font-bold mb-2">2.2. Protection du Fichier Client</h4>
            <p class="mb-2">Alpha A Ambity garantit qu'elle n'entrera jamais en contact direct avec les clients finaux du Partenaire pour les détourner. Vos clients restent votre propriété exclusive. La plateforme agit uniquement comme facilitateur logistique et financier sécurisé.</p>
            
            <h4 class="font-bold mb-2">2.3. Sécurité Informatique</h4>
            <p>Toutes les données sensibles (documents d'identité, preuves financières) sont stockées de manière cryptée. L'accès est restreint aux seuls administrateurs chargés de la conformité (Compliance Officers).</p>
        `)
        },
        legal: {
            title: t("partner_wizard.article3_title", "Conformité Légale & Fiscale (Article 3)"),
            content: t("partner_wizard.article3_content", `
            <h4 class="font-bold mb-2">3.1. Existence Légale</h4>
            <p class="mb-2">Le Partenaire doit être une entité légalement constituée dans son pays de résidence. Il doit fournir un Registre de Commerce (RCCM, K-Bis, Trade License) valide et datant de moins de 3 mois lors de l'inscription.</p>
            
            <h4 class="font-bold mb-2">3.2. Conformité Fiscale</h4>
            <p class="mb-2">Le Partenaire déclare être en règle avec les autorités fiscales de son pays. Il est seul responsable du paiement de toutes les taxes, impôts et droits de douane liés à ses activités d'importation, sauf si Alpha A Ambity est mandaté explicitement pour le dédouanement (DDP).</p>
            
            <h4 class="font-bold mb-2">3.3. Respect des Normes Internationales</h4>
            <p>Le Partenaire s'interdit d'importer des produits prohibés (contrefaçons, produits dangereux, substances illicites). Alpha A Ambity se réserve le droit d'inspecter toute cargaison suspecte.</p>
        `)
        },
        financial: {
            title: t("partner_wizard.article4_title", "Engagements Financiers & Caution (Article 4)"),
            content: t("partner_wizard.article4_content", `
            <h4 class="font-bold mb-2">4.1. Dépôt de Garantie (Caution)</h4>
            <p class="mb-2">Pour accéder aux services d'achat et de logistique, le Partenaire doit constituer un dépôt de garantie (Caution). Ce montant sert à couvrir les risques de défaut de paiement, d'annulation tardive ou de pénalités logistiques.</p>
            
            <h4 class="font-bold mb-2">4.2. Modalités de Paiement</h4>
            <p class="mb-2">Les commandes doivent être prépayées selon les termes de la facture proforma (généralement 100% avant expédition, ou 30% commande / 70% départ usine). Aucun crédit n'est accordé sur les premières opérations.</p>
            
            <h4 class="font-bold mb-2">4.3. Restitution de la Caution</h4>
            <p>La caution est remboursable intégralement après une période probatoire de 12 mois sans incident de paiement, ou lors de la clôture du compte partenaire (sous réserve qu'aucune dette ne soit active).</p>
        `)
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                COMPONENTS                                  */
    /* -------------------------------------------------------------------------- */

    // Dialog wrapper for details
    const CharterDialog = ({ type, icon: Icon }: { type: keyof typeof charterDetails, icon: any }) => {
        const detail = charterDetails[type]
        const [open, setOpen] = useState(false)

        return (
            <>
                <Button variant="link" onClick={() => setOpen(true)} className="p-0 h-auto font-semibold text-primary mt-2">
                    {t("partner_wizard.read_detail", "Lire le détail complet →")}
                </Button>

                {/* Simple Modal overlay (using local state since we don't assume shadcn Dialog is perfectly available/configured in this context without imports) 
                Actually, let's try to use a fixed overlay div to be safe and specific to requirements.
            */}
                {open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-background border border-border rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-300">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4 text-primary">
                                    <Icon className="w-8 h-8" />
                                    <h3 className="text-xl font-bold">{detail.title}</h3>
                                </div>
                                <div className="prose prose-sm dark:prose-invert text-muted-foreground leading-relaxed">
                                    <div dangerouslySetInnerHTML={{ __html: detail.content }} />
                                </div>
                                <div className="mt-8 flex justify-end">
                                    <Button onClick={() => setOpen(false)}>
                                        {t("partner_wizard.read_understood", "J'ai lu et compris")}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </>
        )
    }

    const Step1Intro = () => (
        <div className="space-y-8">
            <div className="text-center mb-10">
                <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-amber-500 mb-4">
                    {t("partner_wizard.charter_title", "Charte de Partenariat Officiel")}
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    {t("partner_wizard.charter_desc", "Devenir partenaire Alpha A Ambity n'est pas une simple inscription. C'est un engagement contractuel fort basé sur 4 piliers fondamentaux.")}
                    <br />
                    <span className="text-sm font-medium text-amber-500 mt-2 block">
                        {t("partner_wizard.charter_warning", "Veuillez lire attentivement chaque section avant de vous engager.")}
                    </span>
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-6 border-l-4 border-l-primary hover:bg-muted/50 transition-colors">
                    <ShieldCheck className="w-10 h-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{t("partner_wizard.trust_card_title", "1. Confiance & Transparence")}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-2">
                        {t("partner_wizard.trust_card_desc", "Transparence totale sur les activités. Tolérance zéro envers la fraude. Traçabilité exigée.")}
                    </p>
                    <CharterDialog type="trust" icon={ShieldCheck} />
                </Card>

                <Card className="p-6 border-l-4 border-l-primary hover:bg-muted/50 transition-colors">
                    <Shield className="w-10 h-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{t("partner_wizard.privacy_card_title", "2. Confidentialité (NDA)")}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-2">
                        {t("partner_wizard.privacy_card_desc", "Protection absolue de votre fichier client et de vos données commerciales. Secret des affaires.")}
                    </p>
                    <CharterDialog type="privacy" icon={Shield} />
                </Card>

                <Card className="p-6 border-l-4 border-l-primary hover:bg-muted/50 transition-colors">
                    <Building2 className="w-10 h-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{t("partner_wizard.legal_card_title", "3. Conformité Légale")}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-2">
                        {t("partner_wizard.legal_card_desc", "Structures juridiques vérifiées (RCCM, ID NAT). Respect des lois douanières et fiscales.")}
                    </p>
                    <CharterDialog type="legal" icon={Building2} />
                </Card>

                <Card className="p-6 border-l-4 border-l-primary hover:bg-muted/50 transition-colors">
                    <Banknote className="w-10 h-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{t("partner_wizard.financial_card_title", "4. Engagement Financier")}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-2">
                        {t("partner_wizard.financial_card_desc", "Solvabilité prouvée. Dépôt de garantie obligatoire. Conditions de paiement strictes.")}
                    </p>
                    <CharterDialog type="financial" icon={Banknote} />
                </Card>
            </div>

            <div className="pt-8 flex flex-col items-center gap-4">
                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors w-full max-w-md">
                    <input type="checkbox" className="w-5 h-5 accent-primary" id="accept-charter" />
                    <span className="text-sm">
                        {t("partner_wizard.accept_charter", "Je certifie avoir lu et accepté l'intégralité des 4 articles de la Charte de Partenariat ci-dessus.")}
                    </span>
                </label>

                <Button
                    onClick={() => {
                        const checkbox = document.getElementById('accept-charter') as HTMLInputElement
                        if (checkbox.checked) {
                            setStep(2)
                        } else {
                            toast.error(t("partner_wizard.checkbox_required", "Veuillez cocher la case pour accepter la charte."))
                        }
                    }}
                    size="lg"
                    className="group min-w-[200px]"
                >
                    {t("partner_wizard.validate", "Valider ces engagements")}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    )


    const Step2Finance = () => (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">{t("partner_wizard.finance_title", "Engagements Financiers")}</h2>
                <p className="text-muted-foreground">
                    {t("partner_wizard.finance_desc", "Comprendre le modèle économique est essentiel pour devenir partenaire.")}
                </p>
            </div>

            <Card className="p-8 bg-card/50 border-amber-500/20">
                <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-500 mt-1 flex-shrink-0" />
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-amber-500">{t("partner_wizard.deposit_title", "Caution de Garantie")}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            {t("partner_wizard.deposit_desc", "Pour valider votre compte Partenaire, une caution remboursable sera exigée après validation de votre dossier juridique. Cette caution sert à couvrir les risques liés aux premières commandes et démontre votre sérieux.")}
                        </p>
                        <div className="p-4 rounded-lg bg-background/50 text-sm">
                            <ul className="list-disc pl-5 space-y-2">
                                <li>{t("partner_wizard.deposit_bullet1", "Montant fixé selon volume prévisionnel.")}</li>
                                <li>{t("partner_wizard.deposit_bullet2", "Fonds séquestrés sur compte tiers sécurisé.")}</li>
                                <li>{t("partner_wizard.deposit_bullet3", "Remboursable après 12 mois sans incident.")}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="flex justify-between pt-8">
                <Button variant="ghost" onClick={() => setStep(1)}>{t("partner_wizard.back", "Retour")}</Button>
                <Button onClick={() => setStep(3)} size="lg">
                    {t("partner_wizard.confirm_finance", "Je confirme ma capacité financière")}
                    <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
            </div>
        </div>
    )

    const Step3Form = () => (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">{t("partner_wizard.form_title", "Dossier Juridique")}</h2>
                <p className="text-muted-foreground">
                    {t("partner_wizard.form_desc", "Veuillez fournir les informations légales de votre entreprise.")}
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <Label>{t("partner_wizard.company_label", "Nom de l'entreprise")}</Label>
                    <Input
                        name="company_name"
                        placeholder={t("partner_wizard.company_placeholder", "Ex: Trading Import SARL")}
                        value={formData.company_name}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="space-y-2">
                    <Label>{t("partner_wizard.email_label", "Adresse Email Professionnelle")}</Label>
                    <Input
                        name="email"
                        type="email"
                        placeholder={t("partner_wizard.email_placeholder", "contact@entreprise.com")}
                        value={formData.email}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="space-y-2">
                    <Label>{t("partner_wizard.phone_label", "Téléphone / WhatsApp")}</Label>
                    <Input
                        name="phone"
                        placeholder={t("partner_wizard.phone_placeholder", "+243...")}
                        value={formData.phone}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="space-y-2">
                    <Label>{t("partner_wizard.address_label", "Adresse du Siège")}</Label>
                    <Input
                        name="address"
                        placeholder={t("partner_wizard.address_placeholder", "Adresse complète")}
                        value={formData.address}
                        onChange={handleInputChange}
                    />
                </div>
            </div>

            <div className="border-t border-border pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4 text-gradient-gold">{t("partner_wizard.documents_title", "Documents Officiels")}</h3>
                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="p-4 border-dashed border-2 flex flex-col items-center justify-center text-center gap-2 hover:bg-muted/50 cursor-pointer relative overflow-hidden">
                        <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => handleFileUpload(e, 'RCCM')}
                        />
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm font-medium">{t("partner_wizard.rccm_label", "Registre Commerce (RCCM)")}</span>
                        {documents.find(d => d.name === 'RCCM') && <Check className="w-4 h-4 text-green-500" />}
                    </Card>

                    <Card className="p-4 border-dashed border-2 flex flex-col items-center justify-center text-center gap-2 hover:bg-muted/50 cursor-pointer relative overflow-hidden">
                        <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => handleFileUpload(e, 'ID_NAT')}
                        />
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm font-medium">{t("partner_wizard.id_nat_label", "Identification Nationale")}</span>
                        {documents.find(d => d.name === 'ID_NAT') && <Check className="w-4 h-4 text-green-500" />}
                    </Card>

                    <Card className="p-4 border-dashed border-2 flex flex-col items-center justify-center text-center gap-2 hover:bg-muted/50 cursor-pointer relative overflow-hidden">
                        <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => handleFileUpload(e, 'TAX_ID')}
                        />
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm font-medium">{t("partner_wizard.tax_label", "Numéro Impôt")}</span>
                        {documents.find(d => d.name === 'TAX_ID') && <Check className="w-4 h-4 text-green-500" />}
                    </Card>
                </div>
                {uploading && <p className="text-xs text-primary mt-2 animate-pulse text-center">{t("partner_wizard.uploading", "Téléchargement en cours...")}</p>}
            </div>

            <div className="flex justify-between pt-8">
                <Button variant="ghost" onClick={() => setStep(2)}>{t("partner_wizard.back", "Retour")}</Button>
                <Button
                    onClick={handleSubmit}
                    size="lg"
                    disabled={isLoading || !formData.email || !formData.company_name}
                >
                    {isLoading ? t("partner_wizard.sending", "Envoi...") : t("partner_wizard.submit", "Soumettre ma candidature")}
                </Button>
            </div>
        </div>
    )

    const Step4Success = () => (
        <div className="max-w-2xl mx-auto text-center py-20">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                <Check className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-4xl font-bold mb-6">{t("partner_wizard.success_title", "Candidature Reçue !")}</h2>
            <p className="text-xl text-muted-foreground mb-8">
                {t("partner_wizard.success_desc", "Votre dossier a été transmis à notre service de conformité. Un administrateur va vérifier vos documents sous 24h à 48h.")}
            </p>
            <div className="bg-card p-6 rounded-lg max-w-md mx-auto text-sm text-left space-y-2 border border-border">
                <p><strong>{t("partner_wizard.next_steps", "Prochaines étapes :")}</strong></p>
                <p>{t("partner_wizard.step1", "1. Validation des documents légaux.")}</p>
                <p>{t("partner_wizard.step2", "2. Envoi du contrat de partenariat et facture de caution.")}</p>
                <p>{t("partner_wizard.step3", "3. Ouverture de votre compte Partenaire sécurisé.")}</p>
            </div>
            <div className="mt-10">
                <Button onClick={() => router.push('/')} variant="outline">
                    {t("partner_wizard.back_home", "Retour à l'accueil")}
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
                    <span>{t("partner_wizard.step_values", "Valeurs")}</span>
                    <span>{t("partner_wizard.step_finance", "Finance")}</span>
                    <span>{t("partner_wizard.step_dossier", "Dossier")}</span>
                    <span>{t("partner_wizard.step_validation", "Validation")}</span>
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
