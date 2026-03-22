'use server'

import { createClient } from '@supabase/supabase-js'
import { ok, fail } from '@/lib/server-actions/result'
import type { ServerActionResult } from '@/lib/server-actions/result'
import { normalizeCustomsActorRole } from '@/lib/customs/transition-matrix'
import {
  requireCustomsRole,
  verifyCustomsFileAccess,
} from '@/lib/server-actions/customs-guard'
import type { CustomsFileStatus } from '@/lib/customs/types'

export type { CustomsFileStatus } from '@/lib/customs/types'

export interface TaxLineDetail {
  id: string
  tax_type_id: string
  tax_type_code: string
  tax_type_label: string
  base_amount_usd: number
  rate_percent: number | null
  computed_amount_usd: number
  final_amount_usd: number
  override_reason: string | null
  /** Notes libres (Sprint 3) ou équivalent métier */
  notes: string | null
  set_by_name: string | null
  created_at: string
}

export interface DeclarationDetail {
  id: string
  declaration_number: string | null
  declared_value_usd: number
  notes: string | null
  is_fiscal_validated: boolean
  fiscal_validated_by_name: string | null
  fiscal_validated_at: string | null
  is_accounting_validated: boolean
  accounting_validated_by_name: string | null
  accounting_validated_at: string | null
  tax_lines: TaxLineDetail[]
  total_taxes_usd: number
  created_at: string
}

export interface StatusHistoryEntry {
  id: string
  status_from: string | null
  status_to: string
  changed_by: string
  changer_name: string | null
  reason: string | null
  changed_at: string
  ip_address: string | null
}

export interface CustomsFileDetail {
  id: string
  order_id: string
  request_id: string
  country_code: string
  transport_mode: string | null
  transport_ref: string | null
  vessel_flight_name: string | null
  container_number: string | null
  status: CustomsFileStatus
  assigned_partner_id: string | null
  assigned_partner_name: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  declaration: DeclarationDetail | null
  status_history: StatusHistoryEntry[]
}

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Configuration serveur Supabase incomplète.')
  }
  return createClient(url, key)
}

async function resolvePartnerDisplayName(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  partnerProfileId: string | null
): Promise<string | null> {
  if (!partnerProfileId) return null
  const { data: pp } = await admin
    .from('partner_profiles')
    .select('user_id')
    .eq('id', partnerProfileId)
    .maybeSingle()
  if (!pp?.user_id) return null
  const { data: prof } = await admin
    .from('profiles')
    .select('full_name, email')
    .eq('id', pp.user_id)
    .maybeSingle()
  return prof?.full_name ?? prof?.email ?? null
}

