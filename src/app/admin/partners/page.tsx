"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, MoreHorizontal, UserCheck, Star, MapPin, Briefcase, FileCheck, Edit, ExternalLink, FileEdit } from "lucide-react"
import Link from "next/link"
import { EditPartnerDialog } from "@/components/admin/edit-partner-dialog"

interface PartnerWithDetails {
    id: string
    user_id: string
    email: string
    full_name: string | null
    phone: string | null
    city: string | null
    country: string | null
    country_code?: string
    status: string // UserStatus
    contract_status: string // ContractStatus
    performance_score: number
    total_orders_handled: number
    zone?: string
}

export default function AdminPartnersPage() {
    const [partners, setPartners] = useState<PartnerWithDetails[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("ALL")
    const [editingPartner, setEditingPartner] = useState<any>(null)

    const supabase = createClient()

    useEffect(() => {
        fetchPartners()
    }, [])

    async function fetchPartners() {
        setIsLoading(true)
        try {
            // optimized fetch: get profiles + partner_details + country in one go if possible, 
            // but for safety with current relationships, let's keep it robust.
            // Actually, we can join profiles with countries.
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select(`
                    *,
                    country:countries(code, name, region)
                `)
                .eq('role', 'PARTNER')
                .order('created_at', { ascending: false })

            if (profilesError) throw profilesError

            // Fetch partner specific details
            const partnersData = await Promise.all(
                (profiles || []).map(async (profile: any) => {
                    const { data: partnerDetails } = await supabase
                        .from('partner_profiles')
                        .select('*')
                        .eq('user_id', profile.id)
                        .single()

                    return {
                        id: profile.id,
                        user_id: profile.id,
                        email: profile.email,
                        full_name: profile.full_name || "Sans nom",
                        phone: profile.phone,
                        city: profile.city,
                        country: profile.country?.name || "N/A",
                        country_code: profile.country?.code || "UNK",
                        zone: getZone(profile.country?.code),
                        status: profile.status,
                        contract_status: partnerDetails?.contract_status || 'PENDING',
                        performance_score: partnerDetails?.performance_score || 0,
                        total_orders_handled: partnerDetails?.total_orders_handled || 0
                    }
                })
            )

            setPartners(partnersData)
        } catch (error) {
            console.error("Error fetching partners:", error)
        } finally {
            setIsLoading(false)
        }
    }


    const [applications, setApplications] = useState<any[]>([])

    useEffect(() => {
        fetchPartners()
        fetchApplications()
    }, [])

    async function fetchApplications() {
        try {
            const { data, error } = await supabase
                .from('partner_applications')
                .select('*')
                .eq('status', 'PENDING')
                .order('created_at', { ascending: false })

            if (error) throw error
            setApplications(data || [])
        } catch (error) {
            console.error("Error fetching applications:", error)
        }
    }

    // Zones Alpha : Turquie, Dubai, Chine, Japon, Thaïlande uniquement
    function getZone(code: string) {
        if (!code) return "OTHER"
        if (["CHN", "CN", "JPN", "JP", "THA", "TH"].includes(code)) return "ASIA"
        if (["ARE", "UAE", "AE", "TUR", "TR"].includes(code)) return "MIDDLE_EAST"
        return "OTHER"
    }

    const filteredPartners = partners.filter(p => {
        const matchesSearch =
            p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.full_name && p.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.city && p.city.toLowerCase().includes(searchQuery.toLowerCase()))

        const matchesTab = activeTab === "ALL" || p.zone === activeTab

        return matchesSearch && matchesTab
    })

    const handleReviewApplication = (appId: string) => {
        // Simple direct navigation for now, or we could open a modal
        // For MVP, we can just use a simple alert or toast as placeholder until we build the full review modal
        console.log("Reviewing", appId)
        // Ideally navigate to /admin/partners/applications/[id]
        window.location.href = `/admin/partners/applications/${appId}`
    }

    const ZONE_LABELS: Record<string, string> = {
        ALL: "Global",
        ASIA: "Asie (Chine/Japon/Thaïlande)",
        MIDDLE_EAST: "Moyen-Orient (Dubai/Turquie)",
        OTHER: "Autres",
    }

    return (
        <div className="space-y-6">
            {/* Lien vers le dépôt de candidature (page d'accueil) */}
            {applications.length > 0 && (
                <Card className="border-primary/30 bg-primary/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileEdit className="w-4 h-4 text-primary" />
                            Candidatures en attente
                        </CardTitle>
                        <CardDescription>
                            {applications.length} candidature(s) déposée(s). Les dépôts proviennent de l&apos;espace public sur la page d&apos;accueil.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="outline" size="sm" className="gap-2">
                            <Link href="/partner-request" target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                                Voir le dépôt de candidature
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestion des Partenaires</h1>
                    <p className="text-muted-foreground">
                        {partners.length} partenaires actifs • {applications.length} candidatures en attente
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild>
                        <Link href="/partner-request" target="_blank" rel="noopener noreferrer">
                            <UserCheck className="mr-2 h-4 w-4" />
                            Inviter un Partenaire
                        </Link>
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="ALL" onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="ALL">Tous les partenaires</TabsTrigger>
                    <TabsTrigger value="APPLICATIONS" className="relative">
                        Candidatures
                        {applications.length > 0 && (
                            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                                {applications.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="ASIA">Asie (Chine/Japon/Thaïlande)</TabsTrigger>
                    <TabsTrigger value="MIDDLE_EAST">Moyen-Orient (Dubai/Turquie)</TabsTrigger>

                </TabsList>

                <TabsContent value="APPLICATIONS" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Candidatures en attente</CardTitle>
                            <CardDescription>
                                Examinez les nouvelles demandes et validez les documents.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Entreprise</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Documents</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {applications.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                Aucune nouvelle candidature
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        applications.map((app) => (
                                            <TableRow key={app.id}>
                                                <TableCell className="font-medium">
                                                    {app.company_name}
                                                    <div className="text-xs text-muted-foreground">{app.company_details?.address || 'Adresse non spécifiée'}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>{app.email}</div>
                                                    <div className="text-xs text-muted-foreground">{app.phone}</div>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(app.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {Array.isArray(app.documents) ? app.documents.length : 0} fichiers
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" onClick={() => handleReviewApplication(app.id)}>
                                                        Examiner
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value={activeTab} className="space-y-4">
                    {/* Only render if NOT applications tab (to avoid double render or empty state issues) */}
                    {activeTab !== 'APPLICATIONS' && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                                <div className="space-y-1">
                                    <CardTitle>Réseau Logistique — {ZONE_LABELS[activeTab] || activeTab}</CardTitle>
                                    <CardDescription>
                                        Vue d&apos;ensemble des partenaires et de leurs performances
                                    </CardDescription>
                                </div>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Rechercher (Nom, Ville)..."
                                        className="pl-8"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Partenaire</TableHead>
                                            <TableHead>Localisation</TableHead>
                                            <TableHead>Contrat & Statut</TableHead>
                                            <TableHead>Performance</TableHead>
                                            <TableHead>Volume</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8">Chargement...</TableCell>
                                            </TableRow>
                                        ) : filteredPartners.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    Aucun partenaire trouvé dans cette zone
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredPartners.map((partner) => (
                                                <TableRow key={partner.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                                                                <Briefcase className="h-5 w-5 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-blue-900">{partner.full_name}</div>
                                                                <div className="text-xs text-muted-foreground">{partner.email}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <MapPin className="h-4 w-4" />
                                                            {partner.city || "Non défini"}, {partner.country}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1 items-start">
                                                            {partner.contract_status === 'ACTIVE' ? (
                                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                                                                    <FileCheck className="w-3 h-3 mr-1" /> Contrat Actif
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline">En attente</Badge>
                                                            )}
                                                            {partner.status !== 'VERIFIED' && (
                                                                <span className="text-[10px] text-amber-600 font-medium px-1">
                                                                    (Kyc: {partner.status})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1 font-medium">
                                                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                                            {partner.performance_score}/5
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">
                                                            <span className="font-bold">{partner.total_orders_handled}</span> commandes
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                                    <span className="sr-only">Menu</span>
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Gestion</DropdownMenuLabel>
                                                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(partner.email)}>
                                                                    Contacter
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => setEditingPartner(partner)}>
                                                                    <Edit className="w-4 h-4 mr-2" /> Modifier
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem>Voir le Contrat</DropdownMenuItem>
                                                                <DropdownMenuItem>Voir les Fournisseurs</DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-red-600">Résilier Contrat</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            <EditPartnerDialog
                open={!!editingPartner}
                partner={editingPartner}
                onClose={() => setEditingPartner(null)}
                onUpdate={fetchPartners}
            />
        </div>
    )
}
