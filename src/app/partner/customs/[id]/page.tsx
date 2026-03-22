import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getCustomsFile } from "@/app/actions/customs/get-customs-file"
import { CustomsStatusUpdater } from "@/components/admin/customs/customs-status-updater"
import { DashboardHeader } from "@/components/dashboard/header"
import { getStatusBadgeVariant, getStatusLabel } from "@/lib/customs/status-display"
import { CustomsChat } from "@/components/customs/customs-chat"
import { getCustomsMessages } from "@/app/actions/customs/messaging"

export const dynamic = "force-dynamic"

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

type Props = { params: Promise<{ id: string }> }

export default async function PartnerCustomsFileDetailPage({ params }: Props) {
  const { id } = await params

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

  const result = await getCustomsFile(id)
  if (!result.success || !result.data) notFound()
  const file = result.data

  const messagesResult = await getCustomsMessages(id)
  const initialMessages = messagesResult.success ? (messagesResult.data ?? []) : []

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Dossier douanier" />
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            Dossier —{" "}
            <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
              {file.order_id.slice(0, 8).toUpperCase()}
            </code>
          </h1>
          <Badge variant={getStatusBadgeVariant(file.status)}>
            {getStatusLabel(file.status)}
          </Badge>
        </div>

        <Separator />

        <CustomsStatusUpdater
          customsFileId={file.id}
          currentStatus={file.status}
          userRole="PARTNER"
        />

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle>Transport</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Mode</dt>
                <dd className="font-medium">{file.transport_mode ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Référence</dt>
                <dd className="font-medium">{file.transport_ref ?? "—"}</dd>
              </div>
              {file.vessel_flight_name && (
                <div>
                  <dt className="text-muted-foreground">
                    {file.transport_mode === "AIR" ? "Vol" : "Navire"}
                  </dt>
                  <dd className="font-medium">{file.vessel_flight_name}</dd>
                </div>
              )}
              {file.container_number && (
                <div>
                  <dt className="text-muted-foreground">Conteneur</dt>
                  <dd className="font-medium">{file.container_number}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {file.status_history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Historique du dossier</CardTitle>
            </CardHeader>
            <CardContent>
              <ol
                className="space-y-4 list-decimal list-inside text-sm"
                aria-label="Historique des statuts"
              >
                {file.status_history.map((entry) => (
                  <li key={entry.id} className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={getStatusBadgeVariant(
                          entry.status_from ?? "DRAFT"
                        )}
                      >
                        {getStatusLabel(entry.status_from ?? "—")}
                      </Badge>
                      <span aria-hidden="true">→</span>
                      <Badge variant={getStatusBadgeVariant(entry.status_to)}>
                        {getStatusLabel(entry.status_to)}
                      </Badge>
                    </div>
                    <time dateTime={entry.changed_at} className="text-muted-foreground">
                      {formatDate(entry.changed_at)}
                    </time>
                    {entry.reason && (
                      <p className="text-muted-foreground">Motif : {entry.reason}</p>
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        <CustomsChat
          key={file.id}
          fileId={file.id}
          currentUserId={user.id}
          currentUserRole={profile.role}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  )
}
