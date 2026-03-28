/**
 * Excel workbook builder for the Reporting & Audit module.
 * Generates a 3-tab XLSX:
 *   1. 🔐 Admin – Vue Globale
 *   2. 📋 Vue Client
 *   3. 📖 Légende & Guide
 */

import ExcelJS from "exceljs"
import { ALPHA_COLORS, ADMIN_COLUMNS, CLIENT_COLUMNS, CLIENT_HIDDEN_FIELDS, toClientView } from "./types"
import type { Transaction, ClientTransaction } from "./types"

// ── ARGB helpers (ExcelJS uses AARRGGBB) ──────────────────────────────────────

function argb(hex: string): string {
  return "FF" + hex.replace("#", "").toUpperCase()
}

const C = {
  NAVY:      argb(ALPHA_COLORS.NAVY),
  GOLD:      argb(ALPHA_COLORS.GOLD),
  WHITE:     argb(ALPHA_COLORS.WHITE),
  GREY_ROW:  argb(ALPHA_COLORS.GREY_ROW),
  RED_ALERT: argb(ALPHA_COLORS.RED_ALERT),
  ORANGE:    argb(ALPHA_COLORS.ORANGE),
  GREEN_OK:  argb(ALPHA_COLORS.GREEN_OK),
  DARK_TEXT: argb(ALPHA_COLORS.DARK_TEXT),
}

// ── Column header labels ───────────────────────────────────────────────────────

const COLUMN_LABELS: Record<string, string> = {
  uid:              "UID",
  clientReference:  "Client",
  isoTimestamp:     "Horodatage (UTC)",
  pol:              "POL (Chargement)",
  pod:              "POD (Déchargement)",
  incoterm:         "Incoterm",
  valueFOB:         "Valeur FOB (USD)",
  alphaCommission:  "Commission Alpha (USD)",
  totalValue:       "Total (USD)",
  deposit60:        "Acompte 60 % (USD)",
  balance40:        "Solde 40 % (USD)",
  currency:         "Devise",
  depositStatus:    "Statut Acompte",
  balanceStatus:    "Statut Solde",
  currentStep:      "Étape Workflow",
  responsibleAgent: "Agent Responsable",
  trackingNumber:   "N° Tracking",
  priority:         "Priorité",
  incidentLog:      "Journal Incidents",
  clientVisible:    "Visible Client",
}

const COLUMN_WIDTHS: Record<string, number> = {
  uid:              18,
  clientReference:  24,
  isoTimestamp:     20,
  pol:              22,
  pod:              22,
  incoterm:         12,
  valueFOB:         18,
  alphaCommission:  22,
  totalValue:       18,
  deposit60:        20,
  balance40:        18,
  currency:         10,
  depositStatus:    20,
  balanceStatus:    18,
  currentStep:      20,
  responsibleAgent: 22,
  trackingNumber:   36,
  priority:         12,
  incidentLog:      40,
  clientVisible:    14,
}

const MONEY_COLS = new Set([
  "valueFOB", "alphaCommission", "totalValue", "deposit60", "balance40",
])

const HEADER_ROW = 3
const DATA_START_ROW = HEADER_ROW + 1

// ── Shared sheet builder ───────────────────────────────────────────────────────

