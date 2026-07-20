"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DashboardHeader } from '@/components/dashboard/header'
import { SupplierMatchCard } from '@/components/sourcing/supplier-match-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, ArrowLeft, Send, Loader2, Bot } from 'lucide-react'
import { useLanguage } from '@/lib/i18n-context'
import { toast } from 'sonner'

export default function SourcingSessionPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLanguage()
  const supabase = createClient()
  
  const [session, setSession] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadSession()
  }, [params.session_id])

  async function loadSession() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load session and request info
      const { data: sessionData, error: sessionError } = await supabase
        .from('sourcing_sessions')
        .select(`
          *,
          request:import_requests(reference, category, quantity, unit, status)
        `)
        .eq('id', params.session_id)
        .single()

      if (sessionError) throw sessionError
      setSession(sessionData)

      // Load matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('sourcing_matches')
        .select(`
          *,
          supplier:suppliers(name, contact_email, language)
        `)
        .eq('session_id', params.session_id)
        .order('score', { ascending: false })

      if (matchesError) throw matchesError
      setMatches(matchesData || [])

    } catch (error) {
      console.error('Error loading session:', error)
      toast.error("Erreur lors du chargement de la session")
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(matchId: string, newStatus: 'APPROVED' | 'REJECTED', notes?: string) {
    try {
      const { error } = await supabase
        .from('sourcing_matches')
        .update({ status: newStatus, partner_notes: notes })
        .eq('id', matchId)

      if (error) throw error

      // Update local state
      setMatches(matches.map(m => m.id === matchId ? { ...m, status: newStatus, partner_notes: notes } : m))
      toast.success(newStatus === 'APPROVED' ? "Fournisseur approuvé" : "Fournisseur rejeté")
    } catch (error) {
      console.error('Error updating match:', error)
      toast.error("Erreur lors de la mise à jour")
    }
  }

  async function handleSendRFQs() {
    const approvedMatches = matches.filter(m => m.status === 'APPROVED')
    if (approvedMatches.length === 0) {
      toast.error("Aucun fournisseur n'a été approuvé pour l'envoi")
      return
    }

    if (!confirm(`Confirmez-vous l'envoi de ${approvedMatches.length} RFQ ? L'Admin sera en copie.`)) return

    setSending(true)
    try {
      const res = await fetch('/api/agent/sourcing/send-rfq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')

      toast.success(`${data.sent_count} emails envoyés avec succès`)
      loadSession() // Reload to get SENT statuses
    } catch (error: any) {
      console.error('Error sending RFQs:', error)
      toast.error(error.message || "Erreur lors de l'envoi des emails")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6 flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex-1 p-8 text-center">
        <h2 className="text-2xl font-bold">Session introuvable</h2>
        <Button onClick={() => router.back()} className="mt-4">Retour</Button>
      </div>
    )
  }

  const approvedCount = matches.filter(m => m.status === 'APPROVED').length
  const pendingCount = matches.filter(m => m.status === 'PENDING').length
  const isDone = session.status === 'SENT'

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/partner')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Validation Sourcing</h2>
          <p className="text-muted-foreground flex items-center gap-2">
            Demande {session.request?.reference} — {session.request?.category}
            <Badge variant="outline" className="ml-2 bg-blue-50">
              {session.status}
            </Badge>
          </p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-4">
        
        {/* Left Column: AI Summary */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-blue-50/50 p-6 rounded-lg border border-blue-100">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
              <Bot className="w-5 h-5" /> Synthèse de l'Agent
            </h3>
            <p className="text-sm text-blue-800/80 mb-4 leading-relaxed">
              {session.ai_reasoning}
            </p>
            <div className="space-y-2 text-sm text-blue-700">
              <div className="flex justify-between">
                <span>Fournisseurs analysés:</span>
                <span className="font-semibold">{session.suppliers_evaluated}</span>
              </div>
              <div className="flex justify-between">
                <span>Fournisseurs retenus:</span>
                <span className="font-semibold">{session.matches_count}</span>
              </div>
            </div>
          </div>

          {!isDone && (
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="font-semibold mb-4">Progression</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">En attente :</span>
                  <Badge variant="secondary">{pendingCount}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Approuvés :</span>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{approvedCount}</Badge>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <Button 
                  className="w-full" 
                  disabled={approvedCount === 0 || pendingCount > 0 || sending}
                  onClick={handleSendRFQs}
                >
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Envoyer RFQs ({approvedCount})
                </Button>
                {pendingCount > 0 && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Traitez tous les fournisseurs avant d'envoyer
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Matches List */}
        <div className="md:col-span-3">
          {matches.length === 0 ? (
            <div className="text-center p-12 border rounded-lg bg-gray-50/50">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Aucun fournisseur n'a été retenu par l'IA.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map(match => (
                <SupplierMatchCard 
                  key={match.id} 
                  match={match} 
                  onStatusChange={handleStatusChange} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
