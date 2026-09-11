import { NextRequest, NextResponse } from 'next/server'
import { requireUser, handleApiError, ApiError } from '@/lib/auth-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { participantsDemande, estParticipant } from '@/lib/requests/participants'
import { lienFichier } from '@/lib/kyc/pieces'
import {
  LONGUEUR_MAX_MESSAGE,
  PIECES_MAX_PAR_MESSAGE,
  motifRefusPiece,
  type PieceJointe,
} from '@/lib/messages/pieces-jointes'

/**
 * Discussion d'une demande : l'acheteur, le partenaire affecté et
 * l'administration écrivent dans un même fil.
 *
 * Il n'existait qu'une messagerie d'acheteur à partenaire, sans
 * l'administration, sans fichiers et sans rattachement à la demande : les
 * précisions — souvent nécessaires, les demandes étant rarement complètes au
 * dépôt — n'avaient pas de lieu.
 *
 * Lecture et écriture passent par la clé de service, après vérification de
 * la participation : les règles d'accès de `messages` ne connaissent qu'un
 * expéditeur et un destinataire. Un non-participant reçoit 404, pour ne pas
 * confirmer l'existence de la demande.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MESSAGES_MAX = 300

type Contexte = { params: Promise<{ id: string }> }

async function autoriser(id: string) {
  const { user, role } = await requireUser()
  if (!UUID.test(id)) throw new ApiError(400, 'Demande invalide')
  const admin = createAdminClient()
  const participants = await participantsDemande(admin, id)
  if (!participants) throw new ApiError(404, 'Demande introuvable')
  if (role !== 'ADMIN' && !estParticipant(participants, user.id)) {
    throw new ApiError(404, 'Demande introuvable')
  }
  return { user, role, admin, participants }
}

function avecLiens(pieces: unknown): (PieceJointe & { url: string })[] {
  if (!Array.isArray(pieces)) return []
  return pieces
    .filter((p): p is PieceJointe => !!p && typeof p === 'object' && typeof (p as any).path === 'string')
    .map((p) => ({ ...p, url: lienFichier('documents', p.path) }))
}

export async function GET(_request: NextRequest, { params }: Contexte) {
  try {
    const { id } = await params
    const { user, admin } = await autoriser(id)

    const { data: lignes, error } = await admin
      .from('messages')
      .select('id, content, created_at, sender_id, attachments')
      .eq('request_id', id)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_MAX)
    if (error) throw error

    const messages = (lignes ?? []).reverse()
    const expediteurs = [...new Set(messages.map((m: any) => m.sender_id))]
    const profils = new Map<string, { full_name: string | null; role: string | null }>()
    if (expediteurs.length > 0) {
      const { data } = await admin.from('profiles').select('id, full_name, role').in('id', expediteurs)
      for (const p of data ?? []) profils.set(p.id, { full_name: p.full_name ?? null, role: p.role ?? null })
    }

    return NextResponse.json({
      me: user.id,
      messages: messages.map((m: any) => ({
        id: m.id,
        content: m.content ?? '',
        created_at: m.created_at,
        sender_id: m.sender_id,
        attachments: avecLiens(m.attachments),
        sender: profils.get(m.sender_id) ?? null,
      })),
    })
  } catch (error) {
    return handleApiError(error, { route: '/api/requests/[id]/messages', method: 'GET' })
  }
}

export async function POST(request: NextRequest, { params }: Contexte) {
  try {
    const { id } = await params
    const { user, admin, participants } = await autoriser(id)

    const rl = checkRateLimit(`thread:${user.id}`, { maxRequests: 30, windowMs: 60000 })
    if (!rl.allowed) throw new ApiError(429, 'Trop de messages, patientez une minute')

    const corps = await request.json().catch(() => null)
    if (!corps || typeof corps !== 'object') throw new ApiError(400, 'Message invalide')

    const texte = typeof corps.content === 'string' ? corps.content.trim() : ''
    const pieces: unknown[] = Array.isArray(corps.attachments) ? corps.attachments : []
    if (texte.length > LONGUEUR_MAX_MESSAGE) throw new ApiError(400, 'Message trop long')
    if (pieces.length > PIECES_MAX_PAR_MESSAGE) throw new ApiError(400, `${PIECES_MAX_PAR_MESSAGE} fichiers maximum`)
    if (!texte && pieces.length === 0) throw new ApiError(400, 'Message vide')

    for (const piece of pieces) {
      const motif = motifRefusPiece(piece, id)
      if (motif) throw new ApiError(400, motif)
    }
    const retenues: PieceJointe[] = (pieces as PieceJointe[]).map(({ path, name, mime, size }) => ({ path, name, mime, size }))

    const { data: message, error } = await admin
      .from('messages')
      .insert({
        request_id: id,
        sender_id: user.id, // dérivé de la session, jamais du corps
        recipient_id: null, // message de discussion : adressé à tous les participants
        content: texte,
        attachments: retenues,
      })
      .select('id, content, created_at, sender_id, attachments')
      .single()
    if (error) throw error

    // Prévenir les autres participants. Sans effet sur l'envoi en cas d'échec.
    const destinataires = [participants.buyerId, participants.partnerUserId].filter(
      (d): d is string => !!d && d !== user.id
    )
    if (destinataires.length > 0) {
      const lien = (compte: string) =>
        compte === participants.buyerId ? `/dashboard/requests/${id}` : `/partner/requests/${id}`
      const apercu = texte ? texte.slice(0, 140) : `${retenues.length} fichier(s) joint(s)`
      await admin
        .from('notifications')
        .insert(
          destinataires.map((d) => ({
            user_id: d,
            channel: 'message',
            type: 'info',
            title: 'Nouveau message sur votre dossier',
            message: apercu,
            link: lien(d),
          }))
        )
        .then(() => undefined, () => undefined)
    }

    return NextResponse.json({ message: { ...message, attachments: avecLiens(message.attachments) } })
  } catch (error) {
    return handleApiError(error, { route: '/api/requests/[id]/messages', method: 'POST' })
  }
}
