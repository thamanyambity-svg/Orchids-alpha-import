
"use client"

import { useState, useEffect, use } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle, XCircle, FileText, Download, Copy, ExternalLink } from "lucide-react"
import Link from "next/link"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    approvePartnerApplication,
    rejectPartnerApplication,
} from "@/app/actions/admin/approve-partner-application"

interface Country {
    id: string
    code: string
    name: string
}

export default function ApplicationReviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const supabase = createClient()

    const [application, setApplication] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [countries, setCountries] = useState<Country[]>([])

    // Approval dialog state
    const [approveDialogOpen, setApproveDialogOpen] = useState(false)
    const [selectedCountryId, setSelectedCountryId] = useState("")
    const [isApproving, setIsApproving] = useState(false)

    // Success dialog state (shows password link)
    const [successDialogOpen, setSuccessDialogOpen] = useState(false)
    const [passwordLink, setPasswordLink] = useState<string | null>(null)

    // Reject state
    const [isRejecting, setIsRejecting] = useState(false)

    useEffect(() => {
        fetchApplication()
        fetchCountries()
    }, [])

    async function fetchApplication() {
        const { data, error } = await supabase
            .from('partner_applications')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            toast.error("Erreur chargement candidature")
            console.error(error)
        } else {
            setApplication(data)
        }
        setIsLoading(false)
    }

    async function fetchCountries() {
        const { data } = await supabase
            .from('countries')
            .select('id, code, name')
            .eq('is_active', true)
            .order('name')
        setCountries((data as Country[]) ?? [])
    }

    const handleApprove = async () => {
        if (!selectedCountryId) {
            toast.error("Veuillez sélectionner un pays d'opération.")
            return
        }
        setIsApproving(true)
        try {
            const result = await approvePartnerApplication(id, selectedCountryId)
            if (!result.success) {
                toast.error(result.error)
                return
            }
            setPasswordLink(result.data.passwordLink)
            setApproveDialogOpen(false)
            setSuccessDialogOpen(true)
            setApplication((prev: any) => ({ ...prev, status: 'ACTIVE' }))
            toast.success("Compte partenaire créé avec succès.")
        } catch (err) {
            console.error(err)
            toast.error("Erreur inattendue lors de l'approbation.")
        } finally {
            setIsApproving(false)
        }
    }

    const handleReject = async () => {
        setIsRejecting(true)
        try {
            const result = await rejectPartnerApplication(id)
            if (!result.success) {
                toast.error(result.error)
                return
            }
            toast.success("Candidature refusée.")
            router.push('/admin/partners')
        } catch (err) {
            console.error(err)
            toast.error("Erreur inattendue lors du rejet.")
        } finally {
            setIsRejecting(false)
        }
    }

    if (isLoading) return <div className="p-8">Chargement...</div>
    if (!application) return <div className="p-8">Candidature introuvable</div>

    return (
        <>
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center gap-4">
                    <Link href="/admin/partners">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Candidature: {application.company_name}</h1>
                        <p className="text-muted-foreground text-sm">Soumis le {new Date(application.created_at).toLocaleString()}</p>
                    </div>
                    <div className="ml-auto">
                        <Badge variant={application.status === 'PENDING' ? 'outline' : 'default'}>
                            {application.status}
                        </Badge>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Company Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Informations Entreprise</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">Nom Légal</span>
                                <p>{application.company_name}</p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">Email Contact</span>
                                <p>{application.email}</p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">Téléphone</span>
                                <p>{application.phone}</p>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">Adresse</span>
                                <p>{application.company_details?.address}</p>
                            </div>
                            <div className="flex gap-4">
                                <div>
                                    <span className="text-sm font-medium text-muted-foreground">RCCM</span>
                                    <p>{application.company_details?.rccm || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-muted-foreground">ID NAT</span>
                                    <p>{application.company_details?.id_nat || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-muted-foreground">N° Impôt</span>
                                    <p>{application.company_details?.tax_id || 'N/A'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Documents */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Documents Soumis</CardTitle>
                            <CardDescription>Vérifiez l&apos;authenticité des fichiers</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2">
                                {application.documents && Array.isArray(application.documents) ? (
                                    application.documents.map((doc: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-5 h-5 text-blue-500" />
                                                <div>
                                                    <p className="font-medium text-sm">{doc.name}</p>
                                                    <p className="text-xs text-muted-foreground">Document uploadé</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" asChild>
                                                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                    <Download className="w-4 h-4" />
                                                </a>
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">Aucun document joint.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Agreements */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Engagements & Charte</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    {application.agreements?.finance_accepted ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                    <span className="text-sm">Conditions Financières Acceptées</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {application.agreements?.privacy_accepted ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                    <span className="text-sm">Politique Confidentialité & Charte</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {application.status === 'PENDING' && (
                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <Button
                            variant="destructive"
                            disabled={isRejecting}
                            onClick={handleReject}
                        >
                            {isRejecting ? "Rejet en cours…" : "Refuser le dossier"}
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => setApproveDialogOpen(true)}
                        >
                            <CheckCircle className="mr-2 w-4 h-4" />
                            Valider KYC & Activer le compte
                        </Button>
                    </div>
                )}
            </div>

            {/* ── Approval dialog: country selection ───────────────────────────── */}
            <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Activer le compte partenaire</DialogTitle>
                        <DialogDescription>
                            Sélectionnez le pays d&apos;opération du partenaire. Ce périmètre
                            déterminera les dossiers visibles dans son portail.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="country-select">Pays d&apos;opération *</Label>
                            <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
                                <SelectTrigger id="country-select">
                                    <SelectValue placeholder="Choisir un pays…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {countries.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name} ({c.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Un compte Auth Supabase sera créé pour{" "}
                            <strong>{application.email}</strong> avec le rôle{" "}
                            <code className="bg-muted px-1 rounded">PARTNER</code>. Un lien
                            de définition du mot de passe vous sera fourni à transmettre au
                            partenaire.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setApproveDialogOpen(false)}
                            disabled={isApproving}
                        >
                            Annuler
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={handleApprove}
                            disabled={isApproving || !selectedCountryId}
                        >
                            {isApproving ? "Création en cours…" : "Confirmer & Activer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Success dialog: password link ─────────────────────────────────── */}
            <Dialog open={successDialogOpen} onOpenChange={(open) => {
                setSuccessDialogOpen(open)
                if (!open) router.push('/admin/partners')
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            Compte partenaire activé
                        </DialogTitle>
                        <DialogDescription>
                            Le compte a été créé avec succès pour{" "}
                            <strong>{application.email}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {passwordLink ? (
                            <div className="space-y-2">
                                <Label>Lien de définition du mot de passe</Label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 text-xs bg-muted p-2 rounded break-all">
                                        {passwordLink}
                                    </code>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            navigator.clipboard.writeText(passwordLink!).then(
                                                () => toast.success("Lien copié"),
                                                () => toast.error("Impossible de copier le lien — copiez-le manuellement.")
                                            )
                                        }}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" asChild>
                                        <a href={passwordLink} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Transmettez ce lien au partenaire par email sécurisé. Il expire
                                    selon les paramètres de votre projet Supabase (24 h par défaut).
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Le lien de premier mot de passe n&apos;a pas pu être généré
                                automatiquement. Envoyez-le manuellement depuis le tableau de bord
                                Supabase → Authentication → Users → <em>Send password reset</em>.
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button onClick={() => router.push('/admin/partners')}>
                            Retour à la liste
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
