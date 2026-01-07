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
      category, 
      product_name, 
      specifications, 
      quantity, 
      unit, 
      budget_min, 
      budget_max, 
      deadline 
    } = body

    const { data, error } = await supabase
      .from("import_requests")
      .insert({
        buyer_id,
        country_id,
        category,
        product_name,
        specifications,
        quantity,
        unit,
        budget_min,
        budget_max,
        deadline,
        status: "PENDING"
      })
      .select()
      .single()

    if (error) throw error

    // Notify n8n
    await sendToN8N('new_request_created', {
      requestId: data.id,
      productName: data.product_name,
      category: data.category,
      quantity: `${data.quantity} ${data.unit}`,
      budget: `${data.budget_min} - ${data.budget_max}`,
      buyerId: data.buyer_id
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
