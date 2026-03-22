/**
 * CustomsReportTemplate — récapitulatif dossier douanier (PDF @react-pdf/renderer)
 */

import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { CustomsReportData } from '@/lib/pdf/customs-report-types'
import {
  STATUS_LABELS,
  TRANSPORT_LABELS,
  TRANSPORT_REF_LABELS,
} from '@/lib/pdf/customs-report-types'
import { COMPANY_INFO } from '@/lib/pdf/invoice-pdf-types'

const C = {
  dark: '#1A1A1A',
  mid: '#4A4A4A',
  muted: '#6B7280',
  light: '#E5E7EB',
  lighter: '#F3F4F6',
  white: '#FFFFFF',
  accent: '#1D4ED8',
  accentLight: '#DBEAFE',
  success: '#065F46',
  successBg: '#D1FAE5',
  warning: '#92400E',
  warningBg: '#FEF3C7',
  danger: '#991B1B',
  dangerBg: '#FEE2E2',
  gold: '#B45309',
  goldBg: '#FEF3C7',
} as const

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.dark,
    paddingTop: 40,
    paddingBottom: 60,
    paddingLeft: 48,
    paddingRight: 48,
    backgroundColor: C.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: C.accent,
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
    marginBottom: 2,
  },
  companySubtitle: {
    fontSize: 7.5,
    color: C.muted,
    marginBottom: 6,
  },
  companyDetail: {
    fontSize: 8,
    color: C.mid,
    marginBottom: 2,
  },
  docTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    marginBottom: 4,
    textAlign: 'right',
  },
  docRef: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
    textAlign: 'right',
    marginBottom: 4,
  },
  docDate: {
    fontSize: 8,
    color: C.muted,
    textAlign: 'right',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: C.light,
  },
  row2: { flexDirection: 'row', marginBottom: 12 },
  col2: { flex: 1 },
  colRight: { flex: 1, paddingLeft: 12 },
  field: { marginBottom: 5 },
  fieldLabel: {
    fontSize: 7.5,
    color: C.muted,
    marginBottom: 1,
  },
  fieldValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
  },
  fieldValueNormal: {
    fontSize: 8.5,
    color: C.dark,
  },
  timeline: { marginBottom: 4 },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.lighter,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 2,
    marginRight: 8,
    flexShrink: 0,
  },
  timelineContent: { flex: 1 },
  timelineTransition: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    marginBottom: 1,
  },
  timelineDate: {
    fontSize: 7.5,
    color: C.muted,
  },
  timelineReason: {
    fontSize: 7.5,
    color: C.mid,
    marginTop: 2,
  },
  table: { marginBottom: 8 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.accent,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.light,
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: C.lighter,
    borderBottomWidth: 1,
    borderBottomColor: C.light,
  },
  tableFooter: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: C.accentLight,
    borderTopWidth: 1.5,
    borderTopColor: C.accent,
  },
  thText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
  },
  tdText: { fontSize: 8, color: C.dark },
  tdBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.dark },
  colCode: { flex: 1.5 },
  colLabel: { flex: 3 },
  colBase: { flex: 1.8, textAlign: 'right' },
  colRate: { flex: 1.2, textAlign: 'right' },
  colTotal: { flex: 1.8, textAlign: 'right' },
  validationBox: {
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  validationTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  validationDetail: {
    fontSize: 8,
    color: C.mid,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: C.light,
    paddingTop: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  footerText: {
    fontSize: 7,
    color: C.muted,
  },
  footerBold: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.muted,
  },
  footerMention: {
    fontSize: 6.5,
    color: C.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: C.light,
    marginVertical: 10,
  },
})

function fmtUSD(amount: number): string {
  return (
    amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' USD'
  )
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}

function fmtDateTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function statusDotColor(status: string): string {
  switch (status) {
    case 'RELEASED':
      return C.success
    case 'PAID':
    case 'LIQUIDATED':
      return C.accent
    case 'IN_CUSTOMS':
    case 'PRE_ADVICE':
      return C.gold
    case 'BLOCKED':
      return C.danger
    default:
      return C.muted
  }
}

