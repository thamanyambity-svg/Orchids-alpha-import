
"use client"

import { useState, useEffect, use } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle, XCircle, FileText, Download } from "lucide-react"
import Link from "next/link"

export default function ApplicationReviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const supabase = createClient()
    const [application, setApplication] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchApplication()
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

    const updateStatus = async (status: 'APPROVED_KYC' | 'REJECTED') => {
        try {
            const { error } = await supabase
                .from('partner_applications')
                .update({ status })
                .eq('id', id)

            if (error) throw error

            toast.success(`Candidature ${status === 'APPROVED_KYC' ? 'approuvée' : 'rejetée'}`)

            // TODO: Send Email Notification logic would go here (or triggered via DB function/webhook)
            // For MVP, we assume the Admin manually handles the email or we trigger an API.

            router.push('/admin/partners')
        } catch (error) {
            console.error(error)
            toast.error("Erreur mise à jour")
        }
    }

    if (isLoading) return <div className="p-8">Chargement...</div>
    if (!application) return <div className="p-8">Candidature introuvable</div>

    return (
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
                        <CardDescription>Vérifiez l'authenticité des fichiers</CardDescription>
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
                    <Button variant="destructive" onClick={() => updateStatus('REJECTED')}>
                        Refuser le dossier
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus('APPROVED_KYC')}>
                        <CheckCircle className="mr-2 w-4 h-4" />
                        Valider KYC & Demander Caution
                    </Button>
                </div>
            )}
        </div>
    )
}
