/**
 * CustomsInvoiceTemplate — facture douanière (PDF via @react-pdf/renderer).
 */

import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer'
import type { InvoicePdfData, InvoicePdfLineItem } from '@/lib/pdf/invoice-pdf-types'
import { COMPANY_INFO, CURRENCY_LABELS } from '@/lib/pdf/invoice-pdf-types'

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
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: C.accent,
  },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end', flex: 1 },
  companyName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
    marginBottom: 3,
  },
  companySubtitle: {
    fontSize: 7.5,
    color: C.muted,
    marginBottom: 8,
  },
  companyDetail: {
    fontSize: 8,
    color: C.mid,
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    marginBottom: 6,
  },
  invoiceNumber: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
    marginBottom: 4,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 4,
    alignSelf: 'flex-end',
  },
  badgeText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  section: { marginBottom: 16 },
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
  field: { marginBottom: 4 },
  fieldLabel: {
    fontSize: 7.5,
    color: C.muted,
    marginBottom: 1,
  },
  fieldValue: {
    fontSize: 8.5,
    color: C.dark,
    fontFamily: 'Helvetica-Bold',
  },
  fieldValueNormal: {
    fontSize: 8.5,
    color: C.dark,
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
  tdText: {
    fontSize: 8,
    color: C.dark,
  },
  tdBold: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
  },
  colLabel: { flex: 5 },
  colQty: { flex: 1.2, textAlign: 'right' },
  colUnit: { flex: 1.9, textAlign: 'right' },
  colTotal: { flex: 1.9, textAlign: 'right' },
  summaryBox: {
    backgroundColor: C.lighter,
    padding: 12,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1.5,
    borderTopColor: C.accent,
  },
  summaryLabel: {
    fontSize: 9,
    color: C.mid,
  },
  summaryValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
  },
  summaryTotalLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
  },
  summaryTotalValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
  },
  cdfBox: {
    backgroundColor: C.accentLight,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cdfLabel: {
    fontSize: 9,
    color: C.accent,
    flex: 1,
  },
  cdfValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
  },
  cdfRate: {
    fontSize: 7.5,
    color: C.muted,
    marginTop: 2,
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
  footerTextBold: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.muted,
  },
  footerMention: {
    fontSize: 7,
    color: C.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: C.light,
    marginVertical: 12,
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

function fmtLocal(amount: number, currency: string): string {
  return (
    amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) +
    ' ' +
    currency
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

function transportLabel(mode: string | null): string {
  const map: Record<string, string> = {
    AIR: 'Transport aérien',
    SEA: 'Transport maritime',
    LAND: 'Transport terrestre',
  }
  return mode ? (map[mode] ?? mode) : '—'
}

function transportRefLabel(mode: string | null): string {
  if (mode === 'AIR') return 'N° LTA'
  if (mode === 'SEA') return 'N° Connaissement (B/L)'
  if (mode === 'LAND') return 'N° Lettre de voiture'
  return 'Réf. transport'
}

function statusConfig(status: string): { label: string; bg: string; color: string } {
  switch (status) {
    case 'PAID':
      return { label: 'RÉGLÉE', bg: C.successBg, color: C.success }
    case 'SENT':
      return { label: 'ENVOYÉE', bg: C.accentLight, color: C.accent }
    case 'CANCELLED':
      return { label: 'ANNULÉE', bg: C.warningBg, color: C.warning }
    default:
      return { label: 'BROUILLON', bg: C.lighter, color: C.muted }
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

function TableHeader() {
  return (
    <View style={s.tableHeader}>
      <Text style={[s.thText, s.colLabel]}>Description</Text>
      <Text style={[s.thText, s.colQty]}>Qté</Text>
      <Text style={[s.thText, s.colUnit]}>P.U. (USD)</Text>
      <Text style={[s.thText, s.colTotal]}>Total (USD)</Text>
    </View>
  )
}

function TableRow({ item, index }: { item: InvoicePdfLineItem; index: number }) {
  const rowStyle = index % 2 === 0 ? s.tableRow : s.tableRowAlt
  return (
    <View style={rowStyle}>
      <Text style={[s.tdText, s.colLabel]}>{item.label}</Text>
      <Text style={[s.tdText, s.colQty]}>{item.quantity.toFixed(0)}</Text>
      <Text style={[s.tdText, s.colUnit]}>{fmtUSD(item.unit_price_usd)}</Text>
      <Text style={[s.tdBold, s.colTotal]}>{fmtUSD(item.line_total_usd)}</Text>
    </View>
  )
}

function SubtotalRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.tableRow}>
      <Text style={[s.tdText, s.colLabel]}>{''}</Text>
      <Text style={[s.tdBold, { flex: 3.1, textAlign: 'right', fontSize: 8 }]}>{label}</Text>
      <Text style={[s.tdBold, s.colTotal]}>{value}</Text>
    </View>
  )
}

interface CustomsInvoiceTemplateProps {
  data: InvoicePdfData
}

export function CustomsInvoiceTemplate({ data }: CustomsInvoiceTemplateProps) {
  const st = statusConfig(data.status)

  const disbursementItems = data.items.filter((i) => i.item_type === 'DISBURSEMENT')
  const feeItems = data.items.filter((i) => i.item_type !== 'DISBURSEMENT')

  const currencyLabel = CURRENCY_LABELS[data.currency_local] ?? data.currency_local

  return (
    <Document
      title={`Facture ${data.invoice_number} — Alpha Import Exchange`}
      author="Alpha Import Exchange"
      subject="Facture douanière"
      creator="Alpha Import Exchange — Système de facturation"
      producer="@react-pdf/renderer"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.companyName}>{COMPANY_INFO.name}</Text>
            <Text style={s.companySubtitle}>{COMPANY_INFO.subtitle}</Text>
            <Text style={s.companyDetail}>{COMPANY_INFO.address}</Text>
            <Text style={s.companyDetail}>{COMPANY_INFO.email}</Text>
            <Text style={s.companyDetail}>RCCM : {COMPANY_INFO.rccm}</Text>
            <Text style={s.companyDetail}>ID Nat : {COMPANY_INFO.id_nat}</Text>
            <Text style={s.companyDetail}>{COMPANY_INFO.bank}</Text>
          </View>

          <View style={s.headerRight}>
            <Text style={s.invoiceTitle}>FACTURE</Text>
            <Text style={s.invoiceNumber}>{data.invoice_number}</Text>
            <View style={[s.badge, { backgroundColor: st.bg }]}>
              <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
            </View>
            <Text style={s.companyDetail}>Émise le : {fmtDate(data.issued_at)}</Text>
            <Text style={s.companyDetail}>Échéance : {fmtDate(data.due_date)}</Text>
          </View>
        </View>

        <View style={s.row2}>
          <View style={s.col2}>
            <Text style={s.sectionTitle}>Facturé à</Text>
            <Field label="Client" value={data.buyer_name ?? '—'} bold />
            {data.buyer_email ? <Field label="Email" value={data.buyer_email} /> : null}
          </View>

          <View style={s.colRight}>
            <Text style={s.sectionTitle}>Informations transport</Text>
            <Field label="Mode" value={transportLabel(data.transport_mode)} />
            {data.transport_ref ? (
              <Field label={transportRefLabel(data.transport_mode)} value={data.transport_ref} />
            ) : null}
            {data.declaration_number ? (
              <Field label="N° Déclaration DGDA" value={data.declaration_number} bold />
            ) : null}
            <Field label="Pays" value={data.country_code} />
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.section}>
          <Text style={s.sectionTitle}>Débours — Taxes & Droits de douane</Text>
          <Text style={[s.fieldLabel, { marginBottom: 6 }]}>
            Montants réels liquidés par la DGDA — refacturés sans marge
          </Text>

          <View style={s.table}>
            <TableHeader />
            {disbursementItems.length === 0 ? (
              <View style={s.tableRow}>
                <Text style={[s.tdText, { flex: 1, color: C.muted }]}>Aucune taxe enregistrée</Text>
              </View>
            ) : (
              disbursementItems.map((item, i) => <TableRow key={i} item={item} index={i} />)
            )}
            <SubtotalRow label="Sous-total débours" value={fmtUSD(data.subtotal_disbursements_usd)} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Honoraires — Services Alpha Import</Text>

          <View style={s.table}>
            <TableHeader />
            {feeItems.map((item, i) => (
              <TableRow key={i} item={item} index={i} />
            ))}
            <SubtotalRow label="Sous-total honoraires" value={fmtUSD(data.subtotal_fees_usd)} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Résumé financier</Text>

          <View style={s.summaryBox}>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Débours (taxes douanières)</Text>
              <Text style={s.summaryValue}>{fmtUSD(data.subtotal_disbursements_usd)}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Honoraires de service</Text>
              <Text style={s.summaryValue}>{fmtUSD(data.subtotal_fees_usd)}</Text>
            </View>
            <View style={s.summaryRowTotal}>
              <Text style={s.summaryTotalLabel}>TOTAL À RÉGLER (USD)</Text>
              <Text style={s.summaryTotalValue}>{fmtUSD(data.total_usd)}</Text>
            </View>
          </View>

          {data.total_local != null && data.exchange_rate != null ? (
            <View style={s.cdfBox}>
              <View style={{ flex: 1 }}>
                <Text style={s.cdfLabel}>Équivalent en {currencyLabel}</Text>
                <Text style={s.cdfRate}>
                  Taux appliqué : 1 USD = {data.exchange_rate.toLocaleString('fr-FR')}{' '}
                  {data.currency_local} (gelé à la date de facturation)
                </Text>
              </View>
              <Text style={s.cdfValue}>{fmtLocal(data.total_local, data.currency_local)}</Text>
            </View>
          ) : null}

          <Text style={[s.fieldLabel, { marginTop: 4 }]}>
            TVA non applicable — Opérateur en régime douanier simplifié. Facture établie conformément aux
            dispositions du Code Général des Impôts de la RDC.
          </Text>
        </View>

        <View style={s.footer} fixed>
          <View style={s.footerRow}>
            <Text style={s.footerTextBold}>{COMPANY_INFO.name}</Text>
            <Text style={s.footerText}>Généré le {fmtDateTime(data.generated_at)}</Text>
            <Text style={s.footerTextBold}>{data.invoice_number}</Text>
          </View>
          <View style={s.footerRow}>
            <Text style={s.footerText}>{COMPANY_INFO.email}</Text>
            <Text style={s.footerText}>
              RCCM : {COMPANY_INFO.rccm} — ID Nat : {COMPANY_INFO.id_nat}
            </Text>
          </View>
          <Text style={s.footerMention}>
            Ce document est une facture officielle. Toute contestation doit être adressée par écrit dans un
            délai de 8 jours suivant la réception. Document généré automatiquement — valable sans signature
            en vertu de la réglementation applicable.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