function statusBadgeColors(status: string): { bg: string; color: string } {
  switch (status) {
    case 'RELEASED':
      return { bg: C.successBg, color: C.success }
    case 'PAID':
    case 'LIQUIDATED':
      return { bg: C.accentLight, color: C.accent }
    case 'BLOCKED':
      return { bg: C.dangerBg, color: C.danger }
    case 'IN_CUSTOMS':
    case 'PRE_ADVICE':
      return { bg: C.goldBg, color: C.gold }
    default:
      return { bg: C.lighter, color: C.muted }
  }
}

function Field({
  label,
  value,
  bold = false,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={bold ? s.fieldValue : s.fieldValueNormal}>{value}</Text>
    </View>
  )
}

function ValidationBlock({
  title,
  isValidated,
  validatedBy,
  validatedAt,
  pendingMessage,
}: {
  title: string
  isValidated: boolean
  validatedBy: string | null
  validatedAt: string | null
  pendingMessage: string
}) {
  const boxStyle = isValidated
    ? { ...s.validationBox, borderLeftColor: C.success, backgroundColor: C.successBg }
    : { ...s.validationBox, borderLeftColor: C.muted, backgroundColor: C.lighter }

  return (
    <View style={boxStyle}>
      <Text style={[s.validationTitle, { color: isValidated ? C.success : C.muted }]}>
        {isValidated ? '✓ ' : '○ '}
        {title}
      </Text>
      {isValidated ? (
        <Text style={s.validationDetail}>
          Par : {validatedBy ?? '—'}
          {validatedAt ? `  |  Le : ${fmtDateTime(validatedAt)}` : ''}
        </Text>
      ) : (
        <Text style={s.validationDetail}>{pendingMessage}</Text>
      )}
    </View>
  )
}

