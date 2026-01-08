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
import { CheckCircle2, XCircle, Search, Box, MapPin, AlertCircle, FileText } from "lucide-react"
import { toast } from "sonner"

interface SupplierWithPartner {
    id: string
    name: string
    partner_id: string
    contact_email: string | null
    contact_phone: string | null
    address: string | null
    status: string
    validated_by_admin: boolean
    rating: number
    capacity: string | null
    partner_name?: string
}

export default function AdminSuppliersPage() {
    const [suppliers, setSuppliers] = useState<SupplierWithPartner[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    const supabase = createClient()

    useEffect(() => {
        fetchSuppliers()
    }, [])

    async function fetchSuppliers() {
        setIsLoading(true)
        try {
            // 1. Fetch all suppliers
            const { data: suppliersData, error } = await supabase
                .from('suppliers')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            // 2. Fetch partner names for each supplier
            const enrichedSuppliers = await Promise.all(
                (suppliersData || []).map(async (supplier) => {
                    let partnerName = "Inconnu"
                    if (supplier.partner_id) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('full_name, company_name')
                            .eq('id', supplier.partner_id)
                            .single()

                        partnerName = profile?.company_name || profile?.full_name || "Partenaire Inconnu"
                    }

                    return {
                        ...supplier,
                        partner_name: partnerName
                    }
                })
            )

            setSuppliers(enrichedSuppliers)
        } catch (error) {
            console.error("Error fetching suppliers:", error)
            toast.error("Erreur lors du chargement des fournisseurs")
        } finally {
            setIsLoading(false)
        }
    }

    async function handleValidation(supplierId: string, isValid: boolean) {
        try {
            const { error } = await supabase
                .from('suppliers')
                .update({
                    validated_by_admin: isValid,
                    status: isValid ? 'ACTIVE' : 'RESTRICTED'
                })
                .eq('id', supplierId)

            if (error) throw error

            toast.success(isValid ? "Fournisseur validé ✅" : "Fournisseur restreint ⛔️")
            fetchSuppliers() // Refresh list
        } catch (error) {
            console.error("Error updating supplier:", error)
            toast.error("Une erreur est survenue")
        }
    }

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.partner_name && s.partner_name.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Validation Fournisseurs</h1>
                    <p className="text-muted-foreground">
                        Contrôle et validation des fournisseurs ajoutés par les partenaires.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                    <div className="space-y-1">
                        <CardTitle>Registre Global</CardTitle>
                        <CardDescription>
                            {suppliers.filter(s => !s.validated_by_admin).length} fournisseurs en attente de validation
                        </CardDescription>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Rechercher (Nom, Partenaire)..."
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
                                <TableHead>Fournisseur</TableHead>
                                <TableHead>Partenaire Responsable</TableHead>
                                <TableHead>Capacité & Adresse</TableHead>
                                <TableHead>Statut Validation</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Chargement...</TableCell>
                                </TableRow>
                            ) : filteredSuppliers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Aucun fournisseur trouvé</TableCell>
                                </TableRow>
                            ) : (
                                filteredSuppliers.map((supplier) => (
                                    <TableRow key={supplier.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center border border-orange-200">
                                                    <Box className="h-5 w-5 text-orange-600" />
                                                </div>
                                                <div>
                                                    <div className="font-medium">{supplier.name}</div>
                                                    <div className="text-xs text-muted-foreground">{supplier.contact_email || "Aucun email"}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-muted/50">
                                                {supplier.partner_name}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Box className="w-3 h-3" /> {supplier.capacity || "N/A"}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {supplier.address ? (supplier.address.substring(0, 20) + "...") : "Non renseignée"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {supplier.validated_by_admin ? (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Validé
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
                                                    <AlertCircle className="w-3 h-3 mr-1" /> À Valider
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {supplier.validated_by_admin ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleValidation(supplier.id, false)}
                                                >
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Suspendre
                                                </Button>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="sm">
                                                        <FileText className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                        onClick={() => handleValidation(supplier.id, true)}
                                                    >
                                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                                        Valider
                                                    </Button>
                                                </div>
                                            )}
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
