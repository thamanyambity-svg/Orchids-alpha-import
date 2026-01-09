import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendToN8N } from '@/lib/webhooks'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
      const { 
        buyer_id, 
        country_id, 
        buyer_country,
        category, 
        product_name, 
        specifications, 
        quantity, 
        unit, 
        budget_min, 
        budget_max, 
        deadline 
      } = body


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

      // Notify n8n
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
        isAutomobile: data.category === "Automobile & Pièces"
      })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Request creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create request' },
      { status: 500 }
    )
  }
}
