/**
 * Messagerie contextuelle douanière — envoi, lecture, suivi read_by (K-2).
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/server-actions/admin-guard'
import {
  requirePartner,
  verifyPartnerFileAccess,
} from '@/lib/server-actions/partner-guard'
import { ok, fail, type ServerActionResult } from '@/lib/server-actions/result'

export interface CustomsMessage {
  id: string
  file_id: string
  author_id: string
  author_name: string | null
  author_role: string
  content: string
  is_internal: boolean
  /** Non lu par l’utilisateur courant (clé absente dans read_by côté serveur). */
  is_unread: boolean
  created_at: string
}

export interface SendMessageInput {
  fileId: string
  content: string
  isInternal: boolean
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

async function assertFileWritable(
  fileId: string,
  supabase: SupabaseServer
): Promise<string | null> {
  const { data, error } = await supabase
    .from('customs_files')
    .select('id, status')
    .eq('id', fileId)
    .single()

  if (error || !data) return 'Dossier douanier introuvable.'
  if (data.status === 'RELEASED') {
    return "Ce dossier est clôturé. Aucun nouveau message n'est accepté."
  }
  return null
}

function validateContent(content: string): string | null {
  const trimmed = content.trim()
  if (trimmed.length === 0) return 'Le message ne peut pas être vide.'
  if (trimmed.length > 4000) {
    return 'Le message ne peut pas dépasser 4 000 caractères.'
  }
  return null
}

async function verifyBuyerOwnsCustomsFile(
  supabase: SupabaseServer,
  fileId: string,
  userId: string
): Promise<boolean> {
  const { data: cf, error: e1 } = await supabase
    .from('customs_files')
    .select('order_id')
    .eq('id', fileId)
    .maybeSingle()

  if (e1 || !cf?.order_id) return false

  const { data: ord, error: e2 } = await supabase
    .from('orders')
    .select('request_id')
    .eq('id', cf.order_id)
    .maybeSingle()

  if (e2 || !ord?.request_id) return false

  const { data: ir, error: e3 } = await supabase
    .from('import_requests')
    .select('buyer_id')
    .eq('id', ord.request_id)
    .maybeSingle()

  return !e3 && ir?.buyer_id === userId
}

const MESSAGE_SELECT =
  'id, file_id, author_id, content, is_internal, read_by, created_at, profiles ( full_name, role )'

type ProfileEmbed = { full_name: string | null; role: string }

type MessageRow = {
  id: string
  file_id: string
  author_id: string
  content: string
  is_internal: boolean
  read_by: unknown
  created_at: string
  profiles: ProfileEmbed | ProfileEmbed[] | null
}

function embedProfile(
  p: MessageRow['profiles']
): ProfileEmbed | null {
  if (p == null) return null
  return Array.isArray(p) ? (p[0] ?? null) : p
}

/** Normalise read_by JSONB → map userId → horodatage (string). */
function parseReadBy(raw: unknown): Record<string, string> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(o)) {
      if (v == null) continue
      out[k] = typeof v === 'string' ? v : JSON.stringify(v)
    }
    return out
  }
  return {}
}

function mapRows(data: unknown, viewerUserId: string): CustomsMessage[] {
  const rows = (data ?? []) as MessageRow[]
  return rows.map((row) => {
    const prof = embedProfile(row.profiles)
    const readMap = parseReadBy(row.read_by)
    const isUnread = readMap[viewerUserId] == null

    return {
      id: row.id,
      file_id: row.file_id,
      author_id: row.author_id,
      author_name: prof?.full_name ?? null,
      author_role: prof?.role ?? 'UNKNOWN',
      content: row.content,
      is_internal: row.is_internal,
      is_unread: isUnread,
      created_at: row.created_at,
    }
  })
}

export async function sendCustomsMessage(
  input: SendMessageInput
): Promise<ServerActionResult<{ messageId: string }>> {
  const contentError = validateContent(input.content)
  if (contentError) return fail(contentError)

  const readSeed = (uid: string) => ({ [uid]: new Date().toISOString() })

  const adminGate = await requireAdmin()
  if (adminGate.success && adminGate.data) {
    const { userId, supabase } = adminGate.data

    const fileError = await assertFileWritable(input.fileId, supabase)
    if (fileError) return fail(fileError)

    const { data, error } = await supabase
      .from('customs_file_messages')
      .insert({
        file_id: input.fileId,
        author_id: userId,
        content: input.content.trim(),
        is_internal: input.isInternal,
        read_by: readSeed(userId),
      })
      .select('id')
      .single()

    if (error || !data) return fail("Échec de l'envoi du message.")
    return ok({ messageId: data.id })
  }

  const partnerGate = await requirePartner()
  if (partnerGate.success && partnerGate.data) {
    const { userId, partnerProfileId, supabase } = partnerGate.data

    const hasAccess = await verifyPartnerFileAccess(
      input.fileId,
      partnerProfileId,
      supabase
    )
    if (!hasAccess) {
      return fail("Vous n'êtes pas assigné à ce dossier douanier.")
    }

    const fileError = await assertFileWritable(input.fileId, supabase)
    if (fileError) return fail(fileError)

    if (input.isInternal) {
      return fail('Les partenaires ne peuvent pas créer de notes internes.')
    }

    const { data, error } = await supabase
      .from('customs_file_messages')
      .insert({
        file_id: input.fileId,
        author_id: userId,
        content: input.content.trim(),
        is_internal: false,
        read_by: readSeed(userId),
      })
      .select('id')
      .single()

    if (error || !data) return fail("Échec de l'envoi du message.")
    return ok({ messageId: data.id })
  }

  return fail(
    'Accès refusé. Seuls l’administrateur et le partenaire assigné peuvent envoyer des messages.'
  )
}

