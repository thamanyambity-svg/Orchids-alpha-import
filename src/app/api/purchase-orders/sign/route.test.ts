import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Signature d'un bon de commande — l'acte qui engage l'acheteur.
 *
 * C'est le point de non-retour du dispositif : une fois signé, l'acompte de
 * 60 % part sur le compte séquestre. Trois refus doivent donc tenir :
 * seul l'acheteur du bon peut signer, un bon déjà signé ou confirmé ne se
 * resigne pas, et la fenêtre de 48 heures ne se rouvre pas une fois écoulée.
 *
 * Le dernier point mérite un test à part : c'est une comparaison de dates, le
 * genre d'expression qu'on inverse sans s'en apercevoir, et l'erreur ne se
 * voit qu'au bout de deux jours.
 */

const requireUser = vi.fn()
const logAudit = vi.fn()

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...args: any[]) => requireUser(...args) }
})
vi.mock("@/lib/rate-limit", () => ({
  // Le limiteur est une Map partagée entre les tests d'un même fichier : il
  // épuiserait le budget au bout de cinq cas. Il est éprouvé séparément, en
  // conditions réelles ; ici on teste la règle métier, pas le compteur.
  checkRateLimit: () => ({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
}))
vi.mock("@/lib/audit", () => ({ logAudit: (...args: any[]) => logAudit(...args) }))

const { POST } = await import("./route")

const ACHETEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const AUTRE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const BON = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

const HEURE = 3_600_000

function setup({
  buyerId = ACHETEUR,
  status = "PENDING_SIGNATURE",
  cgvAcceptedAt = null as string | null,
  utilisateur = ACHETEUR,
} = {}) {
  const mock = createSupabaseMock((op) => {
    if (op.table === "purchase_orders" && op.type === "select") {
      return {
        data: {
          id: BON,
          buyer_id: buyerId,
          status,
          cgv_accepted_at: cgvAcceptedAt,
          total_amount: 318000,
        },
      }
    }
    if (op.table === "purchase_orders" && op.type === "update") {
      return { data: { id: BON, status: "SIGNED" } }
    }
    return { data: null }
  })
  requireUser.mockResolvedValue({ user: { id: utilisateur }, role: "BUYER", supabase: mock.client })
  return mock
}

function requete(corps: unknown) {
  return makeRequest(corps, { headers: { "x-forwarded-for": "203.0.113.7" } }) as any
}

describe("POST /api/purchase-orders/sign", () => {
  beforeEach(() => vi.clearAllMocks())

  it("refuse un identifiant qui n'est pas un UUID, avant toute lecture", async () => {
    const mock = setup()

    const res = await POST(requete({ po_id: "bon-de-commande-1" }))

    expect(res.status).toBe(400)
    expect(mock.lastOp("purchase_orders")).toBeUndefined()
  })

  it("renvoie 404 quand le bon n'existe pas", async () => {
    const mock = createSupabaseMock(() => ({ data: null, error: { message: "not found" } }))
    requireUser.mockResolvedValue({ user: { id: ACHETEUR }, role: "BUYER", supabase: mock.client })

    const res = await POST(requete({ po_id: BON }))

    expect(res.status).toBe(404)
  })

  it("refuse qu'un autre que l'acheteur signe", async () => {
    const mock = setup({ buyerId: ACHETEUR, utilisateur: AUTRE })

    const res = await POST(requete({ po_id: BON }))

    expect(res.status).toBe(403)
    expect(mock.lastOp("purchase_orders", "update")).toBeUndefined()
  })

  it("refuse un bon déjà confirmé", async () => {
    const mock = setup({ status: "CONFIRMED" })

    const res = await POST(requete({ po_id: BON }))

    expect(res.status).toBe(400)
    expect(mock.lastOp("purchase_orders", "update")).toBeUndefined()
  })

  it("refuse la signature une fois la fenêtre de 48 heures écoulée", async () => {
    const ilYA49h = new Date(Date.now() - 49 * HEURE).toISOString()
    const mock = setup({ cgvAcceptedAt: ilYA49h })

    const res = await POST(requete({ po_id: BON }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringMatching(/48h/i) })
    expect(mock.lastOp("purchase_orders", "update")).toBeUndefined()
  })

  it("accepte la signature à l'intérieur de la fenêtre", async () => {
    const ilYA47h = new Date(Date.now() - 47 * HEURE).toISOString()
    const mock = setup({ cgvAcceptedAt: ilYA47h })

    const res = await POST(requete({ po_id: BON }))

    expect(res.status).toBeLessThan(400)
    expect(mock.lastOp("purchase_orders", "update")).toBeDefined()
  })

  it("accepte un bon jamais signé, donc sans fenêtre ouverte", async () => {
    const mock = setup({ status: "GENERATED", cgvAcceptedAt: null })

    const res = await POST(requete({ po_id: BON }))

    expect(res.status).toBeLessThan(400)
    expect(mock.lastOp("purchase_orders", "update")).toBeDefined()
  })
})
