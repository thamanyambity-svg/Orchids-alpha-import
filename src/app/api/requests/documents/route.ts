import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendToN8N } from '@/lib/webhooks'
import { getSessionUser } from '@/lib/reporting/auth'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Auth requise. Client SSR (RLS) : les policies request_documents imposent que
  // l'utilisateur soit lié à la demande (buyer/partner assigné/admin).
  const session = await getSessionUser()
  if (session instanceof NextResponse) return session

  // Anti-spam : max 30 enregistrements de documents / minute par utilisateur.
  const rl = rateLimit(`documents:${session.id}`, 30, 60_000)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const supabase = await createClient()

  try {
    const body = await request.json()
    const { requestId, service, type, fileUrl, fileName, fileSize, status } = body

    if (!requestId || !type || !fileUrl || !fileName) {
      return NextResponse.json(
        { error: 'Champs requis manquants (requestId, type, fileUrl, fileName)' },
        { status: 400 }
      )
    }

    // Contrôle d'appartenance explicite -> 403 propre (en plus du RLS).
    const { data: ownedRequest } = await supabase
      .from('import_requests')
      .select('id')
      .eq('id', requestId)
      .maybeSingle()

    if (!ownedRequest) {
      return NextResponse.json({ error: 'Accès refusé — demande non accessible.' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('request_documents')
      .insert({
        request_id: requestId,
        service,
        type,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        uploaded_by: session.id, // <-- dérivé de la session, jamais du body
        status: status || 'PENDING'
      })
      .select()
      .single()

    if (error) throw error

    // Notify n8n
    await sendToN8N('document_uploaded', {
      requestId,
      documentId: data.id,
      documentType: type,
      fileName,
      service,
      timestamp: new Date().toISOString()
    })

    // Trigger OCR Analysis for Proforma Invoices
    if (type === 'PROFORMA_INVOICE') {
      await sendToN8N('ocr_analysis_requested', {
        requestId,
        documentId: data.id,
        fileUrl,
        fileName,
        uploadedBy: session.id,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Document record creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to record document' },
      { status: 500 }
    )
  }
}
