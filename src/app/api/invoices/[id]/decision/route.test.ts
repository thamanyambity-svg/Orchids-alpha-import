import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Étapes de la facture finale. Ce qui compte : rien n'est payable avant la
 * validation du client ; la validation exige les CGV et signe le bon de
 * commande ; chaque étape a son décideur et ne s'applique qu'une fois.
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
vi.mock("@/lib/webhooks", () => ({ sendToN8N: vi.fn(() => Promise.resolve()) }))

const { POST } = await import("./route")

const FACTURE = "12121212-1212-4212-8212-121212121212"
const DEMANDE = "11111111-1111-4111-8111-111111111111"
const ACHETEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const PARTENAIRE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const ADMIN = "ffffffff-ffff-4fff-8fff-ffffffffffff"
const INTRUS = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
const ctx = () => ({ params: Promise.resolve({ id: FACTURE }) })

const LIGNES = [
  { libelle: "Marchandise", categorie: "MARCHANDISE", montant: 85000 },
  { libelle: "Droits DGDA", categorie: "DOUANE", montant: 13200 },
  { libelle: "Commission Alpha Import", categorie: "COMMISSION", montant: 4000 },
]

function setup({
  compte = ACHETEUR,
  role = "BUYER",
  statut = "SENT",
  validee = null as string | null,
  poStatut = "GENERATED",
  lignesMaj = 1,
  type = "FINAL",
} = {}) {
  db = createSupabaseMock((op) => {
    if (op.table === "invoices" && op.type === "select") {
      return {
        data: {
          id: FACTURE, type, request_id: DEMANDE, order_id: "ord-1", purchase_order_id: "po-1", number: "FAC-PO-2026-0001",
          status: statut, validated_at: validee, lines: LIGNES, total_amount: 102200, deposit_amount: 61320, currency: "USD",
        },
      }
    }
    if (op.table === "invoices") return { data: lignesMaj ? { id: FACTURE, ...op.payload } : null }
    if (op.table === "import_requests" && op.type === "select") return { data: { buyer_id: ACHETEUR, assigned_partner_id: "fiche-1", reference: "AIX-20260911-2496" } }
    if (op.table === "partner_profiles") return { data: { user_id: PARTENAIRE } }
    if (op.table === "purchase_orders" && op.type === "select") return { data: { id: "po-1", po_number: "PO-2026-0001", status: poStatut, deposit_percent: 60 } }
    if (op.table === "orders") return { data: { id: "ord-1", reference: "PO-2026-0001", deposit_amount: 61320 } }
    if (op.table === "profiles") return { data: [{ id: ADMIN }] }
    return { data: null }
  })
  requireUser.mockResolvedValue({ user: { id: compte }, role, supabase: {} })
}

const decider = (corps: Record<string, unknown>, entetes: Record<string, string> = {}) =>
  POST(makeRequest(corps, { headers: entetes }), ctx())

