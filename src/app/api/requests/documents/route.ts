import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendToN8N } from '@/lib/webhooks'
import { requireUser, handleApiError, ApiError } from '@/lib/auth-guard'
import { rateLimit } from '@/lib/rate-limit'

// `uploadedBy` est volontairement ABSENT : dérivé de la session (anti-usurpation).
const createDocumentSchema = z.object({
  requestId: z.string().min(1, 'requestId requis'),
  service: z.string().nullable().optional(),
  type: z.string().min(1, 'type requis'),
  fileUrl: z.string().url('fileUrl doit être une URL valide'),
  fileName: z.string().min(1, 'fileName requis'),
  fileSize: z.number().nonnegative().nullable().optional(),
  status: z.string().nullable().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()

    // Anti-spam : max 30 enregistrements de documents / minute par utilisateur.
    const rl = rateLimit(`documents:${user.id}`, 30, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const parsed = createDocumentSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { requestId, service, type, fileUrl, fileName, fileSize, status } = parsed.data

    // Contrôle d'appartenance : la demande doit être visible par l'utilisateur via RLS
    // (buyer propriétaire, partenaire assigné, ou admin). Sinon 403 explicite.
    const { data: ownedRequest } = await supabase
      .from('import_requests')
      .select('id')
      .eq('id', requestId)
      .maybeSingle()

    if (!ownedRequest) {
      throw new ApiError(403, 'Forbidden: request not accessible')
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
        uploaded_by: user.id, // <-- dérivé de la session, jamais du body
        status: status || 'PENDING',
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
      timestamp: new Date().toISOString(),
    })

    // Trigger OCR Analysis for Proforma Invoices
    if (type === 'PROFORMA_INVOICE') {
      await sendToN8N('ocr_analysis_requested', {
        requestId,
        documentId: data.id,
        fileUrl,
        fileName,
        uploadedBy: user.id,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
