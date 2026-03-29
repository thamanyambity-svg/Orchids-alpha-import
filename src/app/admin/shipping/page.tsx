"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Ship, Anchor, Plane, FileText, DollarSign, ArrowRight } from "lucide-react"
import Link from "next/link"

// Detailed cost calculation simulation
function calculateDetailedCosts(amount: number, transportMode: string, _countryCode: string) {
    // Base rates
    const freightRate = transportMode === 'AIR' ? 0.35 : 0.15
    const customsRate = 0.25 // Standard tariff

    // Calculated values
    const freight = amount * freightRate
    const customs = amount * customsRate
    const fees = 500 // Dossier fees
    const insurance = amount * 0.01

    return {
        freight,
        customs,
        fees,
        insurance,
        total: freight + customs + fees + insurance
    }
}

// Mock documents requirement based on country
function getRequiredDocuments(countryCode: string) {
    const baseDocs = ["Bill of Lading", "Facture Commerciale", "Packing List"]
    if (countryCode === 'CHN') return [...baseDocs, "Certificat d'Origine", "Form E"]
    if (countryCode === 'ARE') return [...baseDocs, "Certificat SASO"]
    if (countryCode === 'TUR') return [...baseDocs, "EUR.1"]
    return baseDocs
}

export default function AdminShippingPage() {
    const [shipments, setShipments] = useState<any[]>([])
    const [_loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchShippingData()
    }, [])

    async function fetchShippingData() {
        setLoading(true)
        try {
            const { data } = await supabase
                .from('orders')
                .select(`
            *,
            request:import_requests(
                *,
                buyer:profiles(*),
                country:countries(*)
            )
        `)
                .eq('status', 'SHIPPED')
                .order('updated_at', { ascending: false })

            setShipments(data || [])
        } catch (error) {
            console.error("Error fetching shipping data:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <DashboardHeader
                title="Gestion du Fret & Logistique"
                subtitle="Suivi détaillé des expéditions, coûts logistiques et conformité documentaire."
            />

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-blue-50/50 border-blue-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-800">Fret Maritime</CardTitle>
                        <Anchor className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">
                            {shipments.filter(s => s.request?.transport_mode !== 'AIR').length}
                        </div>
                        <p className="text-xs text-blue-600">Conteneurs en transit</p>
                    </CardContent>
                </Card>

                <Card className="bg-sky-50/50 border-sky-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-sky-800">Fret Aérien</CardTitle>
                        <Plane className="h-4 w-4 text-sky-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-sky-900">
                            {shipments.filter(s => s.request?.transport_mode === 'AIR').length}
                        </div>
                        <p className="text-xs text-sky-600">Expéditions urgentes</p>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-50/50 border-emerald-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-800">Coûts Logistiques</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-900">
                            ${shipments.reduce((acc, s) => {
                                const costs = calculateDetailedCosts(s.total_amount, s.request?.transport_mode, s.request?.country?.code)
                                return acc + costs.total
                            }, 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-emerald-600">Estimations Fret + Douanes</p>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="p-6 bg-muted/40 border-b">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Tableau de Bord Logistique & Douanier
                        </h3>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">Exporter Rapport</Button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[200px]">Référence Dossier</TableHead>
                                <TableHead>Origine / Mode</TableHead>
                                <TableHead>Documents Requis (Normes Int.)</TableHead>
                                <TableHead className="text-right">Valeur CIF</TableHead>
                                <TableHead className="text-right">Détail Frais</TableHead>
                                <TableHead className="text-right">Total Est.</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shipments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Ship className="w-8 h-8 opacity-20" />
                                            <p>Aucune expédition en cours pour le moment.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                shipments.map((shipment) => {
                                    const transportMode = shipment.request?.transport_mode || 'SEA'
                                    const countryCode = shipment.request?.country?.code || 'CHN'
                                    const costs = calculateDetailedCosts(shipment.total_amount, transportMode, countryCode)
                                    const docs = getRequiredDocuments(countryCode)

                                    return (
                                        <TableRow key={shipment.id} className="hover:bg-muted/5">
                                            <TableCell>
                                                <div className="font-mono text-sm font-bold text-primary">
                                                    {shipment.reference}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {shipment.request?.buyer?.full_name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <Badge variant="outline" className="flex w-fit items-center gap-1 font-normal bg-background">
                                                        <span className="text-xs">{shipment.request?.country?.name}</span>
                                                    </Badge>
                                                    <Badge
                                                        variant={transportMode === 'AIR' ? 'secondary' : 'default'}
                                                        className={`uppercase text-[10px] w-fit flex items-center gap-1 ${transportMode === 'AIR' ? 'bg-sky-100 text-sky-800 hover:bg-sky-200' : 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-0'}`}
                                                    >
                                                        {transportMode === 'AIR' ? <Plane className="w-3 h-3" /> : <Anchor className="w-3 h-3" />}
                                                        {transportMode === 'AIR' ? 'AÉRIEN (Express)' : 'MARITIME'}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1 max-w-[300px]">
                                                    {docs.map((doc, i) => (
                                                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                                                            {doc}
                                                        </span>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                ${shipment.total_amount?.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                                                    <span className="flex justify-between gap-4">
                                                        <span>Fret:</span> <span className="font-mono text-foreground">${costs.freight.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                    </span>
                                                    <span className="flex justify-between gap-4">
                                                        <span>Douane:</span> <span className="font-mono text-foreground">${costs.customs.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                    </span>
                                                    <span className="flex justify-between gap-4">
                                                        <span>Frais:</span> <span className="font-mono text-foreground">${costs.fees}</span>
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="font-bold text-emerald-600">
                                                    ${(costs.total + shipment.total_amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground">Coût Global</span>
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={`/admin/requests/${shipment.request_id}`}>
                                                        <ArrowRight className="w-4 h-4 text-muted-foreground hover:text-primary" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
