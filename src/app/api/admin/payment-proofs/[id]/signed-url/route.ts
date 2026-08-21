import { NextRequest, NextResponse } from 'next/server'
import { requireRole, handleApiError } from '@/lib/auth-guard'

const BUCKET = 'documents'
const SIGNED_URL_TTL_SECONDS = 3600

/**
 * URL signée, à durée limitée, vers le fichier d'un justificatif.
 *
 * Un justificatif de paiement est une pièce sensible : on ne sert jamais d'URL
 * publique, et chaque consultation est inscrite dans `document_access_logs`, table
 * volontairement dépourvue de policy UPDATE/DELETE.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireRole(['ADMIN'])
    const { id } = await params

    const { data: proof, error } = await supabase
      .from('payment_proofs')
      .select('id, file_path')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('[POST /api/admin/payment-proofs/:id/signed-url]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!proof) {
      return NextResponse.json({ error: 'Justificatif introuvable' }, { status: 404 })
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(proof.file_path, SIGNED_URL_TTL_SECONDS)

    if (signError || !signed?.signedUrl) {
      console.error('[payment-proof signed url]', signError)
      return NextResponse.json({ error: 'Impossible de générer le lien' }, { status: 500 })
    }

    const { error: logError } = await supabase.from('document_access_logs').insert({
      document_type: 'PAYMENT_PROOF',
      document_id: proof.id,
      accessed_by: user.id,
      admin_id: user.id,
      action: 'SIGNED_URL_GENERATED',
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      user_agent: request.headers.get('user-agent'),
      metadata: { bucket: BUCKET, path: proof.file_path, expires_in_seconds: SIGNED_URL_TTL_SECONDS },
    })

    // Le journal ne doit pas empêcher un admin de faire son travail, mais son échec
    // se voit dans les logs serveur.
    if (logError) console.error('[document_access_logs]', logError)

    return NextResponse.json({ url: signed.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS })
  } catch (error) {
    return handleApiError(error)
  }
}
