'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/server-actions/admin-guard'
import { fail, ok, type ServerActionResult } from '@/lib/server-actions/result'

const createSchema = z.object({
  toCurrency: z
    .string()
    .min(3)
    .max(8)
    .regex(/^[A-Z]{3,8}$/i, 'Code devise ISO (3–8 lettres)'),
  rate: z.coerce.number().positive('Le taux doit être > 0'),
  notes: z.string().max(500).optional().nullable(),
  effectiveAt: z.string().datetime().optional(),
})

export type ExchangeRateRow = {
  id: string
  from_currency: string
  to_currency: string
  rate: number
  effective_at: string
  notes: string | null
  created_at: string
}

export async function createExchangeRate(
  raw: z.infer<typeof createSchema>
): Promise<ServerActionResult<{ id: string }>> {
  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Données invalides')
  }

  const gate = await requireAdmin()
  if (!gate.success) return gate

  const { supabase, userId } = gate.data
  const to = parsed.data.toCurrency.toUpperCase()
  if (to === 'USD') {
    return fail('La devise cible ne peut pas être USD (base fixe USD).')
  }

  const effectiveAt = parsed.data.effectiveAt ?? new Date().toISOString()

  const { data, error } = await supabase
    .from('exchange_rates')
    .insert({
      from_currency: 'USD',
      to_currency: to,
      rate: parsed.data.rate,
      notes: parsed.data.notes ?? null,
      effective_at: effectiveAt,
      created_by: userId,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createExchangeRate]', error)
    return fail(error.message || 'Erreur en base')
  }

  revalidatePath('/admin/exchange-rates')
  return ok({ id: data.id })
}

export async function getActiveExchangeRate(
  toCurrency: string
): Promise<ServerActionResult<ExchangeRateRow | null>> {
  const gate = await requireAdmin()
  if (!gate.success) return gate

  const to = toCurrency.trim().toUpperCase()
  const { supabase } = gate.data

  const { data, error } = await supabase
    .from('exchange_rates')
    .select('*')
    .eq('from_currency', 'USD')
    .eq('to_currency', to)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[getActiveExchangeRate]', error)
    return fail(error.message)
  }

  return ok(data as ExchangeRateRow | null)
}

export async function getExchangeRateHistory(params: {
  page?: number
  pageSize?: number
  toCurrency?: string
}): Promise<
  ServerActionResult<{ rows: ExchangeRateRow[]; total: number }>
> {
  const gate = await requireAdmin()
  if (!gate.success) return gate

  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 20))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { supabase } = gate.data

  let query = supabase
    .from('exchange_rates')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (params.toCurrency?.trim()) {
    query = query.eq('to_currency', params.toCurrency.trim().toUpperCase())
  }

  const { data, error, count } = await query.range(from, to)

  if (error) {
    console.error('[getExchangeRateHistory]', error)
    return fail(error.message)
  }

  return ok({
    rows: (data ?? []) as ExchangeRateRow[],
    total: count ?? 0,
  })
}
