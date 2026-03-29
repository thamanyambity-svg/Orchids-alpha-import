import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendToN8N } from '@/lib/webhooks'

export async function POST(_req: Request) {
  const supabase = await createClient()

  // Find import requests awaiting deposit for more than 24h
  const { data: awaitingDeposit, error: depositError } = await supabase
    .from('import_requests')
    .select(`
      *,
      profiles:buyer_id (email, full_name)
    `)
    .eq('status', 'AWAITING_DEPOSIT')
    .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .or('last_reminded_at.is.null,last_reminded_at.lt.' + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if (depositError) {
    return NextResponse.json({ error: depositError.message }, { status: 500 })
  }

  const results = []

  // Process AWAITING_DEPOSIT reminders
  for (const request of awaitingDeposit || []) {
    await sendToN8N('reminder_awaiting_deposit', {
      requestId: request.id,
      reference: request.reference,
      buyerEmail: request.profiles?.email,
      buyerName: request.profiles?.full_name,
      amount: request.budget_min, // Approximate or specific if available in order
    })

    await supabase
      .from('import_requests')
      .update({ last_reminded_at: new Date().toISOString() })
      .eq('id', request.id)
    
    results.push({ id: request.id, type: 'AWAITING_DEPOSIT' })
  }

  // Find partners who haven't updated 'ANALYSIS' requests for 48h
  const { data: pendingAnalysis, error: analysisError } = await supabase
    .from('import_requests')
    .select(`
      *,
      partner:assigned_partner_id (
        profiles:user_id (email, full_name)
      )
    `)
    .eq('status', 'ANALYSIS')
    .not('assigned_partner_id', 'is', null)
    .lt('updated_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
    .or('last_reminded_at.is.null,last_reminded_at.lt.' + new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())

  if (analysisError) {
    console.error('Analysis error:', analysisError)
  } else {
    for (const request of pendingAnalysis || []) {
      const partnerProfile = (request.partner as { profiles: { email: string; full_name: string } | null } | null)?.profiles
      await sendToN8N('reminder_partner_analysis', {
        requestId: request.id,
        reference: request.reference,
        partnerEmail: partnerProfile?.email,
        partnerName: partnerProfile?.full_name,
      })

      await supabase
        .from('import_requests')
        .update({ last_reminded_at: new Date().toISOString() })
        .eq('id', request.id)
      
      results.push({ id: request.id, type: 'PARTNER_ANALYSIS' })
    }
  }

  return NextResponse.json({ 
    success: true, 
    remindersSent: results.length,
    details: results 
  })
}
