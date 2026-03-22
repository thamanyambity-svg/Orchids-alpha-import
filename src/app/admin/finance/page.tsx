import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Separator } from '@/components/ui/separator'
import { getFinanceDashboardData } from '@/app/actions/finance/get-dashboard-data'
import { FinanceDashboard } from '@/components/admin/finance/finance-dashboard'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dashboard Finance — Admin Alpha Import' }

export default async function FinancePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'ADMIN') redirect('/dashboard')

  const initialResult = await getFinanceDashboardData({ preset: '30d' })

  return (
    <div className="p-8 space-y-6 max-w-6xl text-white">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Dashboard Finance</h1>
        <p className="text-sm text-white/60">
          Pilotage financier des opérations douanières Alpha Import.
        </p>
      </div>
      <Separator className="bg-white/10" />
      {!initialResult.success ? (
        <p className="text-destructive" role="alert">
          {initialResult.error}
        </p>
      ) : null}
      <FinanceDashboard initialData={initialResult.success ? initialResult.data : null} />
    </div>
  )
}