export function CustomsReportTemplate({ data }: { data: CustomsReportData }) {
  const badgeColors = statusBadgeColors(data.status)
  const transportMode = data.transport_mode ?? 'SEA'

  return (
    <Document
      title={`Rapport douanier — ${data.file_ref} — Alpha Import Exchange`}
      author="Alpha Import Exchange"
      subject="Récapitulatif dossier douanier DGDA"
      creator="Alpha Import Exchange — Système douanier"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.companyName}>{COMPANY_INFO.name}</Text>
            <Text style={s.companySubtitle}>{COMPANY_INFO.subtitle}</Text>
            <Text style={s.companyDetail}>{COMPANY_INFO.address}</Text>
            <Text style={s.companyDetail}>{COMPANY_INFO.email}</Text>
            <Text style={s.companyDetail}>RCCM : {COMPANY_INFO.rccm}</Text>
            <Text style={s.companyDetail}>ID Nat : {COMPANY_INFO.id_nat}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={s.docTitle}>RÉCAPITULATIF DOUANIER</Text>
            <Text style={s.docRef}>REF-{data.file_ref}</Text>
            <Text style={s.docDate}>Généré le {fmtDateTime(data.generated_at)}</Text>
            <Text style={s.docDate}>Pays : {data.country_code}</Text>
          </View>
        </View>

        <View style={[s.statusBadge, { backgroundColor: badgeColors.bg }]}>
          <Text style={[s.statusBadgeText, { color: badgeColors.color }]}>
            STATUT : {STATUS_LABELS[data.status] ?? data.status}
          </Text>
        </View>

        <View style={s.row2}>
          <View style={s.col2}>
            <Text style={s.sectionTitle}>Transport</Text>
            <Field label="Mode" value={TRANSPORT_LABELS[transportMode] ?? transportMode} />
            {data.transport_ref ? (
              <Field
                label={TRANSPORT_REF_LABELS[transportMode] ?? 'Référence'}
                value={data.transport_ref}
                bold
              />
            ) : null}
            {data.vessel_flight_name ? (
              <Field
                label={transportMode === 'AIR' ? 'Numéro de vol' : 'Navire'}
                value={data.vessel_flight_name}
              />
            ) : null}
            {data.container_number ? <Field label="Conteneur" value={data.container_number} /> : null}
            <Field label="Dossier ouvert le" value={fmtDate(data.file_created_at)} />
          </View>

          <View style={s.colRight}>
            <Text style={s.sectionTitle}>Client / Importateur</Text>
            <Field label="Nom" value={data.buyer_name ?? '—'} bold />
            {data.buyer_email ? <Field label="Email" value={data.buyer_email} /> : null}
            {data.order_ref ? <Field label="Référence commande" value={data.order_ref} /> : null}
            {data.declaration_number ? (
              <Field label="N° Déclaration DGDA" value={data.declaration_number} bold />
            ) : null}
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.section}>
          <Text style={s.sectionTitle}>
            Historique du dossier ({data.status_history.length} étape
            {data.status_history.length !== 1 ? 's' : ''})
          </Text>

          {data.status_history.length === 0 ? (
            <Text style={s.fieldValueNormal}>Aucun changement de statut enregistré.</Text>
          ) : (
            <View style={s.timeline}>
              {data.status_history.map((entry, i) => (
                <View key={i} style={s.timelineItem}>
                  <View
                    style={[s.timelineDot, { backgroundColor: statusDotColor(entry.status_to) }]}
                  />
                  <View style={s.timelineContent}>
                    <Text style={s.timelineTransition}>
                      {entry.status_from
                        ? `${STATUS_LABELS[entry.status_from] ?? entry.status_from} → `
                        : ''}
                      {STATUS_LABELS[entry.status_to] ?? entry.status_to}
                    </Text>
                    <Text style={s.timelineDate}>
                      {fmtDateTime(entry.changed_at)}
                      {entry.changer_name ? `  |  ${entry.changer_name}` : ''}
                    </Text>
                    {entry.reason ? (
                      <Text style={s.timelineReason}>Motif : {entry.reason}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {data.declared_value_usd != null ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Déclaration DGDA</Text>

            <Field label="Valeur déclarée" value={fmtUSD(data.declared_value_usd)} bold />

            {data.tax_lines.length > 0 ? (
              <View style={s.table}>
                <View style={s.tableHeader}>
                  <Text style={[s.thText, s.colCode]}>Code</Text>
                  <Text style={[s.thText, s.colLabel]}>Taxe</Text>
                  <Text style={[s.thText, s.colBase]}>Base (USD)</Text>
                  <Text style={[s.thText, s.colRate]}>Taux</Text>
                  <Text style={[s.thText, s.colTotal]}>Montant (USD)</Text>
                </View>

                {data.tax_lines.map((line, i) => (
                  <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                    <Text style={[s.tdBold, s.colCode]}>{line.tax_code}</Text>
                    <Text style={[s.tdText, s.colLabel]}>{line.tax_label}</Text>
                    <Text style={[s.tdText, s.colBase]}>{fmtUSD(line.base_amount_usd)}</Text>
                    <Text style={[s.tdText, s.colRate]}>
                      {line.rate_percent != null ? `${line.rate_percent} %` : '—'}
                    </Text>
                    <Text style={[s.tdBold, s.colTotal]}>{fmtUSD(line.final_amount_usd)}</Text>
                  </View>
                ))}

                <View style={s.tableFooter}>
                  <Text style={[s.tdBold, { flex: 7.5 }]}>TOTAL TAXES DGDA</Text>
                  <Text style={[s.tdBold, s.colTotal]}>
                    {data.total_taxes_usd != null ? fmtUSD(data.total_taxes_usd) : '—'}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Validations administratives</Text>
          <View style={s.row2}>
            <View style={s.col2}>
              <ValidationBlock
                title="Validation fiscale"
                isValidated={data.is_fiscal_validated}
                validatedBy={data.fiscal_validated_by}
                validatedAt={data.fiscal_validated_at}
                pendingMessage="En attente de validation par le consultant fiscal"
              />
            </View>
            <View style={s.colRight}>
              <ValidationBlock
                title="Validation comptable"
                isValidated={data.is_accounting_validated}
                validatedBy={data.accounting_validated_by}
                validatedAt={data.accounting_validated_at}
                pendingMessage="En attente — requiert la validation fiscale préalable"
              />
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <View style={s.footerRow}>
            <Text style={s.footerBold}>{COMPANY_INFO.name}</Text>
            <Text style={s.footerText}>Récapitulatif douanier — REF-{data.file_ref}</Text>
            <Text style={s.footerText}>Généré le {fmtDateTime(data.generated_at)}</Text>
          </View>
          <View style={s.footerRow}>
            <Text style={s.footerText}>{COMPANY_INFO.email}</Text>
            <Text style={s.footerText}>
              RCCM : {COMPANY_INFO.rccm} — ID Nat : {COMPANY_INFO.id_nat}
            </Text>
          </View>
          <Text style={s.footerMention}>
            Document officiel généré par le système Alpha Import Exchange. À conserver dans le dossier
            de dédouanement. Valable sans signature conformément aux procédures internes.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
