import { NextRequest, NextResponse } from 'next/server'
import { requireRole, handleApiError, ApiError } from '@/lib/auth-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

/**
 * Envoi d'une pièce KYC par un acheteur.
 *
 * L'ancienne fenêtre déposait le fichier depuis le navigateur puis écrivait
 * dans `request_documents` des colonnes inexistantes (`service`, `type`,
 * `file_name`, `status`) ; la table exige de plus une demande rattachée, ce
 * qu'un KYC n'a pas. Chaque envoi échouait. Et elle enregistrait un lien
 * public vers la pièce d'identité.
 *
 * Désormais : le serveur dépose le fichier dans l'espace privé `documents`
 * sous `kyc/<compte>/`, ajoute la pièce à `buyer_profiles.kyc_documents` — la
 * colonne prévue par le schéma — et passe le KYC « en cours » s'il ne l'était
 * pas. Le chemin est construit ici à partir de la session : l'appelant ne le
 * choisit pas.
 */

const TAILLE_MAX = 10 * 1024 * 1024
const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(request: NextRequest) {
  let cheminDepose: string | null = null
  const admin = createAdminClient()
  try {
    const { user } = await requireRole(['BUYER'])

    const form = await request.formData().catch(() => null)
    if (!form) throw new ApiError(400, 'Formulaire invalide')
    const fichier: any = form.get('file')
    const type = String(form.get('type') ?? '').trim()

    if (!fichier || typeof fichier !== 'object' || typeof fichier.arrayBuffer !== 'function') {
      throw new ApiError(400, 'Fichier manquant')
    }
    if (type.length < 2 || type.length > 60) throw new ApiError(400, 'Type de pièce invalide')
    if (!fichier.size || fichier.size > TAILLE_MAX) throw new ApiError(400, 'Fichier vide ou supérieur à 10 Mo')
    const extension = EXTENSIONS[fichier.type]
    if (!extension) throw new ApiError(400, 'Format accepté : PDF, JPEG, PNG ou WebP')

    const { data: profil, error: erreurLecture } = await admin
      .from('buyer_profiles')
      .select('user_id, kyc_status, kyc_documents')
      .eq('user_id', user.id)
      .maybeSingle()
    if (erreurLecture) throw erreurLecture
    if (!profil) throw new ApiError(404, 'Profil acheteur introuvable')

    const chemin = `kyc/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
    const { error: erreurDepot } = await admin.storage
      .from('documents')
      .upload(chemin, new Uint8Array(await fichier.arrayBuffer()), { contentType: fichier.type, upsert: false })
    if (erreurDepot) throw erreurDepot
    cheminDepose = chemin

    const piece = {
      path: chemin,
      type,
      name: String(fichier.name ?? 'document').slice(0, 200),
      size: fichier.size,
      mime: fichier.type,
      uploaded_at: new Date().toISOString(),
    }
    const pieces = Array.isArray(profil.kyc_documents) ? profil.kyc_documents : []
    // Une nouvelle pièce relance l'instruction, sauf si le KYC est déjà validé.
    const statut = profil.kyc_status === 'VERIFIED' ? 'VERIFIED' : 'IN_PROGRESS'

    const { data: maj, error: erreurMaj } = await admin
      .from('buyer_profiles')
      .update({ kyc_documents: [...pieces, piece], kyc_status: statut })
      .eq('user_id', user.id)
      .select('user_id')
    if (erreurMaj) throw erreurMaj
    if (!maj?.length) throw new ApiError(404, 'Profil acheteur introuvable')

    await logAudit({
      actorId: user.id,
      action: 'KYC_DOCUMENT_UPLOADED',
      targetType: 'buyer_profiles',
      targetId: user.id,
      details: { type, mime: fichier.type, size: fichier.size },
    })

    return NextResponse.json({
      document: { ...piece, url: `/api/files/documents?path=${encodeURIComponent(chemin)}` },
      kyc_status: statut,
    })
  } catch (error) {
    // Un fichier déposé sans être rattaché est une pièce d'identité orpheline :
    // on la retire plutôt que de la laisser dans l'espace.
    if (cheminDepose) await admin.storage.from('documents').remove([cheminDepose]).catch(() => {})
    return handleApiError(error, { route: '/api/kyc/documents', method: 'POST' })
  }
}
