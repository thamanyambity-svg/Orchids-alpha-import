import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Separator } from "@/components/ui/separator"
import { getCustomsFiles } from "@/app/actions/customs/get-customs-file"
import { CustomsListClient } from "@/components/admin/customs/customs-list-client"
import { DashboardHeader } from "@/components/dashboard/header"
import { Ship } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Mes dossiers douaniers — Alpha Import",
}

export default async function PartnerCustomsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || !["PARTNER", "PARTNER_COUNTRY"].includes(profile.role)) {
    redirect("/partner")
  }

  const { data: partnerProfile } = await supabase
    .from("partner_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  const initialResult = await getCustomsFiles(
    partnerProfile?.id ? { partner_id: partnerProfile.id } : {},
    1,
    20
  )
  const initialData = initialResult.success ? initialResult.data : null

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Mes dossiers douaniers" />
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Ship className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Mes dossiers douaniers
            </h1>
            <p className="text-sm text-muted-foreground">
              Dossiers de dédouanement qui vous sont assignés.
            </p>
          </div>
        </div>

        <Separator />

        {!initialResult.success && (
          <p className="text-sm text-destructive" role="alert">
            {initialResult.error}
          </p>
        )}

        <CustomsListClient
          initialFiles={initialData?.files ?? []}
          initialTotal={initialData?.total ?? 0}
          initialTotalPages={initialData?.totalPages ?? 0}
          detailBasePath="/partner/customs"
        />
      </div>
    </div>
  )
}
