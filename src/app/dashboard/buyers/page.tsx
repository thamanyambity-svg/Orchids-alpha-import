"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { SummaryCard } from "@/components/dashboard/summary-card"
import { StatusTabs } from "@/components/dashboard/status-tabs"
import { PartnerShowcase } from "@/components/dashboard/partner-showcase"
import { MessagingCard } from "@/components/dashboard/messaging-card"
import { DocumentTable } from "@/components/dashboard/document-table"
import { TransactionHistory } from "@/components/dashboard/transaction-history"
import { CertifiedPartnerCard } from "@/components/dashboard/certified-partner-card"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('full_name, status, country_id')
            .eq('id', user.id)
            .single()
          setProfile(data)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Utilisateur'

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Background patterns */}
      <div className="fixed inset-0 pattern-grid opacity-10 pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 p-6 lg:p-10 max-w-[1600px] mx-auto space-y-10">
        {/* Header / Greeting */}
        <div className="flex flex-col gap-1">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl font-bold tracking-tight"
          >
            Bonjour, {firstName} !
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <span className="text-sm text-muted-foreground">
              Acheteur: {profile?.status === 'VERIFIED' ? 'Vérifié' : 'En attente'}
            </span>
            <div className="w-5 h-3 bg-[#00732f] rounded-sm relative overflow-hidden flex flex-col">
              <div className="h-1/3 bg-[#ff0000]" />
              <div className="h-1/3 bg-white" />
              <div className="h-1/3 bg-black" />
              <div className="absolute left-0 top-0 bottom-0 w-1/4 bg-[#00732f]" />
            </div>
          </motion.div>
        </div>

        {/* Summary Row */}
        <div className="grid lg:grid-cols-1 gap-6">
          <SummaryCard />
        </div>

        {/* Tabs Section */}
        <StatusTabs />

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Column (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            <PartnerShowcase />
            <DocumentTable />
            <TransactionHistory />
          </div>

          {/* Right Column (4 cols) */}
          <div className="lg:col-span-4 space-y-8">
            <MessagingCard />
            <CertifiedPartnerCard />
          </div>
        </div>
      </div>
      
      {/* Footer info */}
      <footer className="mt-20 border-t border-white/5 py-8 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
          © 2024 Alpha import Eachange - Confidental & Securise
        </p>
      </footer>
    </div>
  )
}
