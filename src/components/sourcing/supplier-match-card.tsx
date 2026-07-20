"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, XCircle, Star, Mail, Globe, Hash } from 'lucide-react'

interface SupplierMatch {
  id: string
  score: number
  ai_reason: string
  rfq_message_en: string
  rfq_message_local?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SENT'
  supplier: {
    name: string
    contact_email?: string
    contact_phone?: string
    language?: string
  }
}

interface SupplierMatchCardProps {
  match: SupplierMatch
  onStatusChange: (matchId: string, newStatus: 'APPROVED' | 'REJECTED', notes?: string) => void
}

export function SupplierMatchCard({ match, onStatusChange }: SupplierMatchCardProps) {
  const [notes, setNotes] = useState('')
  const [showRfq, setShowRfq] = useState(false)

  const isApproved = match.status === 'APPROVED' || match.status === 'SENT'
  const isRejected = match.status === 'REJECTED'

  return (
    <Card className={`mb-4 overflow-hidden transition-all duration-200 ${isApproved ? 'border-green-500 shadow-sm' : isRejected ? 'opacity-50 border-gray-200' : 'border-gray-200'}`}>
      <CardHeader className="bg-gray-50/50 pb-3 border-b border-gray-100 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            {match.supplier.name}
            {isApproved && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            {isRejected && <XCircle className="w-5 h-5 text-red-500" />}
          </CardTitle>
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            {match.supplier.contact_email && (
              <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {match.supplier.contact_email}</span>
            )}
            <span className="flex items-center gap-1"><Hash className="w-4 h-4" /> AI Score: {match.score}/10</span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <Badge variant={match.score >= 8 ? 'default' : 'secondary'} className={match.score >= 8 ? 'bg-blue-600' : ''}>
            Score: {match.score}
          </Badge>
          <Badge variant="outline" className="text-gray-500">
            {match.supplier.language === 'en' ? 'English' : match.supplier.language?.toUpperCase() || 'Local'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-500" /> Raisonnement IA
          </h4>
          <p className="text-sm text-gray-600 bg-amber-50/50 p-3 rounded-md border border-amber-100/50">
            {match.ai_reason}
          </p>
        </div>

        <div className="mb-4">
          <Button variant="outline" size="sm" onClick={() => setShowRfq(!showRfq)} className="text-xs">
            {showRfq ? 'Masquer le brouillon RFQ' : 'Voir le brouillon RFQ (Email)'}
          </Button>
          
          {showRfq && (
            <div className="mt-3 space-y-3">
              {match.rfq_message_local && match.rfq_message_local !== match.rfq_message_en && (
                <div className="p-4 bg-gray-50 rounded-md border border-gray-200 text-sm font-mono whitespace-pre-wrap text-gray-800">
                  <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Version Locale (Sera envoyée)</div>
                  {match.rfq_message_local}
                </div>
              )}
              <div className={`p-4 rounded-md border text-sm font-mono whitespace-pre-wrap ${match.rfq_message_local && match.rfq_message_local !== match.rfq_message_en ? 'bg-white border-gray-100 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                 <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Version Anglaise</div>
                {match.rfq_message_en}
              </div>
            </div>
          )}
        </div>

        {match.status === 'PENDING' && (
          <div className="mt-4 pt-4 border-t border-gray-100">
             <h4 className="text-sm font-medium text-gray-700 mb-2">Notes pour vous-même (Optionnel)</h4>
             <Textarea 
                placeholder="Ex: Demander aussi la certification ISO..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-sm resize-none"
                rows={2}
             />
          </div>
        )}
      </CardContent>
      
      {match.status === 'PENDING' && (
        <CardFooter className="bg-gray-50/80 border-t border-gray-100 flex justify-end gap-3 pt-4">
          <Button 
            variant="outline" 
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => onStatusChange(match.id, 'REJECTED', notes)}
          >
            <XCircle className="w-4 h-4 mr-2" /> Rejeter
          </Button>
          <Button 
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onStatusChange(match.id, 'APPROVED', notes)}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" /> Approuver pour RFQ
          </Button>
        </CardFooter>
      )}
      
      {match.status === 'SENT' && (
        <CardFooter className="bg-green-50 border-t border-green-100 flex justify-between items-center pt-4">
           <span className="text-sm text-green-700 font-medium flex items-center gap-2">
             <CheckCircle2 className="w-4 h-4" /> RFQ Envoyé au fournisseur
           </span>
        </CardFooter>
      )}
    </Card>
  )
}
