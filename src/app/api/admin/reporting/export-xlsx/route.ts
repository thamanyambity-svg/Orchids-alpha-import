import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import ExcelJS from "exceljs"
import path from "path"
import fs from "fs"

// Human-readable label for workflow statuses
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING: "En attente",
  ANALYSIS: "En analyse",
  NEGOTIATION: "Négociation",
  VALIDATED: "Validé",
  IN_PROGRESS: "En cours",
  AWAITING_DEPOSIT: "Attente acompte",
  FUNDED: "Financé",
  SHIPPED: "Expédié",
  DELIVERED: "Livré",
  CLOSED: "Clôturé",
  REJECTED: "Rejeté",
}

// Column definitions for the export
const COLUMNS: {
  header: string
  key: string
  width: number
  style?: Partial<ExcelJS.Column["style"]>
}[] = [
  { header: "Référence", key: "reference", width: 22 },
  { header: "Date de création", key: "created_at", width: 16 },
  { header: "Dernière MAJ", key: "updated_at", width: 16 },
  { header: "Client", key: "buyer_name", width: 24 },
  { header: "Email client", key: "buyer_email", width: 28 },
  { header: "Téléphone", key: "buyer_phone", width: 18 },
  { header: "Statut", key: "status", width: 18 },
  {
    header: "Budget min (USD)",
    key: "budget_min",
    width: 18,
    style: { numFmt: '$ #,##0.00' },
  },
  {
    header: "Budget max (USD)",
    key: "budget_max",
    width: 18,
    style: { numFmt: '$ #,##0.00' },
  },
  { header: "Pays acheteur", key: "buyer_country", width: 18 },
  { header: "Produit", key: "product_name", width: 26 },
  { header: "Partenaire", key: "partner_name", width: 24 },
  { header: "Email partenaire", key: "partner_email", width: 28 },
]

