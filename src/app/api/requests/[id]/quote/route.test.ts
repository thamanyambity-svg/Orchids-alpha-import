import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Émission d'un devis sur une demande d'importation.
 *
 * Le devis fixe ce que l'acheteur va payer. Deux choses doivent tenir.
 *
 * L'autorisation : seuls l'administration et le partenaire effectivement
 * assigné à cette demande chiffrent. Un partenaire non assigné qui pourrait
 * déposer un devis s'insérerait dans une affaire qui ne lui a pas été confiée.
 *
 * Le calcul : le total est la somme du sous-total et de six postes de frais.
 * Un poste oublié fait un devis sous-évalué, que l'acheteur accepte et qui
 * engage la plateforme sur une marge qui n'existe pas.
 */

const requireUser = vi.fn()
const logAudit = vi.fn()
const sendToN8N = vi.fn((_evt?: unknown, _charge?: unknown) => Promise.resolve() as Promise<unknown>)

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...args: any[]) => requireUser(...args) }
})
vi.mock("@/lib/audit", () => ({ logAudit: (...a: any[]) => logAudit(...a) }))
vi.mock("@/lib/webhooks", () => ({
  sendToN8N: (evt: unknown, charge: unknown) => sendToN8N(evt, charge),
}))
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 19, resetAt: Date.now() + 60000 }),
}))

const { POST, GET } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const UTILISATEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const ACHETEUR = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const PARTENAIRE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
const DEMANDE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

function setup({
  role = "ADMIN",
  assignedPartnerId = PARTENAIRE as string | null,
  partenaireCorrespond = true,
  demandeVisible = true,
  derniereVersion = 2 as number | null,
} = {}) {
  const mock = createSupabaseMock((op) => {
    if (op.table === "import_requests" && op.type === "select") {
      return demandeVisible
        ? {
            data: {
              id: DEMANDE,
              status: "PENDING",
              assigned_partner_id: assignedPartnerId,
              buyer_id: ACHETEUR,
              category: "TEXTILE",
            },
          }
        : { data: null, error: { message: "not found" } }
    }
    if (op.table === "partner_profiles") {
      return { data: partenaireCorrespond ? { id: PARTENAIRE } : null }
    }
    if (op.table === "quotes" && op.type === "select") {
      return { data: derniereVersion === null ? null : { version: derniereVersion } }
    }
    if (op.table === "quotes" && op.type === "insert") {
      return { data: { id: "quote_1", version: (derniereVersion ?? 0) + 1 } }
    }
    if (op.table === "profiles") return { data: { email: "a@b.fr", full_name: "Acheteur" } }
    return { data: null }
  })
  requireUser.mockResolvedValue({ user: { id: UTILISATEUR }, role, supabase: mock.client })
  return mock
}

const DEVIS = {
  request_id: DEMANDE,
  unit_price_usd: 12.5,
  quantity: 100,
  freight_cost_usd: 300,
  insurance_cost_usd: 50,
  customs_duty_estimate_usd: 120,
  inspection_cost_usd: 80,
  handling_fees_usd: 40,
  other_fees_usd: 10,
}

const ctx = { params: Promise.resolve({ id: DEMANDE }) }
const ctxInvalide = { params: Promise.resolve({ id: "demande-1" }) }

