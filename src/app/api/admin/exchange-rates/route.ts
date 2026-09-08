import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, handleApiError } from '@/lib/auth-guard'
import { logAudit } from '@/lib/audit'

/**
 * La base est fixée à l'USD : tous les montants du produit sont libellés en USD,
 * et un taux se lit toujours « 1 USD = rate <devise> ». Autoriser une autre base
 * ouvrirait la porte à deux taux réciproques incohérents pour la même paire.
 */
const BASE_CURRENCY = 'USD'
const MAX_HISTORY = 100

const createRateSchema = z.object({
  to_currency: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase())
    .refine((value) => value !== BASE_CURRENCY, {
      message: 'La devise cible ne peut pas être USD, qui est la base',
    }),
  rate: z.coerce.number().positive('Le taux doit être strictement positif'),
  notes: z.string().max(500).optional(),
  effective_at: z.string().datetime().optional(),
})

/**
 * Historique des taux, du plus récent au plus ancien.
 *
 * Le taux en vigueur pour une paire est celui dont `superseded_at` est nul : c'est
 * le trigger `trg_supersede_exchange_rate` qui l'entretient, une seule ligne par
 * paire peut donc être active à un instant donné.
 */
export async function GET() {
  try {
    const { supabase } = await requireRole(['ADMIN'])

    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .order('effective_at', { ascending: false })
      .limit(MAX_HISTORY)

    if (error) {
      console.error('[GET /api/admin/exchange-rates]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rates = data ?? []

    return NextResponse.json({
      rates,
      active: rates.filter((rate) => rate.superseded_at === null),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * Publication d'un nouveau taux. Le précédent de la même paire est basculé en
 * SUPERSEDED par le trigger, pas par cette route : la règle reste vraie même si
 * une ligne est insérée par un autre chemin.
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireRole(['ADMIN'])

    const parsed = createRateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('exchange_rates')
      .insert({
        from_currency: BASE_CURRENCY,
        to_currency: parsed.data.to_currency,
        rate: parsed.data.rate,
        notes: parsed.data.notes ?? null,
        effective_at: parsed.data.effective_at ?? new Date().toISOString(),
        set_by: user.id,
        created_by: user.id,
        status: 'ACTIVE',
      })
      .select('id, from_currency, to_currency, rate, effective_at')
      .single()

    if (error) {
      console.error('[POST /api/admin/exchange-rates]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAudit({
      action: 'EXCHANGE_RATE_PUBLISHED',
      targetType: 'exchange_rate',
      targetId: data.id,
      actorId: user.id,
      details: { pair: `${BASE_CURRENCY}/${parsed.data.to_currency}`, rate: parsed.data.rate },
    })

    return NextResponse.json({ rate: data }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
