import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "https://fonts.cdnfonts.com/s/29107/Helvetica.woff", fontWeight: "normal" },
    { src: "https://fonts.cdnfonts.com/s/29107/Helvetica-Bold.woff", fontWeight: "bold" },
  ],
})

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
    borderBottomWidth: 2,
    borderBottomColor: "#d4a017",
    paddingBottom: 20,
  },
  brand: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0a1628",
    letterSpacing: 4,
  },
  brandSub: {
    fontSize: 7,
    color: "#666",
    letterSpacing: 2,
    marginTop: 4,
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#d4a017",
    textTransform: "uppercase",
  },
  invoiceRef: {
    fontSize: 8,
    color: "#666",
    marginTop: 4,
    textAlign: "right",
  },
  section: {
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 8,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  value: {
    fontSize: 10,
    color: "#1a1a1a",
    marginBottom: 12,
  },
  table: {
    marginVertical: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0a1628",
    color: "#fff",
    padding: 8,
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    padding: 8,
    fontSize: 9,
  },
  tableCol1: { width: "50%" },
  tableCol2: { width: "20%", textAlign: "right" },
  tableCol3: { width: "15%", textAlign: "right" },
  tableCol4: { width: "15%", textAlign: "right" },
  totals: {
    marginTop: 20,
    borderTopWidth: 2,
    borderTopColor: "#d4a017",
    paddingTop: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  totalLabel: {
    width: 120,
    fontSize: 9,
    color: "#666",
  },
  totalValue: {
    width: 100,
    textAlign: "right",
    fontSize: 9,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  grandTotalLabel: {
    width: 120,
    fontSize: 12,
    fontWeight: "bold",
  },
  grandTotalValue: {
    width: 100,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "bold",
    color: "#d4a017",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#999",
  },
  paymentBreakdown: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f8f6f0",
    borderRadius: 4,
  },
  paymentTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#0a1628",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
})

export interface InvoiceData {
  number: string
  type: string
  issuedAt: string
  dueAt: string | null
  buyerName: string
  buyerCompany: string
  buyerEmail: string
  buyerAddress: string
  partnerName: string
  partnerCompany: string
  productName: string
  productDescription: string
  quantity: number
  unit: string
  unitPrice: number
  totalAmount: number
  depositAmount: number | null
  balanceAmount: number | null
  alphaCommission: number
  notes: string | null
}

export function InvoicePDF({ data }: { data: InvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>ALPHA IMPORT</Text>
            <Text style={styles.brandSub}>Exchange — Filiale du Groupe A.Onoseke Investment RDC</Text>
            <Text style={{ fontSize: 7, color: "#999", marginTop: 8 }}>Kinshasa, République Démocratique du Congo</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>{data.type === "PROFORMA" ? "PROFORMA INVOICE" : data.type === "COMMERCIAL" ? "COMMERCIAL INVOICE" : "FINAL INVOICE"}</Text>
            <Text style={styles.invoiceRef}>N° {data.number}</Text>
            <Text style={{ fontSize: 8, color: "#999", marginTop: 2 }}>Émise le {data.issuedAt}</Text>
            {data.dueAt && <Text style={{ fontSize: 8, color: "#999" }}>Échéance le {data.dueAt}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Acheteur</Text>
              <Text style={styles.value}>{data.buyerCompany}</Text>
              <Text style={{ fontSize: 9, color: "#666", marginBottom: 2 }}>{data.buyerName}</Text>
              <Text style={{ fontSize: 9, color: "#666", marginBottom: 2 }}>{data.buyerEmail}</Text>
              <Text style={{ fontSize: 9, color: "#666" }}>{data.buyerAddress}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Partenaire assigné</Text>
              <Text style={styles.value}>{data.partnerCompany}</Text>
              <Text style={{ fontSize: 9, color: "#666" }}>{data.partnerName}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCol1}>Produit / Service</Text>
            <Text style={styles.tableCol2}>Quantité</Text>
            <Text style={styles.tableCol3}>Prix unitaire</Text>
            <Text style={styles.tableCol4}>Total</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCol1}>{data.productDescription || data.productName}</Text>
            <Text style={styles.tableCol2}>{data.quantity} {data.unit}</Text>
            <Text style={styles.tableCol3}>${data.unitPrice?.toLocaleString()}</Text>
            <Text style={styles.tableCol4}>${data.totalAmount?.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Commission Alpha (incluse)</Text>
            <Text style={styles.totalValue}>${data.alphaCommission?.toLocaleString()}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>Total TTC</Text>
            <Text style={styles.grandTotalValue}>${data.totalAmount?.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.paymentBreakdown}>
          <Text style={styles.paymentTitle}>Échéancier de paiement</Text>
          {data.depositAmount && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 9 }}>Acompte 60%</Text>
              <Text style={{ fontSize: 9, fontWeight: "bold" }}>${data.depositAmount.toLocaleString()}</Text>
            </View>
          )}
          {data.balanceAmount && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 9 }}>Solde 40% à la livraison</Text>
              <Text style={{ fontSize: 9, fontWeight: "bold" }}>${data.balanceAmount.toLocaleString()}</Text>
            </View>
          )}
        </View>

        {data.notes && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.label}>Notes</Text>
            <Text style={{ fontSize: 9, color: "#666" }}>{data.notes}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text>Alpha Import Exchange • contact@aonosekehouseinvestmentdrc.site</Text>
          <Text>N° RCCM: A.Onoseke Investment RDC</Text>
        </View>
      </Page>
    </Document>
  )
}
