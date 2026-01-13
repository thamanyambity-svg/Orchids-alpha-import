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
import { Search, MoreHorizontal, User, ShieldCheck, ShieldAlert, Mail, Phone, MapPin } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface BuyerWithStats {
    id: string
    email: string
    full_name: string | null
    phone: string | null
    city: string | null
    status: string
    created_at: string
    total_requests: number
    active_orders: number
}

export default function AdminBuyersPage() {
    const [buyers, setBuyers] = useState<BuyerWithStats[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    const supabase = createClient()

    useEffect(() => {
        fetchBuyers()
    }, [])

    async function fetchBuyers() {
        setIsLoading(true)
        try {
            // 1. Fetch profiles with role 'BUYER'
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'BUYER')
                .order('created_at', { ascending: false })

            if (profilesError) throw profilesError

            // 2. For each buyer, fetch stats (this could be optimized with a view or RPC)
            // For now, we'll do promise.all which is acceptable for < 1000 users
            const buyersWithStats = await Promise.all(
                (profiles || []).map(async (profile) => {
                    // Count Requests
                    const { count: requestsCount } = await supabase
                        .from('import_requests')
                        .select('*', { count: 'exact', head: true })
                        .eq('buyer_id', profile.id)

                    // Count Active Orders (non-closed)
                    // We need to join via requests: orders -> requests -> buyer_id
                    // Or if orders table has buyer_id (check schema? usually it links to request)
                    // Let's assume we filter requests first then count orders.
                    // Optimization: just count requests for now as "Activity"

                    return {
                        id: profile.id,
                        email: profile.email,
                        full_name: profile.full_name || "Sans nom",
                        phone: profile.phone,
                        city: profile.city || profile.country_id, // Fallback
                        status: profile.status,
                        created_at: profile.created_at,
                        total_requests: requestsCount || 0,
                        active_orders: 0 // TODO: Implement order counting if critical
                    }
                })
            )

            setBuyers(buyersWithStats)
        } catch (error) {
            console.error("Error fetching buyers:", error)
            toast.error("Impossible de charger la liste des acheteurs")
        } finally {
            setIsLoading(false)
        }
    }

    const filteredBuyers = buyers.filter(buyer =>
        buyer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (buyer.full_name && buyer.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestion des Acheteurs</h1>
                    <p className="text-muted-foreground">
                        {buyers.length} acheteurs enregistrés sur la plateforme.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Add Export or Invite actions here if needed */}
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                    <div className="space-y-1">
                        <CardTitle>Liste des Clients</CardTitle>
                        <CardDescription>
                            Vue d'ensemble de tous les comptes acheteurs
                        </CardDescription>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Rechercher (Nom, Email)..."
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
                                <TableHead>Identité</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Activité</TableHead>
                                <TableHead>Inscription</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">Chargement...</TableCell>
                                </TableRow>
                            ) : filteredBuyers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">Aucun acheteur trouvé</TableCell>
                                </TableRow>
                            ) : (
                                filteredBuyers.map((buyer) => (
                                    <TableRow key={buyer.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <User className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <div className="font-medium">{buyer.full_name}</div>
                                                    <div className="text-xs text-muted-foreground">{buyer.city || "Non localisé"}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                                    {buyer.email}
                                                </div>
                                                {buyer.phone && (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Phone className="h-3 w-3 text-muted-foreground" />
                                                        {buyer.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {buyer.status === 'VERIFIED' ? (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                                    <ShieldCheck className="w-3 h-3 mr-1" /> Vérifié
                                                </Badge>
                                            ) : buyer.status === 'SUSPENDED' ? (
                                                <Badge variant="destructive">
                                                    <ShieldAlert className="w-3 h-3 mr-1" /> Suspendu
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">En attente</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <span className="font-medium">{buyer.total_requests}</span> demandes
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(buyer.created_at).toLocaleDateString('fr-FR')}
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
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(buyer.email)}>
                                                        Copier Email
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem>Voir détails (Bientôt)</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600">Suspendre (Bientôt)</DropdownMenuItem>
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
        </div>
    )
}
