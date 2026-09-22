import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Préparation et lecture des pro formas d'une demande.
 *
 * Ce qui compte : seul le partenaire affecté (ou l'administration) chiffre ;
 * une pro forma naît en brouillon, invisible du client ; les totaux ne sont
 * jamais envoyés (la base les calcule — les envoyer faisait échouer chaque
 * insertion) ; un seul brouillon à la fois, rien après une acceptation.
 */

const requireUser = vi.fn()
const logAudit = vi.fn((..._a: unknown[]) => Promise.resolve())
let db: ReturnType<typeof createSupabaseMock>

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...a: any[]) => requireUser(...a) }
})
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db.client }))
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => ({ allowed: true }) }))
vi.mock("@/lib/audit", () => ({ logAudit: (...a: unknown[]) => logAudit(...a) }))
vi.mock("@/lib/webhooks", () => ({ sendToN8N: vi.fn(() => Promise.reject(new Error("n8n absent"))) }))

const { POST, GET } = await import("./route")

const DEMANDE = "11111111-1111-4111-8111-111111111111"
const ACHETEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const PARTENAIRE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const FICHE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const ADMIN = "ffffffff-ffff-4fff-8fff-ffffffffffff"
const INTRUS = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"

const ctx = (id = DEMANDE) => ({ params: Promise.resolve({ id }) })

const valide = {
  unit_price_usd: 18500,
  quantity: 2,
  freight_cost_usd: 2400,
  insurance_cost_usd: 185,
  incoterm: "CIF",
  port_loading: "Jebel Ali",
  port_discharge: "Matadi",
  estimated_transit_days: 35,
  validity_days: 30,
}

function setup({
  compte = PARTENAIRE,
  role = "PARTNER",
  fiche = FICHE as string | null,
  existantes = [] as any[],
  statutDemande = "ANALYSIS",
  totauxBase = true,
} = {}) {
  db = createSupabaseMock((op) => {
    if (op.table === "import_requests" && op.type === "select") {
      return { data: { buyer_id: ACHETEUR, assigned_partner_id: fiche, status: statutDemande, reference: "AIX-20260911-2496" } }
    }
    if (op.table === "partner_profiles") return { data: { user_id: PARTENAIRE } }
    if (op.table === "quotes" && op.type === "insert") {
      return { data: { id: "q-new", ...op.payload, grand_total_usd: totauxBase ? 39585 : null } }
    }
    if (op.table === "quotes" && op.type === "update") return { data: { id: "q-new", ...op.payload } }
    if (op.table === "quotes") return { data: existantes }
    if (op.table === "profiles") return { data: [{ id: ADMIN }] }
    return { data: null }
  })
  requireUser.mockResolvedValue({ user: { id: compte }, role, supabase: {} })
}

