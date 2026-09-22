import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Facture finale d'une demande : l'administration l'établit après acceptation
 * de la pro forma ; le client ne la voit qu'émise ; le partenaire jamais. Le
 * premier brouillon crée la commande en attente, sans acompte exigible.
 */

const requireUser = vi.fn()
let db: ReturnType<typeof createSupabaseMock>

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...a: any[]) => requireUser(...a) }
})
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db.client }))
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => ({ allowed: true }) }))
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(() => Promise.resolve()) }))

const { GET, PUT } = await import("./route")

const DEMANDE = "11111111-1111-4111-8111-111111111111"
const ACHETEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const PARTENAIRE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const ADMIN = "ffffffff-ffff-4fff-8fff-ffffffffffff"
const ctx = () => ({ params: Promise.resolve({ id: DEMANDE }) })

const QUOTE = { id: "q1", version: 2, status: "ACCEPTED", currency: "USD", quantity: 1, unit_price_usd: 85000, subtotal_usd: 85000, freight_cost_usd: 4200, grand_total_usd: 89200 }
const PO = { id: "po-1", po_number: "PO-2026-0001", status: "GENERATED", deposit_percent: 60, order_id: null, grand_total_usd: 89200, currency: "USD" }

const lignes = [
  { libelle: "Marchandise", categorie: "MARCHANDISE", montant: 85000 },
  { libelle: "Fret", categorie: "LOGISTIQUE", montant: 4200 },
  { libelle: "Droits DGDA", categorie: "DOUANE", montant: 9000 },
  { libelle: "TVA", categorie: "DOUANE", montant: 0 },
  { libelle: "Commission Alpha Import", categorie: "COMMISSION", montant: 4000 },
]

function setup({
  compte = ADMIN,
  role = "ADMIN",
  quote = QUOTE as any,
  po = PO as any,
  facture = null as any,
  commande = null as any,
} = {}) {
  db = createSupabaseMock((op) => {
    if (op.table === "import_requests") return { data: { buyer_id: ACHETEUR, assigned_partner_id: "fiche-1" } }
    if (op.table === "partner_profiles") return { data: { user_id: PARTENAIRE } }
    if (op.table === "quotes") return { data: quote }
    if (op.table === "purchase_orders") return { data: po }
    if (op.table === "invoices" && op.type === "select") return { data: facture }
    if (op.table === "invoices") return { data: { id: facture?.id ?? "inv-1", ...op.payload } }
    if (op.table === "orders" && op.type === "insert") return { data: { id: "ord-1" } }
    if (op.table === "orders") return { data: commande }
    return { data: null }
  })
  requireUser.mockResolvedValue({ user: { id: compte }, role, supabase: {} })
}

describe("GET /api/requests/[id]/invoice", () => {
  beforeEach(() => vi.clearAllMocks())

  it("propose à l'administration les lignes de la pro forma acceptée", async () => {
    setup()
    const corps = await (await GET(makeRequest(null), ctx())).json()

    expect(corps.vue).toBe("ADMIN")
    expect(corps.proposition[0]).toMatchObject({ categorie: "MARCHANDISE", montant: 85000 })
    expect(corps.proposition.some((l: any) => l.categorie === "COMMISSION")).toBe(true)
  })

  it("cache au client un brouillon, en signalant une correction en cours", async () => {
    setup({ compte: ACHETEUR, role: "BUYER", facture: { id: "inv-1", status: "DRAFT", contest_reason: "TVA erronée", lines: lignes } })
    const corps = await (await GET(makeRequest(null), ctx())).json()

    expect(corps.invoice).toBeNull()
    expect(corps.enCorrection).toBe(true)
    expect(corps.proposition).toBeNull()
  })

  it("montre au client la facture émise avec ses totaux", async () => {
    setup({ compte: ACHETEUR, role: "BUYER", facture: { id: "inv-1", status: "SENT", lines: lignes.filter((l) => l.montant > 0) } })
    const corps = await (await GET(makeRequest(null), ctx())).json()

    expect(corps.invoice.totaux).toMatchObject({ total: 102200, commission: 4000, acompte: 61320, solde: 40880 })
  })

  it("répond 404 au partenaire, même affecté", async () => {
    setup({ compte: PARTENAIRE, role: "PARTNER" })
    expect((await GET(makeRequest(null), ctx())).status).toBe(404)
  })
})

describe("PUT /api/requests/[id]/invoice", () => {
  beforeEach(() => vi.clearAllMocks())

  it("enregistre le brouillon sans les postes à zéro, avec totaux et 60 / 40", async () => {
    setup()
    const res = await PUT(makeRequest({ lines: lignes, notes: "Dédouanement à Matadi" }), ctx())

    expect(res.status).toBe(200)
    const facture = db.lastOp("invoices", "insert")?.payload
    expect(facture).toMatchObject({
      request_id: DEMANDE,
      order_id: "ord-1",
      purchase_order_id: "po-1",
      type: "FINAL",
      number: "FAC-PO-2026-0001",
      status: "DRAFT",
      total_amount: 102200,
      deposit_amount: 61320,
      balance_amount: 40880,
      alpha_commission: 4000,
    })
    expect(facture.lines.map((l: any) => l.libelle)).not.toContain("TVA")
  })

  it("crée la commande en attente, sans acompte exigible, et la rattache au bon de commande", async () => {
    setup()
    await PUT(makeRequest({ lines: lignes }), ctx())

    const commande = db.lastOp("orders", "insert")?.payload
    expect(commande).toMatchObject({ reference: "PO-2026-0001", request_id: DEMANDE, status: "PENDING", total_amount: 102200, partner_payout: 89200 })
    expect(commande).not.toHaveProperty("deposit_amount")
    expect(db.lastOp("purchase_orders", "update")?.payload).toEqual({ order_id: "ord-1" })
  })

  it("refuse avant l'acceptation de la pro forma", async () => {
    setup({ quote: null, po: null })
    expect((await PUT(makeRequest({ lines: lignes }), ctx())).status).toBe(409)
    expect(db.lastOp("invoices", "insert")).toBeUndefined()
  })

  it("refuse de modifier une facture déjà émise", async () => {
    setup({ facture: { id: "inv-1", status: "SENT", order_id: "ord-1" } })
    expect((await PUT(makeRequest({ lines: lignes }), ctx())).status).toBe(409)
    expect(db.lastOp("invoices", "update")).toBeUndefined()
  })

  it("refuse une facture sans marchandise", async () => {
    setup()
    expect((await PUT(makeRequest({ lines: [{ libelle: "Fret", categorie: "LOGISTIQUE", montant: 10 }] }), ctx())).status).toBe(400)
  })

  it("ne laisse ni le client ni le partenaire établir la facture", async () => {
    setup({ compte: ACHETEUR, role: "BUYER" })
    expect((await PUT(makeRequest({ lines: lignes }), ctx())).status).toBe(403)
    setup({ compte: PARTENAIRE, role: "PARTNER" })
    expect((await PUT(makeRequest({ lines: lignes }), ctx())).status).toBe(404)
  })

  it("refuse si la commande a déjà été validée par le client", async () => {
    setup({ facture: { id: "inv-1", status: "DRAFT", order_id: "ord-1" }, commande: { id: "ord-1", status: "AWAITING_DEPOSIT" } })
    expect((await PUT(makeRequest({ lines: lignes }), ctx())).status).toBe(409)
  })
})