/**
 * Marque comme lus tous les messages visibles du dossier pour auth.uid() (RPC atomique).
 */
export async function markCustomsMessagesAsRead(
  fileId: string
): Promise<ServerActionResult<{ markedCount: number }>> {
  if (!fileId?.trim()) return fail('Identifiant de dossier manquant.')

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('mark_customs_messages_read', {
    p_file_id: fileId,
    p_timestamp: new Date().toISOString(),
  })

  if (error) {
    return fail(
      'Impossible de marquer les messages comme lus. ' +
        'Vérifiez que la migration K-2 (read_by + RPC) est appliquée.'
    )
  }

  const markedCount = typeof data === 'number' ? data : Number(data) || 0
  return ok({ markedCount })
}

/**
 * Nombre de messages non lus pour l’utilisateur courant sur un dossier.
 */
export async function getUnreadCountForFile(
  fileId: string
): Promise<ServerActionResult<number>> {
  if (!fileId?.trim()) return ok(0)

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return ok(0)

  const { data, error } = await supabase.rpc('get_customs_file_unread_count', {
    p_file_id: fileId,
  })

  if (error) return ok(0)

  const n = typeof data === 'number' ? data : Number(data) || 0
  return ok(n)
}

type UnreadCountRow = { file_id: string; unread_count: number }

/**
 * Compteurs non lus pour une liste de dossiers (une requête RPC).
 */
export async function getCustomsUnreadCountsForFiles(
  fileIds: string[]
): Promise<ServerActionResult<Record<string, number>>> {
  if (!fileIds.length) return ok({})

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return ok({})

  const { data, error } = await supabase.rpc('get_customs_unread_counts_for_files', {
    p_file_ids: fileIds,
  })

  if (error || !data) return ok({})

  const rows = data as UnreadCountRow[]
  const map: Record<string, number> = {}
  for (const row of rows) {
    if (row.file_id) map[row.file_id] = row.unread_count ?? 0
  }
  return ok(map)
}

export async function getCustomsMessages(
  fileId: string
): Promise<ServerActionResult<CustomsMessage[]>> {
  if (!fileId?.trim()) return fail('Identifiant de dossier manquant.')

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return fail('Non authentifié.')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) return fail('Profil introuvable.')

  const role = profile.role
  const userId = user.id

  const allowedRead: readonly string[] = [
    'ADMIN',
    'PARTNER',
    'PARTNER_COUNTRY',
    'BUYER',
    'FISCAL_CONSULTANT',
    'ACCOUNTANT',
  ]
  if (!allowedRead.includes(role)) {
    return fail('Accès non autorisé.')
  }

  if (role === 'BUYER') {
    const owns = await verifyBuyerOwnsCustomsFile(supabase, fileId, userId)
    if (!owns) return fail('Accès non autorisé à ce dossier.')

    const { data, error } = await supabase
      .from('customs_file_messages')
      .select(MESSAGE_SELECT)
      .eq('file_id', fileId)
      .eq('is_internal', false)
      .order('created_at', { ascending: true })

    if (error) return fail('Impossible de charger les messages.')
    return ok(mapRows(data, userId))
  }

  if (role === 'PARTNER' || role === 'PARTNER_COUNTRY') {
    const { data: pp, error: ppError } = await supabase
      .from('partner_profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (ppError || !pp) return fail('Profil partenaire introuvable.')

    const { data: assignCheck, error: assignErr } = await supabase
      .from('customs_files')
      .select('id')
      .eq('id', fileId)
      .eq('assigned_partner_id', pp.id)
      .maybeSingle()

    if (assignErr || !assignCheck) {
      return fail("Vous n'êtes pas assigné à ce dossier.")
    }
  }

  const { data, error } = await supabase
    .from('customs_file_messages')
    .select(MESSAGE_SELECT)
    .eq('file_id', fileId)
    .order('created_at', { ascending: true })

  if (error) return fail('Impossible de charger les messages.')
  return ok(mapRows(data, userId))
}
