import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendToN8N } from '@/lib/webhooks'
import { requireUser, handleApiError, ApiError } from '@/lib/auth-guard'
import { checkRateLimit } from '@/lib/rate-limit'

// `uploadedBy` est volontairement ABSENT : dérivé de la session (anti-usurpation).
// Le client transmet le CHEMIN du fichier dans l'espace privé `documents`, et
// non plus un lien public : ces documents étaient ouvrables par quiconque en
// obtenait l'adresse. Le lien enregistré pointe vers /api/files, qui vérifie
// le droit de l'appelant à chaque ouverture.
const createDocumentSchema = z.object({
  requestId: z.string().uuid('requestId invalide'),
  service: z.string().max(60).nullable().optional(),
  type: z.string().min(1, 'type requis').max(80),
  filePath: z.string().min(1).max(300).regex(/^[A-Za-z0-9/_.-]+$/, 'chemin invalide'),
  fileName: z.string().min(1, 'fileName requis').max(200),
  fileSize: z.number().nonnegative().nullable().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()

    // Anti-spam : max 30 enregistrements de documents / minute par utilisateur.
    const rl = checkRateLimit(`documents:${user.id}`, { maxRequests: 30, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const parsed = createDocumentSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { requestId, service, type, filePath, fileName, fileSize } = parsed.data

    // Le fichier doit se trouver dans le dossier de cette demande : sinon un
    // document déposé ailleurs pourrait être rattaché — et rendu lisible — ici.
    if (!filePath.startsWith(`requests/${requestId}/`) || filePath.split('/').includes('..')) {
      throw new ApiError(400, 'Chemin hors du dossier de la demande')
    }
    const fileUrl = `/api/files/documents?path=${encodeURIComponent(filePath)}`

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
      // Colonnes réelles de la table. L'insertion écrivait `service`, `type`,
      // `file_name` et `status`, qui n'existent pas : chaque document échouait.
      .insert({
        request_id: requestId,
        document_type: service ? `${service}:${type}` : type,
        name: fileName,
        file_url: fileUrl,
        file_type: filePath.split('.').pop()?.toLowerCase() ?? null,
        file_size: fileSize ?? null,
        uploaded_by: user.id, // <-- dérivé de la session, jamais du body
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
