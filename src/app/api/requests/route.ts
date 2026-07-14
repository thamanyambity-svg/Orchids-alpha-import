import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendToN8N } from '@/lib/webhooks'
import { requireUser, handleApiError } from '@/lib/auth-guard'
import { rateLimit } from '@/lib/rate-limit'

// Validation du corps. `buyer_id` est volontairement ABSENT : il est dérivé de la
// session, jamais accepté depuis le client (anti-spoofing / IDOR).
const createRequestSchema = z.object({
  country_id: z.string().min(1).nullable().optional(),
  buyer_country: z.string().nullable().optional(),
  category: z.string().min(1, 'category requis'),
  product_name: z.string().nullable().optional(),
  specifications: z.record(z.string(), z.unknown()).nullable().optional(),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  budget_min: z.number().nullable().optional(),
  budget_max: z.number().nullable().optional(),
  deadline: z.string().nullable().optional(),
  transport_mode: z.string().nullable().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Authentification requise. Client SSR (RLS) : la policy import_requests_buyer
    // impose buyer_id = auth.uid() à l'insertion (double protection).
    const { supabase, user } = await requireUser()

    // Anti-spam : max 10 créations / minute par utilisateur.
    const rl = rateLimit(`requests:${user.id}`, 10, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const parsed = createRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      country_id,
      buyer_country,
      category,
      product_name,
      specifications,
      quantity,
      unit,
      budget_min,
      budget_max,
      deadline,
      transport_mode,
    } = parsed.data

    // Référence unique : AIX-YYYYMMDD-XXXX
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.floor(1000 + Math.random() * 9000)
    const reference = `AIX-${dateStr}-${random}`

    const { data, error } = await supabase
      .from('import_requests')
      .insert({
        buyer_id: user.id, // <-- dérivé de la session, jamais du body
        country_id,
        buyer_country,
        category,
        product_name,
        transport_mode,
        specifications,
        quantity,
        unit,
        budget_min,
        budget_max,
        deadline,
        status: 'PENDING',
        reference,
      })
      .select()
      .single()

    if (error) throw error

    // Notify n8n
    await sendToN8N('new_request_created', {
      requestId: data.id,
      reference: data.reference,
      productName: data.product_name,
      category: data.category,
      specifications: data.specifications,
      quantity: `${data.quantity} ${data.unit}`,
      budget: `${data.budget_min} - ${data.budget_max}`,
      buyerId: data.buyer_id,
      buyerCountry: data.buyer_country,
      countryId: data.country_id,
      transportMode: data.transport_mode,
      isAutomobile: data.category === 'Automobile & Pièces',
    })

    return NextResponse.json(data)
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
