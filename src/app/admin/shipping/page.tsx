"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Ship, Anchor, Plane, FileText, DollarSign, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function AdminShippingPage() {
    const [shipments, setShipments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchShippingData()
    }, [])

    async function fetchShippingData() {
        setLoading(true)
        try {
            // Fetch orders in SHIPPED state with their requests and buyers
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
                .eq('status', 'SHIPPED') // Simplify to SHIPPED for now
                .order('updated_at', { ascending: false })

            setShipments(data || [])
        } catch (error) {
            console.error("Error fetching shipping data:", error)
        } finally {
            setLoading(false)
        }
    }

    // Calculate mock costs (since we don't have a 'costs' table yet, we simulate breakdown logic)
    // In a real scenario, this would come from a 'shipping_costs' table linked to the order.
    const calculateCosts = (amount: number) => {
        return {
            freight: amount * 0.15, // Approx 15% freight
            customs: amount * 0.25, // Approx 25% customs/taxes
            docs: 500, // Fixed documentation fee
            handling: amount * 0.05 // 5% handling
        }
    }

    return (
        <div className="space-y-6">
            <DashboardHeader
                title="Gestion du Fret & Logistique"
                subtitle="Suivi détaillé des expéditions et analyse des coûts par client."
            />

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-800">Fret Maritime (En cours)</CardTitle>
                        <Anchor className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">
                            {shipments.filter(s => s.request?.transport_mode !== 'AIR').length}
                        </div>
                        <p className="text-xs text-blue-600">Conteneurs actifs</p>
                    </CardContent>
                </Card>

                <Card className="bg-sky-50 border-sky-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-sky-800">Fret Aérien (En cours)</CardTitle>
                        <Plane className="h-4 w-4 text-sky-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-sky-900">
                            {shipments.filter(s => s.request?.transport_mode === 'AIR').length}
                        </div>
                        <p className="text-xs text-sky-600">Expéditions urgentes</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Coûts Logistiques Est.</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${shipments.reduce((acc, s) => acc + (s.total_amount * 0.45), 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">Douanes, Transport, Docs</p>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Détail des Coûts par Dossier</h3>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Référence</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Mode</TableHead>
                                    <TableHead>Valeur Marchandise</TableHead>
                                    <TableHead className="text-right bg-muted/30">Fret (Est.)</TableHead>
                                    <TableHead className="text-right bg-muted/30">Douanes (Est.)</TableHead>
                                    <TableHead className="text-right bg-muted/30">Docs</TableHead>
                                    <TableHead className="text-right">Total Coûts</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shipments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Aucune expédition en cours.</TableCell>
                                    </TableRow>
                                ) : (
                                    shipments.map((shipment) => {
                                        const costs = calculateCosts(shipment.total_amount)
                                        const totalCosts = costs.freight + costs.customs + costs.docs + costs.handling
                                        const transportMode = shipment.request?.transport_mode || 'SEA' // Default to SEA if null

                                        return (
                                            <TableRow key={shipment.id}>
                                                <TableCell className="font-mono text-xs font-medium">
                                                    {shipment.reference}
                                                    <div className="text-[10px] text-muted-foreground">{shipment.request?.country?.name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium text-sm">{shipment.request?.buyer?.full_name}</div>
                                                    <div className="text-xs text-muted-foreground">{shipment.request?.buyer?.company_name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={transportMode === 'AIR' ? 'secondary' : 'default'} className="uppercase text-[10px]">
                                                        {transportMode === 'AIR' ? <Plane className="w-3 h-3 mr-1" /> : <Anchor className="w-3 h-3 mr-1" />}
                                                        {transportMode}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-bold">
                                                    ${shipment.total_amount?.toLocaleString()}
                                                </TableCell>

                                                {/* Breakdown Columns */}
                                                <TableCell className="text-right bg-muted/10 text-xs font-mono">
                                                    ${costs.freight.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </TableCell>
                                                <TableCell className="text-right bg-muted/10 text-xs font-mono">
                                                    ${costs.customs.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </TableCell>
                                                <TableCell className="text-right bg-muted/10 text-xs font-mono">
                                                    ${costs.docs}
                                                </TableCell>

                                                <TableCell className="text-right font-bold text-red-600">
                                                    ${totalCosts.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={`/admin/requests/${shipment.request_id}`}>
                                                            <ArrowRight className="w-4 h-4" />
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
        </div>
    )
}
