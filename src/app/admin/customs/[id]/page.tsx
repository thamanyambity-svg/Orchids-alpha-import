import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getCustomsFile } from "@/app/actions/customs/get-customs-file"
import { CustomsStatusUpdater } from "@/components/admin/customs/customs-status-updater"
import { DeclarationForm } from "@/components/admin/customs/declaration-form"
import { TaxLinesEditor } from "@/components/admin/customs/tax-lines-editor"
import type { TaxLineDisplay } from "@/components/admin/customs/tax-lines-editor"
import { DeclarationValidationPanel } from "@/components/admin/customs/declaration-validation-panel"
import { CustomsChat } from "@/components/customs/customs-chat"
import { DownloadReportButton } from "@/components/admin/customs/download-report-button"
import { DownloadInvoiceButton } from "@/components/pdf/download-invoice-button"
import { getCustomsMessages } from "@/app/actions/customs/messaging"
import { getStatusBadgeVariant, getStatusLabel } from "@/lib/customs/status-display"

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

export default async function CustomsFileDetailPage({ params }: Props) {
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

  if (!profile || profile.role !== "ADMIN") redirect("/dashboard")

  const result = await getCustomsFile(id)
  if (!result.success || !result.data) notFound()
  const file = result.data

  const messagesResult = await getCustomsMessages(id)
  const initialMessages = messagesResult.success ? (messagesResult.data ?? []) : []

  const { data: activeInvoice } = await supabase
    .from("customs_invoices")
    .select("id, invoice_number, status")
    .eq("customs_file_id", id)
    .neq("status", "CANCELLED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white">
            Dossier douanier —{" "}
            <code className="text-[#ffd700]">{file.order_id.slice(0, 8).toUpperCase()}</code>
          </h1>
          <Badge variant={getStatusBadgeVariant(file.status)}>
            {getStatusLabel(file.status)}
          </Badge>
        </div>
        <p className="text-sm text-white/50">
          {file.transport_mode === "AIR" && "Transport aérien"}
          {file.transport_mode === "SEA" && "Transport maritime"}
          {file.transport_mode === "LAND" && "Transport terrestre"}
          {file.transport_ref && ` — Réf : ${file.transport_ref}`}
        </p>
      </div>

      <Separator className="bg-white/10" />

      <CustomsStatusUpdater
        customsFileId={file.id}
        currentStatus={file.status}
        userRole="ADMIN"
      />

      <Separator className="bg-white/10" />

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-white">Transport et logistique</CardTitle>
        </CardHeader>
        <CardContent className="text-white/80">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-white/50">Mode</dt>
              <dd>{file.transport_mode ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-white/50">Référence transport</dt>
              <dd>{file.transport_ref ?? "—"}</dd>
            </div>
            {file.vessel_flight_name && (
              <div>
                <dt className="text-white/50">
                  {file.transport_mode === "AIR" ? "Vol" : "Navire"}
                </dt>
                <dd>{file.vessel_flight_name}</dd>
              </div>
            )}
            {file.container_number && (
              <div>
                <dt className="text-white/50">Conteneur</dt>
                <dd>{file.container_number}</dd>
              </div>
            )}
            <div>
              <dt className="text-white/50">Pays</dt>
              <dd>{file.country_code}</dd>
            </div>
            <div>
              <dt className="text-white/50">Partenaire assigné</dt>
              <dd>{file.assigned_partner_name ?? "Non assigné"}</dd>
            </div>
            <div>
              <dt className="text-white/50">Créé le</dt>
              <dd>
                <time dateTime={file.created_at}>{formatDate(file.created_at)}</time>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <DeclarationForm
        customsFileId={file.id}
        existingDeclaration={
          file.declaration
            ? {
                id: file.declaration.id,
                declared_value_usd: file.declaration.declared_value_usd,
                declaration_number: file.declaration.declaration_number,
                notes: file.declaration.notes,
                is_fiscal_validated: file.declaration.is_fiscal_validated,
              }
            : null
        }
      />

      {file.declaration && (
        <>
          <TaxLinesEditor
            declarationId={file.declaration.id}
            initialLines={file.declaration.tax_lines.map(
              (l): TaxLineDisplay => ({
                id: l.id,
                tax_type_id: l.tax_type_id,
                tax_type_label: l.tax_type_label,
                tax_type_code: l.tax_type_code,
                base_amount_usd: l.base_amount_usd,
                rate_percent: l.rate_percent,
                final_amount_usd: l.final_amount_usd,
                notes: l.notes,
              })
            )}
            totalTaxes={file.declaration.total_taxes_usd}
            isLocked={file.declaration.is_fiscal_validated}
          />

          <DeclarationValidationPanel
            declarationId={file.declaration.id}
            isFiscalValidated={file.declaration.is_fiscal_validated}
            fiscalValidatedByName={file.declaration.fiscal_validated_by_name}
            fiscalValidatedAt={file.declaration.fiscal_validated_at}
            isAccountingValidated={file.declaration.is_accounting_validated}
            accountingValidatedByName={
              file.declaration.accounting_validated_by_name
            }
            accountingValidatedAt={file.declaration.accounting_validated_at}
            actorRole={profile.role}
          />
        </>
      )}

      {file.status_history.length > 0 && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Historique du dossier</CardTitle>
            <CardDescription className="text-white/50">
              Boîte noire — immuable
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol
              className="space-y-4 list-decimal list-inside text-sm text-white/80"
              aria-label="Historique des changements de statut"
            >
              {file.status_history.map((entry) => (
                <li key={entry.id} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={getStatusBadgeVariant(entry.status_from ?? "DRAFT")}
                    >
                      {getStatusLabel(entry.status_from ?? "—")}
                    </Badge>
                    <span aria-hidden="true">→</span>
                    <Badge variant={getStatusBadgeVariant(entry.status_to)}>
                      {getStatusLabel(entry.status_to)}
                    </Badge>
                  </div>
                  <div>
                    <time dateTime={entry.changed_at}>{formatDate(entry.changed_at)}</time>
                    {entry.changer_name && <span> par {entry.changer_name}</span>}
                  </div>
                  {entry.reason && <p className="text-white/60">Motif : {entry.reason}</p>}
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
        cardClassName="border-white/10 bg-white/5"
        descriptionClassName="text-white/50"
        inverseBubbles
      />

      <div className="flex flex-wrap items-center gap-3">
        <DownloadReportButton fileId={file.id} variant="outline" />
        {activeInvoice ? (
          <DownloadInvoiceButton invoiceId={activeInvoice.id} variant="default" />
        ) : null}
      </div>
    </div>
  )
}