export async function getCustomsFile(
  customsFileId: string
): Promise<ServerActionResult<CustomsFileDetail>> {
  try {
    const user = await requireCustomsRole()

    if (!customsFileId?.trim()) {
      return fail('Identifiant de dossier manquant.')
    }

    await verifyCustomsFileAccess(customsFileId, user)

    const supabaseAdmin = createSupabaseAdminClient()

    const { data: file, error: fileError } = await supabaseAdmin
      .from('customs_files')
      .select(
        `
        id,
        order_id,
        request_id,
        country_code,
        transport_mode,
        transport_ref,
        vessel_flight_name,
        container_number,
        status,
        assigned_partner_id,
        created_by,
        created_at,
        updated_at
      `
      )
      .eq('id', customsFileId)
      .single()

    if (fileError || !file) {
      return fail('Dossier douanier introuvable.')
    }

    const assigned_partner_name = await resolvePartnerDisplayName(
      supabaseAdmin,
      file.assigned_partner_id
    )

    const [declarationResult, historyResult] = await Promise.all([
      supabaseAdmin
        .from('customs_declarations')
        .select(
          `
          id,
          declaration_number,
          declared_value_usd,
          notes,
          total_taxes_usd,
          is_fiscal_validated,
          fiscal_validated_at,
          is_accounting_validated,
          accounting_validated_at,
          fiscal_validator:profiles!fiscal_validated_by (full_name, email),
          accounting_validator:profiles!accounting_validated_by (full_name, email),
          created_at
        `
        )
        .eq('customs_file_id', customsFileId)
        .maybeSingle(),

      supabaseAdmin
        .from('customs_status_history')
        .select(
          `
          id,
          status_from,
          status_to,
          changed_by,
          reason,
          changed_at,
          ip_address,
          changer:profiles!changed_by (full_name, email)
        `
        )
        .eq('customs_file_id', customsFileId)
        .order('changed_at', { ascending: false }),
    ])

    let taxLines: TaxLineDetail[] = []
    let totalTaxesUsd = 0

    const decl = declarationResult.data

    if (decl) {
      const { data: lines, error: linesError } = await supabaseAdmin
        .from('customs_tax_lines')
        .select(
          `
          id,
          tax_type_id,
          base_amount_usd,
          rate_percent,
          computed_amount_usd,
          final_amount_usd,
          override_reason,
          notes,
          created_at,
          tax_type:customs_tax_types!tax_type_id (code, label),
          setter:profiles!set_by (full_name, email)
        `
        )
        .eq('declaration_id', decl.id)
        .order('created_at', { ascending: true })

      if (!linesError && lines) {
        taxLines = lines.map((line: Record<string, unknown>) => {
          const taxType = line.tax_type as
            | { code?: string; label?: string }
            | null
            | undefined
          const setter = line.setter as
            | { full_name?: string | null; email?: string | null }
            | null
            | undefined
          const notesLine =
            (line.notes as string | null | undefined) ??
            (line.override_reason as string | null) ??
            null
          return {
            id: line.id as string,
            tax_type_id: line.tax_type_id as string,
            tax_type_code: taxType?.code ?? 'INCONNU',
            tax_type_label: taxType?.label ?? 'Taxe inconnue',
            base_amount_usd: Number(line.base_amount_usd),
            rate_percent:
              line.rate_percent != null ? Number(line.rate_percent) : null,
            computed_amount_usd: Number(line.computed_amount_usd),
            final_amount_usd: Number(line.final_amount_usd),
            override_reason: (line.override_reason as string | null) ?? null,
            notes: notesLine,
            set_by_name:
              setter?.full_name ?? setter?.email ?? null,
            created_at: line.created_at as string,
          }
        })

        const dbTotal = decl.total_taxes_usd
        totalTaxesUsd =
          dbTotal != null && !Number.isNaN(Number(dbTotal))
            ? Math.round(Number(dbTotal) * 100) / 100
            : Math.round(
                taxLines.reduce((sum, line) => sum + line.final_amount_usd, 0) *
                  100
              ) / 100
      }
    }

    const fiscalVal = decl?.fiscal_validator as
      | { full_name?: string | null; email?: string | null }
      | null
      | undefined
    const accVal = decl?.accounting_validator as
      | { full_name?: string | null; email?: string | null }
      | null
      | undefined

    const declaration: DeclarationDetail | null = decl
      ? {
          id: decl.id,
          declaration_number: decl.declaration_number,
          declared_value_usd: Number(decl.declared_value_usd),
          notes: (decl.notes as string | null) ?? null,
          is_fiscal_validated: decl.is_fiscal_validated,
          fiscal_validated_by_name:
            fiscalVal?.full_name ?? fiscalVal?.email ?? null,
          fiscal_validated_at: decl.fiscal_validated_at,
          is_accounting_validated: decl.is_accounting_validated,
          accounting_validated_by_name:
            accVal?.full_name ?? accVal?.email ?? null,
          accounting_validated_at: decl.accounting_validated_at,
          tax_lines: taxLines,
          total_taxes_usd: totalTaxesUsd,
          created_at: decl.created_at,
        }
      : null

    const statusHistory: StatusHistoryEntry[] = (
      historyResult.data ?? []
    ).map((entry: Record<string, unknown>) => {
      const changer = entry.changer as
        | { full_name?: string | null; email?: string | null }
        | null
        | undefined
      return {
        id: entry.id as string,
        status_from: (entry.status_from as string | null) ?? null,
        status_to: entry.status_to as string,
        changed_by: entry.changed_by as string,
        changer_name: changer?.full_name ?? changer?.email ?? null,
        reason: (entry.reason as string | null) ?? null,
        changed_at: entry.changed_at as string,
        ip_address: (entry.ip_address as string | null) ?? null,
      }
    })

    const result: CustomsFileDetail = {
      id: file.id,
      order_id: file.order_id,
      request_id: file.request_id,
      country_code: file.country_code,
      transport_mode: file.transport_mode,
      transport_ref: file.transport_ref,
      vessel_flight_name: file.vessel_flight_name,
      container_number: file.container_number,
      status: file.status as CustomsFileStatus,
      assigned_partner_id: file.assigned_partner_id,
      assigned_partner_name,
      created_by: file.created_by,
      created_at: file.created_at,
      updated_at: file.updated_at,
      declaration,
      status_history: statusHistory,
    }

    return ok(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.'
    console.error('[getCustomsFile]', message)
    return fail(message)
  }
}

export interface CustomsFileListItem {
  id: string
  order_id: string
  status: CustomsFileStatus
  transport_mode: string | null
  transport_ref: string | null
  country_code: string
  assigned_partner_name: string | null
  created_at: string
  updated_at: string
}

export interface GetCustomsFilesFilters {
  status?: CustomsFileStatus | 'ALL'
  transport_mode?: 'AIR' | 'SEA' | 'LAND' | 'ALL'
  partner_id?: string
}

export async function getCustomsFiles(
  filters: GetCustomsFilesFilters = {},
  page = 1,
  pageSize = 20
): Promise<
  ServerActionResult<{
    files: CustomsFileListItem[]
    total: number
    totalPages: number
  }>
> {
  try {
    const user = await requireCustomsRole()
    const supabaseAdmin = createSupabaseAdminClient()

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let partnerScopeId: string | null = null
    if (normalizeCustomsActorRole(user.role) === 'PARTNER_COUNTRY') {
      const { data: pp } = await supabaseAdmin
        .from('partner_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      partnerScopeId = pp?.id ?? null
      if (!partnerScopeId) {
        return ok({ files: [], total: 0, totalPages: 0 })
      }
    }

    let query = supabaseAdmin
      .from('customs_files')
      .select(
        `
        id,
        order_id,
        status,
        transport_mode,
        transport_ref,
        country_code,
        assigned_partner_id,
        created_at,
        updated_at
      `,
        { count: 'exact' }
      )

    if (partnerScopeId) {
      query = query.eq('assigned_partner_id', partnerScopeId)
    }

    if (filters.status && filters.status !== 'ALL') {
      query = query.eq('status', filters.status)
    }
    if (filters.transport_mode && filters.transport_mode !== 'ALL') {
      query = query.eq('transport_mode', filters.transport_mode)
    }
    if (filters.partner_id) {
      query = query.eq('assigned_partner_id', filters.partner_id)
    }

    const { data, error, count } = await query
      .order('updated_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('[getCustomsFiles]', error)
      return fail('Impossible de charger la liste des dossiers douaniers.')
    }

    const rows = data ?? []
    const files: CustomsFileListItem[] = await Promise.all(
      rows.map(async (f: Record<string, unknown>) => {
        const name = await resolvePartnerDisplayName(
          supabaseAdmin,
          f.assigned_partner_id as string | null
        )
        return {
          id: f.id as string,
          order_id: f.order_id as string,
          status: f.status as CustomsFileStatus,
          transport_mode: f.transport_mode as string | null,
          transport_ref: f.transport_ref as string | null,
          country_code: f.country_code as string,
          assigned_partner_name: name,
          created_at: f.created_at as string,
          updated_at: f.updated_at as string,
        }
      })
    )

    const total = count ?? 0
    const totalPages = Math.ceil(total / pageSize) || 0

    return ok({ files, total, totalPages })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.'
    console.error('[getCustomsFiles]', message)
    return fail(message)
  }
}
