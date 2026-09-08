import { NextResponse } from 'next/server'
import { requireUser, handleApiError } from '@/lib/auth-guard'

/** Nomenclature des taxes douanières, pour alimenter les formulaires. */
export async function GET() {
  try {
    const { supabase } = await requireUser()

    const { data, error } = await supabase
      .from('customs_tax_types')
      .select('id, code, label, description, default_rate_percent')
      .eq('is_active', true)
      .order('code', { ascending: true })

    if (error) {
      console.error('[GET /api/customs/tax-types]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tax_types: data ?? [] })
  } catch (error) {
    return handleApiError(error)
  }
}