function buildSheet<T extends Record<string, unknown>>(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  columns: readonly string[],
  rows: T[],
  title: string,
) {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: HEADER_ROW }],
  })

  // Row 1 — title
  const titleCell = sheet.getCell("A1")
  titleCell.value = title
  titleCell.font = { bold: true, size: 14, color: { argb: C.GOLD } }
  titleCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: C.NAVY } }
  titleCell.alignment = { vertical: "middle", horizontal: "left" }
  sheet.getRow(1).height = 28
  sheet.mergeCells(1, 1, 1, columns.length)

  // Row 2 — export date
  const dateCell = sheet.getCell("A2")
  dateCell.value = `Alpha Import Exchange — Export du ${new Date().toISOString().slice(0, 10)}  •  ${rows.length} enregistrement(s)`
  dateCell.font  = { size: 10, italic: true, color: { argb: "FF888888" } }
  dateCell.alignment = { vertical: "middle" }
  sheet.getRow(2).height = 18
  sheet.mergeCells(2, 1, 2, columns.length)

  // Row 3 — headers
  const headerRow = sheet.getRow(HEADER_ROW)
  columns.forEach((key, idx) => {
    const cell = headerRow.getCell(idx + 1)
    cell.value = COLUMN_LABELS[key] ?? key
    cell.font  = { bold: true, size: 11, color: { argb: C.WHITE } }
    cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: C.NAVY } }
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
    cell.border = { bottom: { style: "medium", color: { argb: C.GOLD } } }
    sheet.getColumn(idx + 1).width = COLUMN_WIDTHS[key] ?? 18
  })
  headerRow.height = 26

  // Data rows
  rows.forEach((rowData, rowIndex) => {
    const excelRow = sheet.getRow(DATA_START_ROW + rowIndex)
    const isEven   = rowIndex % 2 === 0
    const bgArgb   = isEven ? C.WHITE : C.GREY_ROW

    columns.forEach((key, colIdx) => {
      const cell  = excelRow.getCell(colIdx + 1)
      const value = rowData[key]

      if (value instanceof Date) {
        cell.value  = value
        cell.numFmt = "yyyy-mm-dd hh:mm"
      } else if (typeof value === "boolean") {
        cell.value = value ? "Oui" : "Non"
      } else if (value === null || value === undefined) {
        cell.value = ""
      } else {
        cell.value = value as ExcelJS.CellValue
      }

      if (MONEY_COLS.has(key) && typeof value === "number") {
        cell.numFmt = '$ #,##0.00'
      }

      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } }
      cell.font      = { size: 10, color: { argb: C.DARK_TEXT } }
      cell.alignment = { vertical: "middle" }
      cell.border    = { bottom: { style: "hair", color: { argb: "FFDDDDDD" } } }

      // Priority colour coding
      if (key === "priority") {
        if (value === "Critique") {
          cell.font = { bold: true, size: 10, color: { argb: C.RED_ALERT } }
        } else if (value === "Urgent") {
          cell.font = { bold: true, size: 10, color: { argb: C.ORANGE } }
        } else {
          cell.font = { size: 10, color: { argb: C.GREEN_OK } }
        }
      }

      // Payment status colour coding
      if ((key === "depositStatus" || key === "balanceStatus")) {
        if (value === "Payé") {
          cell.font = { size: 10, color: { argb: C.GREEN_OK } }
        } else if (value === "En attente" || value === "Partiellement payé") {
          cell.font = { size: 10, color: { argb: C.ORANGE } }
        } else if (value === "Annulé") {
          cell.font = { size: 10, color: { argb: C.RED_ALERT } }
        }
      }
    })

    excelRow.height = 20
  })

  // Autofilter
  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to:   { row: HEADER_ROW + rows.length, column: columns.length },
    }
  }

  // Summary row (money totals for admin sheet)
  if (columns.includes("totalValue")) {
    const summaryRowNum = DATA_START_ROW + rows.length + 1
    const summaryRow    = sheet.getRow(summaryRowNum)

    const labelCell = summaryRow.getCell(1)
    labelCell.value = "TOTAL"
    labelCell.font  = { bold: true, size: 10, color: { argb: C.GOLD } }
    labelCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: C.NAVY } }
    sheet.mergeCells(summaryRowNum, 1, summaryRowNum, columns.indexOf("totalValue"))

    for (let i = 2; i <= columns.indexOf("totalValue"); i++) {
      const c = summaryRow.getCell(i)
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.NAVY } }
    }

    const moneyKeys = ["valueFOB", "alphaCommission", "totalValue", "deposit60", "balance40"] as const
    moneyKeys.forEach((key) => {
      const colIdx = columns.indexOf(key)
      if (colIdx === -1) return
      const total = rows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0)
      const cell  = summaryRow.getCell(colIdx + 1)
      cell.value  = total
      cell.numFmt = '$ #,##0.00'
      cell.font   = { bold: true, size: 10, color: { argb: C.GOLD } }
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: C.NAVY } }
      cell.alignment = { horizontal: "right", vertical: "middle" }
    })

    summaryRow.height = 24
  }
}

// ── Legend sheet ───────────────────────────────────────────────────────────────

function buildLegendSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet("📖 Légende & Guide")

  const addSection = (row: number, label: string, value: string, bold = false) => {
    const a = sheet.getCell(row, 1)
    const b = sheet.getCell(row, 2)
    a.value = label
    b.value = value
    a.font  = { bold, size: 10, color: { argb: C.DARK_TEXT } }
    b.font  = { size: 10, color: { argb: C.DARK_TEXT } }
    a.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: bold ? C.NAVY : C.GREY_ROW } }
    b.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: bold ? C.NAVY : C.GREY_ROW } }
    if (bold) {
      a.font = { bold: true, size: 10, color: { argb: C.GOLD } }
      b.font = { bold: true, size: 10, color: { argb: C.GOLD } }
    }
  }

  addSection(1, "ALPHA IMPORT EXCHANGE — DICTIONNAIRE DE DONNÉES", "", true)
  addSection(2, "Champ",            "Description", true)
  addSection(3, "uid",              'Identifiant unique — format "AI-YYYY-TR-NNN"')
  addSection(4, "clientReference",  "Nom légal de l'entité cliente")
  addSection(5, "isoTimestamp",     "Horodatage ISO 8601 UTC")
  addSection(6, "pol",              "Point of Loading — Ville, Pays")
  addSection(7, "pod",              "Point of Discharge — Ville, Pays")
  addSection(8, "incoterm",         "Règle de commerce : FOB, CIF, EXW, DDP, DAP, CFR")
  addSection(9, "valueFOB",         "Prix fournisseur HT en USD (confidentiel — admin uniquement)")
  addSection(10, "alphaCommission", "Commission Alpha Import en USD (confidentiel — admin uniquement)")
  addSection(11, "totalValue",      "Total = valueFOB + alphaCommission")
  addSection(12, "deposit60",       "Acompte = totalValue × 60 %")
  addSection(13, "balance40",       "Solde = totalValue × 40 %")
  addSection(14, "currency",        "Devise (USD par défaut)")
  addSection(15, "depositStatus",   "Statut acompte : Payé | En attente | Partiellement payé | Annulé")
  addSection(16, "balanceStatus",   "Statut solde : Payé | En attente | Partiellement payé | Annulé")
  addSection(17, "currentStep",     "Étape : Assignation → Validation → Exécution → En transit → Dédouanement → Livraison → Clôturé")
  addSection(18, "responsibleAgent","Prénom Nom de l'agent Alpha Import (confidentiel — admin uniquement)")
  addSection(19, "trackingNumber",  "URL ou identifiant transporteur")
  addSection(20, "priority",        "Normal | Urgent | Critique")
  addSection(21, "incidentLog",     "Résumé des blocages (500 car. max)")
  addSection(22, "clientVisible",   "true = visible dans le portail client")

  addSection(24, "CODES COULEUR", "", true)
  addSection(25, "🟢 Vert",    "Priorité Normal / Statut Payé")
  addSection(26, "🟠 Orange",  "Priorité Urgent / Statut En attente ou Partiellement payé")
  addSection(27, "🔴 Rouge",   "Priorité Critique / Statut Annulé")
  addSection(28, "⬛ Marine",  "En-têtes et fond titre")
  addSection(29, "🟡 Or",     "Séparateurs et sous-titres")

  sheet.getColumn(1).width = 28
  sheet.getColumn(2).width = 70
}

// ── Public builder ─────────────────────────────────────────────────────────────

export async function buildAdminWorkbook(transactions: Transaction[]) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator  = "Alpha Import Exchange"
  workbook.created  = new Date()

  // Tab 1 — Admin full view
  buildSheet(
    workbook,
    "🔐 Admin – Vue Globale",
    ADMIN_COLUMNS,
    transactions as unknown as Record<string, unknown>[],
    "ALPHA IMPORT EXCHANGE — Vue Admin Globale",
  )

  // Tab 2 — Client view (filtered)
  const clientRows = transactions
    .map(toClientView)
    .filter(Boolean) as ClientTransaction[]

  buildSheet(
    workbook,
    "📋 Vue Client",
    CLIENT_COLUMNS,
    clientRows,
    "ALPHA IMPORT EXCHANGE — Vue Client",
  )

  // Tab 3 — Legend
  buildLegendSheet(workbook)

  const buffer = await workbook.xlsx.writeBuffer()
  return buffer
}

export async function buildClientWorkbook(transactions: ClientTransaction[]) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator  = "Alpha Import Exchange"
  workbook.created  = new Date()

  // Tab 1 — Client view
  buildSheet(
    workbook,
    "📋 Vue Client",
    CLIENT_COLUMNS,
    transactions as unknown as Record<string, unknown>[],
    "ALPHA IMPORT EXCHANGE — Vos Transactions",
  )

  // Tab 2 — Legend
  buildLegendSheet(workbook)

  const buffer = await workbook.xlsx.writeBuffer()
  return buffer
}

// ── Hidden fields constant re-export for reference ────────────────────────────
export { CLIENT_HIDDEN_FIELDS }