const HEADER_ROW = 5
const DATA_START_ROW = HEADER_ROW + 1

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: requests, error } = await supabase
      .from("import_requests")
      .select(
        `
        reference,
        status,
        budget_max,
        budget_min,
        buyer_country,
        product_name,
        created_at,
        updated_at,
        buyer:profiles!buyer_id(full_name, email, phone),
        partner:profiles!assigned_partner_id(full_name, email)
      `
      )
      .order("created_at", { ascending: false })

    if (error) throw error

    const rows = (requests ?? []).map((r) => {
      const buyer = r.buyer as unknown as Record<string, string> | null
      const partner = r.partner as unknown as Record<string, string> | null
      return {
        reference: r.reference,
        created_at: r.created_at ? new Date(r.created_at) : null,
        updated_at: r.updated_at ? new Date(r.updated_at) : null,
        buyer_name: buyer?.full_name ?? "N/A",
        buyer_email: buyer?.email ?? "N/A",
        buyer_phone: buyer?.phone ?? "N/A",
        status: STATUS_LABELS[r.status] ?? r.status,
        budget_min: r.budget_min != null ? Number(r.budget_min) : null,
        budget_max: r.budget_max != null ? Number(r.budget_max) : null,
        buyer_country: (r as Record<string, unknown>).buyer_country ?? "N/A",
        product_name: (r as Record<string, unknown>).product_name ?? "",
        partner_name: partner?.full_name ?? "Non assigné",
        partner_email: partner?.email ?? "N/A",
      }
    })

    // --- Build workbook ---
    const workbook = new ExcelJS.Workbook()
    workbook.creator = "Alpha Import Exchange"
    workbook.created = new Date()

    const sheet = workbook.addWorksheet("Demandes", {
      views: [{ state: "frozen", ySplit: HEADER_ROW }],
    })

    // --- Insert logo (rows 1-3) ---
    const logoPath = path.join(process.cwd(), "public", "logo-alpha-import.png")
    if (fs.existsSync(logoPath)) {
      const logoImage = workbook.addImage({
        filename: logoPath,
        extension: "png",
      })
      // Place logo spanning A1:C3
      sheet.addImage(logoImage, "A1:C3")
    }

    // Title text next to logo
    const titleCell = sheet.getCell("D1")
    titleCell.value = "ALPHA IMPORT EXCHANGE RDC"
    titleCell.font = { bold: true, size: 16, color: { argb: "FF1A1A1A" } }
    titleCell.alignment = { vertical: "middle" }

    const subtitleCell = sheet.getCell("D2")
    subtitleCell.value = "A.Onoseke House Investment DRC"
    subtitleCell.font = { size: 11, italic: true, color: { argb: "FF555555" } }
    subtitleCell.alignment = { vertical: "middle" }

    const exportDate = new Date().toISOString().slice(0, 10)
    const totalVolume = (requests ?? [])
      .filter((r) => !["DRAFT", "REJECTED"].includes(r.status))
      .reduce((sum, r) => sum + (Number(r.budget_max) || 0), 0)

    const metaCell = sheet.getCell("D3")
    metaCell.value = `Exporté le ${exportDate}  •  ${(requests ?? []).length} dossier(s)  •  Volume projeté : $ ${totalVolume.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    metaCell.font = { size: 10, color: { argb: "FF777777" } }
    metaCell.alignment = { vertical: "middle" }

    // Row 4 is intentionally blank (visual breathing space)

    // Adjust row heights for logo area
    sheet.getRow(1).height = 28
    sheet.getRow(2).height = 22
    sheet.getRow(3).height = 20
    sheet.getRow(4).height = 10

    // --- Header row (row 5) ---
    const headerRow = sheet.getRow(HEADER_ROW)
    COLUMNS.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1)
      cell.value = col.header
      cell.font = { bold: true, color: { argb: "FFFFD700" }, size: 11 }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1A1A1A" },
      }
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFFFD700" } },
      }
    })
    headerRow.height = 26

    // --- Set column widths ---
    COLUMNS.forEach((col, idx) => {
      const sheetCol = sheet.getColumn(idx + 1)
      sheetCol.width = col.width
      if (col.style) {
        sheetCol.style = { ...sheetCol.style, ...col.style }
      }
    })

    // --- Data rows (starting at row 6) ---
    const LIGHT_GRAY: ExcelJS.FillPattern = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF5F5F5" },
    }
    const WHITE: ExcelJS.FillPattern = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFFFF" },
    }

    rows.forEach((rowData, rowIndex) => {
      const excelRow = sheet.getRow(DATA_START_ROW + rowIndex)
      const isEvenRow = rowIndex % 2 === 0
      const bgFill = isEvenRow ? WHITE : LIGHT_GRAY

      COLUMNS.forEach((col, colIdx) => {
        const cell = excelRow.getCell(colIdx + 1)
        const value = rowData[col.key as keyof typeof rowData]

        // Apply value with proper formatting
        if (value instanceof Date) {
          cell.value = value
          cell.numFmt = "yyyy-mm-dd"
        } else if (value === null || value === undefined) {
          cell.value = ""
        } else {
          cell.value = value
        }

        // Apply formatting based on column type
        if (col.style?.numFmt && typeof cell.value === "number") {
          cell.numFmt = col.style.numFmt
        }

        // Row styling
        cell.fill = bgFill
        cell.alignment = { vertical: "middle" }
        cell.border = {
          bottom: { style: "hair", color: { argb: "FFE0E0E0" } },
        }
        cell.font = { size: 10, color: { argb: "FF333333" } }
      })
      excelRow.height = 20
    })

    // --- Autofilter on data range ---
    if (rows.length > 0) {
      sheet.autoFilter = {
        from: { row: HEADER_ROW, column: 1 },
        to: { row: HEADER_ROW + rows.length, column: COLUMNS.length },
      }
    }

    // --- Summary row at bottom ---
    const summaryRowNum = DATA_START_ROW + rows.length + 1
    const summaryRow = sheet.getRow(summaryRowNum)
    const summaryCell = summaryRow.getCell(1)
    summaryCell.value = "TOTAL VOLUME PROJETÉ (hors brouillons & rejetés)"
    summaryCell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } }
    summaryCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1A1A1A" },
    }
    // Merge summary label across first columns
    sheet.mergeCells(summaryRowNum, 1, summaryRowNum, COLUMNS.length - 1)
    // Fill merged cells background
    for (let i = 2; i < COLUMNS.length; i++) {
      const c = summaryRow.getCell(i)
      c.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1A1A1A" },
      }
    }
    const totalCell = summaryRow.getCell(COLUMNS.length)
    totalCell.value = totalVolume
    totalCell.numFmt = '$ #,##0.00'
    totalCell.font = { bold: true, size: 11, color: { argb: "FFFFD700" } }
    totalCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1A1A1A" },
    }
    totalCell.alignment = { horizontal: "right", vertical: "middle" }
    summaryRow.height = 24

    // --- Generate buffer ---
    const buffer = await workbook.xlsx.writeBuffer()

    const fileName = `alpha-import-rapport-${exportDate}.xlsx`
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
