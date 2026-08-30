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
    <Card className={`mb-4 overflow-hidden transition-all duration-200 ${isApproved ? 'border-success shadow-sm' : isRejected ? 'opacity-50 border-border' : 'border-border'}`}>
      <CardHeader className="bg-muted/50 pb-3 border-b border-border flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            {match.supplier.name}
            {isApproved && <CheckCircle2 className="w-5 h-5 text-success" />}
            {isRejected && <XCircle className="w-5 h-5 text-destructive" />}
          </CardTitle>
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            {match.supplier.contact_email && (
              <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {match.supplier.contact_email}</span>
            )}
            <span className="flex items-center gap-1"><Hash className="w-4 h-4" /> AI Score: {match.score}/10</span>
          </div>
        </div>
        <div className="text-end flex flex-col items-end gap-2">
          <Badge variant={match.score >= 8 ? 'default' : 'secondary'} className={match.score >= 8 ? 'bg-info' : ''}>
            Score: {match.score}
          </Badge>
          <Badge variant="outline" className="text-muted-foreground">
            {match.supplier.language === 'en' ? 'English' : match.supplier.language?.toUpperCase() || 'Local'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1">
            <Star className="w-4 h-4 text-warning" /> Raisonnement IA
          </h4>
          <p className="text-sm text-muted-foreground bg-warning-subtle/50 p-3 rounded-md border border-warning-border/50">
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
                <div className="p-4 bg-muted/50 rounded-md border border-border text-sm font-mono whitespace-pre-wrap text-foreground">
                  <div className="text-xs font-bold text-muted-foreground mb-2 uppercase">Version Locale (Sera envoyée)</div>
                  {match.rfq_message_local}
                </div>
              )}
              <div className={`p-4 rounded-md border text-sm font-mono whitespace-pre-wrap ${match.rfq_message_local && match.rfq_message_local !== match.rfq_message_en ? 'bg-card border-border text-muted-foreground' : 'bg-muted/50 border-border text-foreground'}`}>
                 <div className="text-xs font-bold text-muted-foreground mb-2 uppercase">Version Anglaise</div>
                {match.rfq_message_en}
              </div>
            </div>
          )}
        </div>

        {match.status === 'PENDING' && (
          <div className="mt-4 pt-4 border-t border-border">
             <h4 className="text-sm font-medium text-foreground mb-2">Notes pour vous-même (Optionnel)</h4>
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
        <CardFooter className="bg-muted/50 border-t border-border flex justify-end gap-3 pt-4">
          <Button 
            variant="outline" 
            className="border-destructive-border text-destructive hover:bg-destructive-subtle hover:text-destructive"
            onClick={() => onStatusChange(match.id, 'REJECTED', notes)}
          >
            <XCircle className="w-4 h-4 me-2" /> Rejeter
          </Button>
          <Button 
            className="bg-success hover:bg-success text-success-foreground"
            onClick={() => onStatusChange(match.id, 'APPROVED', notes)}
          >
            <CheckCircle2 className="w-4 h-4 me-2" /> Approuver pour RFQ
          </Button>
        </CardFooter>
      )}
      
      {match.status === 'SENT' && (
        <CardFooter className="bg-success-subtle border-t border-success-border flex justify-between items-center pt-4">
           <span className="text-sm text-success font-medium flex items-center gap-2">
             <CheckCircle2 className="w-4 h-4" /> RFQ Envoyé au fournisseur
           </span>
        </CardFooter>
      )}
    </Card>
  )
}
