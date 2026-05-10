import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { sendToN8N } from '@/lib/webhooks'


export async function POST(request: NextRequest) {
  // Vérification de la session — le buyer_id vient de la session, jamais du body
  const supabaseSession = await createClient()
  const { data: { user }, error: authError } = await supabaseSession.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  // Client service-role pour l'insertion (bypass RLS uniquement pour la création)
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
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
      transport_mode
    } = body

    // Le buyer_id est toujours l'utilisateur authentifié, jamais le body
    const buyer_id = user.id


    // Generate a unique reference: AIX-YYYYMMDD-XXXX
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.floor(1000 + Math.random() * 9000)
    const reference = `AIX-${dateStr}-${random}`

    const { data, error } = await supabase
      .from("import_requests")
      .insert({
        buyer_id,
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
        status: "PENDING",
        reference
      })
      .select()
      .single()

    if (error) throw error

    // Notify n8n (non-blocking for the API response)
    try {
      await sendToN8N('new_request_created', {
        requestId: data.id,
        reference: data.reference,
        productName: data.product_name,
        category: data.category,
        specifications: data.specifications, // Includes AI-predicted brand/model
        quantity: `${data.quantity} ${data.unit}`,
        budget: `${data.budget_min} - ${data.budget_max}`,
        buyerId: data.buyer_id,
        buyerCountry: data.buyer_country,
        countryId: data.country_id,
        transportMode: data.transport_mode,
        isAutomobile: data.category === "Automobile & Pièces"
      })
    } catch (n8nError) {
      console.error('N8N notification failed:', n8nError)
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Request creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create request' },
      { status: 500 }
    )
  }
}