describe("POST /api/requests/[id]/quote", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("crée un brouillon au nom du partenaire affecté, sans totaux ni transmission", async () => {
    setup()
    const res = await POST(makeRequest(valide), ctx())

    expect(res.status).toBe(201)
    const insertion = db.lastOp("quotes", "insert")?.payload
    expect(insertion).toMatchObject({
      request_id: DEMANDE,
      partner_id: FICHE,
      version: 1,
      status: "DRAFT",
      submitted_at: null,
      valid_until: null,
      unit_price_usd: 18500,
      quantity: 2,
      incoterm: "CIF",
    })
    for (const genere of ["subtotal_usd", "total_fees_usd", "grand_total_usd"]) {
      expect(insertion).not.toHaveProperty(genere)
    }
  })

  it("pose les totaux elle-même si la base ne les calcule pas", async () => {
    setup({ totauxBase: false })
    await POST(makeRequest(valide), ctx())

    expect(db.lastOp("quotes", "update")?.payload).toEqual({ subtotal_usd: 37000, total_fees_usd: 2585, grand_total_usd: 39585 })
  })

  it("incrémente la version à partir de la plus haute connue", async () => {
    setup({ existantes: [{ id: "a", version: 1, status: "REVISED" }, { id: "b", version: 3, status: "REJECTED" }] })
    await POST(makeRequest(valide), ctx())

    expect(db.lastOp("quotes", "insert")?.payload.version).toBe(4)
  })

  it("refuse un second brouillon tant que le premier n'est pas traité", async () => {
    setup({ existantes: [{ id: "a", version: 1, status: "DRAFT" }] })
    expect((await POST(makeRequest(valide), ctx())).status).toBe(409)
    expect(db.lastOp("quotes", "insert")).toBeUndefined()
  })

  it("refuse toute nouvelle version après une acceptation", async () => {
    setup({ existantes: [{ id: "a", version: 1, status: "ACCEPTED" }] })
    expect((await POST(makeRequest(valide), ctx())).status).toBe(409)
  })

  it("interdit au client de chiffrer", async () => {
    setup({ compte: ACHETEUR, role: "BUYER" })
    expect((await POST(makeRequest(valide), ctx())).status).toBe(403)
    expect(db.lastOp("quotes", "insert")).toBeUndefined()
  })

  it("répond 404 à un partenaire non affecté", async () => {
    setup({ compte: INTRUS, role: "PARTNER" })
    expect((await POST(makeRequest(valide), ctx())).status).toBe(404)
    expect(db.lastOp("quotes", "insert")).toBeUndefined()
  })

  it("laisse l'administration préparer, au nom du partenaire assigné", async () => {
    setup({ compte: ADMIN, role: "ADMIN" })
    expect((await POST(makeRequest(valide), ctx())).status).toBe(201)
    expect(db.lastOp("quotes", "insert")?.payload.partner_id).toBe(FICHE)
  })

  it("refuse sans partenaire assigné", async () => {
    setup({ compte: ADMIN, role: "ADMIN", fiche: null })
    expect((await POST(makeRequest(valide), ctx())).status).toBe(400)
  })

  it("refuse un chiffrage invalide", async () => {
    setup()
    for (const corps of [
      { ...valide, unit_price_usd: 0 },
      { ...valide, quantity: 1.5 },
      { ...valide, incoterm: "XYZ" },
      { ...valide, validity_days: 120 },
      { ...valide, freight_cost_usd: -1 },
    ]) {
      expect((await POST(makeRequest(corps), ctx())).status, JSON.stringify(corps)).toBe(400)
    }
    expect(db.lastOp("quotes", "insert")).toBeUndefined()
  })

  it("prévient l'administration et laisse une trace dans la discussion", async () => {
    setup()
    await POST(makeRequest(valide), ctx())

    expect(db.lastOp("notifications", "insert")?.payload).toEqual([
      expect.objectContaining({ user_id: ADMIN, link: `/admin/requests/${DEMANDE}` }),
    ])
    expect(db.lastOp("messages", "insert")?.payload).toMatchObject({ request_id: DEMANDE, sender_id: PARTENAIRE })
    expect(db.lastOp("messages", "insert")?.payload.content).not.toMatch(/\d{3}/) // aucun montant avant validation
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE_QUOTE" }))
  })

  it("passe une demande en attente en analyse", async () => {
    setup({ statutDemande: "PENDING" })
    await POST(makeRequest(valide), ctx())

    expect(db.lastOp("import_requests", "update")?.payload).toMatchObject({ status: "ANALYSIS" })
  })
})

describe("GET /api/requests/[id]/quote", () => {
  beforeEach(() => vi.clearAllMocks())

  const liste = [
    { id: "q3", version: 3, status: "DRAFT", submitted_at: null },
    { id: "q2", version: 2, status: "SUBMITTED", submitted_at: "2026-09-20T10:00:00Z", valid_until: "2000-01-01" },
    { id: "q1", version: 1, status: "REJECTED", submitted_at: null },
  ]

  it("ne montre au client que les pro formas transmises", async () => {
    setup({ compte: ACHETEUR, role: "BUYER", existantes: liste })
    const corps = await (await GET(makeRequest(null), ctx())).json()

    expect(corps.vue).toBe("BUYER")
    expect(corps.quotes.map((q: any) => q.id)).toEqual(["q2"])
  })

  it("signale une pro forma transmise dont la validité est dépassée", async () => {
    setup({ compte: ACHETEUR, role: "BUYER", existantes: liste })
    const corps = await (await GET(makeRequest(null), ctx())).json()

    expect(corps.quotes[0].expiree).toBe(true)
  })

  it("montre tout au partenaire affecté et à l'administration", async () => {
    setup({ existantes: liste })
    expect((await (await GET(makeRequest(null), ctx())).json()).quotes).toHaveLength(3)

    setup({ compte: ADMIN, role: "ADMIN", existantes: liste })
    const admin = await (await GET(makeRequest(null), ctx())).json()
    expect(admin.vue).toBe("ADMIN")
    expect(admin.quotes).toHaveLength(3)
  })

  it("répond 404 à un compte étranger à la demande", async () => {
    setup({ compte: INTRUS, role: "BUYER", existantes: liste })
    expect((await GET(makeRequest(null), ctx())).status).toBe(404)
    expect(db.lastOp("quotes")).toBeUndefined()
  })
})
