'use server'

import { requireAdmin } from '@/lib/server-actions/admin-guard'
import { fail, ok, type ServerActionResult } from '@/lib/server-actions/result'

export type DocumentAccessLogRow = {
  id: string
  admin_id: string
  action: string
  document_type: string
  document_id: string
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, unknown>
  created_at: string
  accessor_email?: string | null
  accessor_name?: string | null
}

export type AuditLogStats = {
  total24h: number
  signedUrls24h: number
  uniqueAdmins24h: number
}

export async function getDocumentAccessLogs(params: {
  page?: number
  pageSize?: number
  documentType?: string
  action?: string
  emailSearch?: string
  dateFrom?: string
  dateTo?: string
}): Promise<
  ServerActionResult<{ rows: DocumentAccessLogRow[]; total: number }>
> {
  const gate = await requireAdmin()
  if (!gate.success) return gate

  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 15))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { supabase } = gate.data

  let adminIds: string[] | null = null
  if (params.emailSearch?.trim()) {
    const q = params.emailSearch.trim()
    const { data: profs } = await supabase
      .from('profiles')
      .select('id')
      .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
      .eq('role', 'ADMIN')
      .limit(200)
    adminIds = profs?.map((p) => p.id) ?? []
    if (adminIds.length === 0) {
      return ok({ rows: [], total: 0 })
    }
  }

  let query = supabase
    .from('document_access_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (adminIds) {
    query = query.in('admin_id', adminIds)
  }
  if (params.documentType?.trim()) {
    query = query.eq('document_type', params.documentType.trim())
  }
  if (params.action?.trim()) {
    query = query.eq('action', params.action.trim())
  }
  if (params.dateFrom) {
    query = query.gte('created_at', params.dateFrom)
  }
  if (params.dateTo) {
    query = query.lte('created_at', params.dateTo)
  }

  const { data, error, count } = await query.range(from, to)

  if (error) {
    console.error('[getDocumentAccessLogs]', error)
    return fail(error.message)
  }

  const raw = (data ?? []) as Omit<
    DocumentAccessLogRow,
    'accessor_email' | 'accessor_name'
  >[]
  const logAdminIds = [...new Set(raw.map((r) => r.admin_id))]
  const { data: profs } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', logAdminIds)

  const pmap = new Map(
    profs?.map((p) => [p.id, { email: p.email, full_name: p.full_name }]) ?? []
  )
  const rows: DocumentAccessLogRow[] = raw.map((r) => {
    const p = pmap.get(r.admin_id)
    return {
      ...r,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      accessor_email: p?.email ?? null,
      accessor_name: p?.full_name ?? null,
    }
  })

  return ok({
    rows,
    total: count ?? 0,
  })
}

export async function getAuditLogStats(): Promise<
  ServerActionResult<AuditLogStats>
> {
  const gate = await requireAdmin()
  if (!gate.success) return gate

  const { supabase } = gate.data
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: logs, error } = await supabase
    .from('document_access_logs')
    .select('id, admin_id, action, created_at')
    .gte('created_at', since)

  if (error) {
    console.error('[getAuditLogStats]', error)
    return fail(error.message)
  }

  const list = logs ?? []
  const signedUrls24h = list.filter((l) => l.action === 'SIGNED_URL_GENERATED')
    .length
  const uniqueAdmins = new Set(list.map((l) => l.admin_id)).size

  return ok({
    total24h: list.length,
    signedUrls24h,
    uniqueAdmins24h: uniqueAdmins,
  })
}
