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
      requestId, 
      service, 
      type, 
      fileUrl, 
      fileName, 
      fileSize, 
      uploadedBy,
      status 
    } = body

    const { data, error } = await supabase
      .from('request_documents')
      .insert({
        request_id: requestId,
        service,
        type,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        uploaded_by: uploadedBy,
        status: status || 'PENDING'
      })
      .select()
      .single()

    if (error) throw error

    // Notify n8n
    await sendToN8N('document_uploaded', {
      requestId,
      documentId: data.id,
      documentType: type,
      fileName,
      service,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Document record creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to record document' },
      { status: 500 }
    )
  }
}