describe("POST /api/requests/[id]/quote", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("exige une session", async () => {
    requireUser.mockRejectedValue(new ApiError(401, "Unauthorized"))

    expect((await POST(makeRequest(DEVIS) as any, ctx)).status).toBe(401)
  })

  it("refuse un identifiant de demande qui n'est pas un UUID", async () => {
    const mock = setup()

    const res = await POST(makeRequest(DEVIS) as any, ctxInvalide)

    expect(res.status).toBe(400)
    expect(mock.lastOp("quotes", "insert")).toBeUndefined()
  })

  it("renvoie 404 pour une demande que l'appelant ne voit pas", async () => {
    const mock = setup({ demandeVisible: false })

    const res = await POST(makeRequest(DEVIS) as any, ctx)

    expect(res.status).toBe(404)
    expect(mock.lastOp("quotes", "insert")).toBeUndefined()
  })

  it("refuse un partenaire qui n'est pas celui assigné à la demande", async () => {
    const mock = setup({ role: "PARTNER", partenaireCorrespond: false })

    const res = await POST(makeRequest(DEVIS) as any, ctx)

    expect(res.status).toBe(403)
    expect(mock.lastOp("quotes", "insert")).toBeUndefined()
  })

  it("refuse un acheteur — il consulte, il ne chiffre pas", async () => {
    const mock = setup({ role: "BUYER", partenaireCorrespond: false })

    const res = await POST(makeRequest(DEVIS) as any, ctx)

    expect(res.status).toBe(403)
    expect(mock.lastOp("quotes", "insert")).toBeUndefined()
  })

  it("refuse quand aucun partenaire n'est assigné et que l'appelant n'est pas admin", async () => {
    const mock = setup({ role: "PARTNER", assignedPartnerId: null })

    const res = await POST(makeRequest(DEVIS) as any, ctx)

    expect(res.status).toBe(403)
    expect(mock.lastOp("quotes", "insert")).toBeUndefined()
  })

  it("laisse le partenaire assigné déposer son devis", async () => {
    const mock = setup({ role: "PARTNER", partenaireCorrespond: true })

    const res = await POST(makeRequest(DEVIS) as any, ctx)

    expect(res.status).toBe(200)
    expect(mock.lastOp("quotes", "insert")).toBeDefined()
  })

  it("refuse un prix unitaire nul ou négatif", async () => {
    for (const prix of [0, -1]) {
      vi.clearAllMocks()
      const mock = setup()
      const res = await POST(makeRequest({ ...DEVIS, unit_price_usd: prix }) as any, ctx)
      expect(res.status, String(prix)).toBe(400)
      expect(mock.lastOp("quotes", "insert")).toBeUndefined()
    }
  })

  it("refuse une quantité fractionnaire", async () => {
    const mock = setup()

    const res = await POST(makeRequest({ ...DEVIS, quantity: 2.5 }) as any, ctx)

    expect(res.status).toBe(400)
    expect(mock.lastOp("quotes", "insert")).toBeUndefined()
  })

  it("refuse un incoterm hors nomenclature", async () => {
    const mock = setup()

    const res = await POST(makeRequest({ ...DEVIS, incoterm: "FRANCO" }) as any, ctx)

    expect(res.status).toBe(400)
    expect(mock.lastOp("quotes", "insert")).toBeUndefined()
  })

  it("refuse une validité au-delà de 90 jours", async () => {
    const mock = setup()

    const res = await POST(makeRequest({ ...DEVIS, validity_days: 365 }) as any, ctx)

    expect(res.status).toBe(400)
    expect(mock.lastOp("quotes", "insert")).toBeUndefined()
  })

  it("calcule le sous-total, la somme des frais et le total général", async () => {
    // 12.5 × 100 = 1250 ; frais 300+50+120+80+40+10 = 600 ; total 1850.
    // Un poste oublié fait un devis sous-évalué qui engage la plateforme.
    const mock = setup()

    await POST(makeRequest(DEVIS) as any, ctx)

    expect(mock.lastOp("quotes", "insert")?.payload).toMatchObject({
      subtotal_usd: 1250,
      total_fees_usd: 600,
      grand_total_usd: 1850,
    })
  })

  it("incrémente la version à partir de la dernière connue", async () => {
    const mock = setup({ derniereVersion: 2 })

    await POST(makeRequest(DEVIS) as any, ctx)

    expect(mock.lastOp("quotes", "insert")?.payload.version).toBe(3)
  })

  it("commence à la version 1 quand la demande n'a jamais été chiffrée", async () => {
    const mock = setup({ derniereVersion: null })

    await POST(makeRequest(DEVIS) as any, ctx)

    expect(mock.lastOp("quotes", "insert")?.payload.version).toBe(1)
  })

  it("rattache le devis à la demande de l'URL, pas à celle du corps", async () => {
    // Le corps porte aussi un request_id : le laisser gagner permettrait de
    // déposer un devis sur une demande qu'on n'a pas le droit de chiffrer.
    const mock = setup()

    await POST(
      makeRequest({ ...DEVIS, request_id: "99999999-9999-4999-8999-999999999999" }) as any,
      ctx
    )

    expect(mock.lastOp("quotes", "insert")?.payload.request_id).toBe(DEMANDE)
  })

  it("fait passer la demande en analyse", async () => {
    const mock = setup()

    await POST(makeRequest(DEVIS) as any, ctx)

    expect(mock.lastOp("import_requests", "update")?.payload).toMatchObject({ status: "ANALYSIS" })
  })

  it("trace l'émission avec son montant et son auteur", async () => {
    const mock = setup()

    await POST(makeRequest(DEVIS) as any, ctx)

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CREATE_QUOTE",
        actorId: UTILISATEUR,
        details: expect.objectContaining({ grandTotal: 1850 }),
      })
    )
  })

  it("n'échoue pas quand la notification n8n tombe", async () => {
    // Une notification manquée ne doit pas annuler un devis déjà enregistré.
    const mock = setup()
    sendToN8N.mockRejectedValueOnce(new Error("n8n injoignable"))

    const res = await POST(makeRequest(DEVIS) as any, ctx)

    expect(res.status).toBe(200)
    expect(mock.lastOp("quotes", "insert")).toBeDefined()
  })
})

describe("GET /api/requests/[id]/quote", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("exige une session", async () => {
    requireUser.mockRejectedValue(new ApiError(401, "Unauthorized"))

    expect((await GET(makeRequest(null) as any, ctx)).status).toBe(401)
  })

  it("refuse un identifiant de demande mal formé", async () => {
    setup()

    expect((await GET(makeRequest(null) as any, ctxInvalide)).status).toBe(400)
  })

  it("restreint la lecture à la demande demandée", async () => {
    const mock = setup()

    await GET(makeRequest(null) as any, ctx)

    expect(mock.aFiltre("quotes", "eq", "request_id")).toBe(true)
  })
})