describe("POST /api/invoices/[id]/decision", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  describe("émission par l'administration", () => {
    it("émet le brouillon au client et le prévient", async () => {
      setup({ compte: ADMIN, role: "ADMIN", statut: "DRAFT" })
      const res = await decider({ action: "issue" })

      expect(res.status).toBe(200)
      expect(db.lastOp("invoices", "update")?.payload).toMatchObject({ status: "SENT", contest_reason: null })
      expect(db.lastOp("invoices", "update")?.filtres).toContainEqual({ operateur: "eq", colonne: "status", valeur: "DRAFT" })
      expect(db.lastOp("notifications", "insert")?.payload).toEqual([
        expect.objectContaining({ user_id: ACHETEUR, link: `/dashboard/requests/${DEMANDE}?onglet=invoice` }),
      ])
    })

    it("n'annonce aucun montant dans la discussion, que le partenaire lit", async () => {
      setup({ compte: ADMIN, role: "ADMIN", statut: "DRAFT" })
      await decider({ action: "issue" })
      expect(db.lastOp("messages", "insert")?.payload.content).not.toMatch(/\d{2}[\s ]?\d{3}/)
    })

    it("est réservée à l'administration", async () => {
      setup({ statut: "SENT" })
      expect((await decider({ action: "issue" })).status).toBe(403)
    })

    it("ne réémet pas une facture déjà émise", async () => {
      setup({ compte: ADMIN, role: "ADMIN", statut: "SENT" })
      expect((await decider({ action: "issue" })).status).toBe(409)
    })
  })

  describe("validation par le client", () => {
    it("exige l'acceptation des CGV", async () => {
      setup()
      expect((await decider({ action: "validate" })).status).toBe(400)
      expect((await decider({ action: "validate", cgv_accepted: false })).status).toBe(400)
      expect(db.lastOp("invoices", "update")).toBeUndefined()
      expect(db.lastOp("orders", "update")).toBeUndefined()
    })

    it("signe le bon de commande et ouvre l'acompte de 60 %", async () => {
      setup()
      const res = await decider({ action: "validate", cgv_accepted: true }, { "x-forwarded-for": "41.243.1.2, 10.0.0.1", "user-agent": "Test" })

      expect(res.status).toBe(200)
      expect(db.lastOp("invoices", "update")?.payload).toHaveProperty("validated_at")
      expect(db.lastOp("purchase_orders", "update")?.payload).toMatchObject({
        status: "SIGNED", cgv_version: "1.0", cgv_accepted_ip: "41.243.1.2", cgv_accepted_user_agent: "Test",
      })
      const commande = db.lastOp("orders", "update")
      expect(commande?.payload).toEqual({
        status: "AWAITING_DEPOSIT", total_amount: 102200, alpha_commission: 4000, deposit_amount: 61320, balance_amount: 40880, validated_by_admin: true,
      })
      expect(commande?.filtres).toContainEqual({ operateur: "eq", colonne: "status", valeur: "PENDING" })
      expect(db.lastOp("import_requests", "update")?.payload).toEqual({ status: "AWAITING_DEPOSIT" })
    })

    it("refuse une facture déjà validée, sans rien réécrire", async () => {
      setup({ validee: "2026-09-22T10:00:00Z" })
      expect((await decider({ action: "validate", cgv_accepted: true })).status).toBe(409)
      expect(db.lastOp("orders", "update")).toBeUndefined()
    })

    it("refuse si le bon de commande a été annulé", async () => {
      setup({ poStatut: "CANCELLED" })
      expect((await decider({ action: "validate", cgv_accepted: true })).status).toBe(409)
      expect(db.lastOp("orders", "update")).toBeUndefined()
    })

    it("répond 409 quand une autre décision est passée avant", async () => {
      setup({ lignesMaj: 0 })
      expect((await decider({ action: "validate", cgv_accepted: true })).status).toBe(409)
      expect(db.lastOp("orders", "update")).toBeUndefined()
    })

    it("réserve la validation au client : ni l'administration ni le partenaire", async () => {
      setup({ compte: ADMIN, role: "ADMIN" })
      expect((await decider({ action: "validate", cgv_accepted: true })).status).toBe(403)
      setup({ compte: PARTENAIRE, role: "PARTNER" })
      expect((await decider({ action: "validate", cgv_accepted: true })).status).toBe(404)
    })
  })

  describe("contestation par le client", () => {
    it("renvoie la facture en brouillon avec le motif, et prévient l'administration", async () => {
      setup()
      expect((await decider({ action: "contest", motif: "" })).status).toBe(400)

      const res = await decider({ action: "contest", motif: "TVA calculée sur le mauvais montant" })
      expect(res.status).toBe(200)
      expect(db.lastOp("invoices", "update")?.payload).toEqual({ status: "DRAFT", contest_reason: "TVA calculée sur le mauvais montant" })
      expect(db.lastOp("notifications", "insert")?.payload).toEqual([expect.objectContaining({ user_id: ADMIN })])
    })
  })

  it("ne laisse pas le client agir sur un brouillon, ni en deviner l'existence", async () => {
    setup({ statut: "DRAFT" })
    expect((await decider({ action: "validate", cgv_accepted: true })).status).toBe(404)
  })

  it("répond 404 à un compte étranger et pour une facture qui n'est pas finale", async () => {
    setup({ compte: INTRUS, role: "BUYER" })
    expect((await decider({ action: "validate", cgv_accepted: true })).status).toBe(404)
    setup({ type: "COMMERCIAL" })
    expect((await decider({ action: "validate", cgv_accepted: true })).status).toBe(404)
  })
})
