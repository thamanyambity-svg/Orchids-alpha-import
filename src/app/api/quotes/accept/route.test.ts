import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Acceptation d'un devis — le point où l'acheteur s'engage financièrement.
 *
 * Quatre refus doivent tenir, et chacun protège de l'argent :
 *   · seul l'acheteur du dossier peut accepter — sinon un tiers engage
 *     quelqu'un d'autre sur plusieurs centaines de milliers de dollars ;
 *   · un devis déjà accepté ou rejeté ne se réaccepte pas ;
 *   · un devis périmé n'engage plus au prix affiché ;
 *   · un identifiant qui n'est pas un UUID est refusé avant toute lecture.
 */

const requireUser = vi.fn()
const logAudit = vi.fn()

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...args: any[]) => requireUser(...args) }
})
vi.mock("@/lib/audit", () => ({ logAudit: (...args: any[]) => logAudit(...args) }))

const { POST } = await import("./route")

const ACHETEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const AUTRE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const DEVIS = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

function setup({
  buyerId = ACHETEUR,
  status = "SUBMITTED",
  validUntil = null as string | null,
  utilisateur = ACHETEUR,
} = {}) {
  const mock = createSupabaseMock((op) => {
    if (op.table === "quotes" && op.type === "select") {
      return {
        data: {
          id: DEVIS,
          status,
          valid_until: validUntil,
          total_amount: 318000,
          request: { buyer_id: buyerId, status: "ANALYSIS", category: "GENERAL", reference: "AIX-1" },
        },
      }
    }
    if (op.table === "quotes" && op.type === "update") {
      return { data: { id: DEVIS, status: "ACCEPTED" } }
    }
    return { data: null }
  })
  requireUser.mockResolvedValue({ user: { id: utilisateur }, role: "BUYER", supabase: mock.client })
  return mock
}

describe("POST /api/quotes/accept", () => {
  beforeEach(() => vi.clearAllMocks())

  it("refuse un identifiant qui n'est pas un UUID, avant toute lecture", async () => {
    const mock = setup()

    const res = await POST(makeRequest({ quote_id: "pas-un-uuid" }) as any)

    expect(res.status).toBe(400)
    expect(mock.lastOp("quotes")).toBeUndefined()
  })

  it("refuse qu'un autre que l'acheteur accepte le devis", async () => {
    const mock = setup({ buyerId: ACHETEUR, utilisateur: AUTRE })

    const res = await POST(makeRequest({ quote_id: DEVIS }) as any)

    expect(res.status).toBe(403)
    expect(mock.lastOp("quotes", "update")).toBeUndefined()
  })

  it("refuse un devis qui n'est plus au statut soumis", async () => {
    const mock = setup({ status: "ACCEPTED" })

    const res = await POST(makeRequest({ quote_id: DEVIS }) as any)

    expect(res.status).toBe(400)
    expect(mock.lastOp("quotes", "update")).toBeUndefined()
  })

  it("refuse un devis périmé", async () => {
    const hier = new Date(Date.now() - 86_400_000).toISOString()
    const mock = setup({ validUntil: hier })

    const res = await POST(makeRequest({ quote_id: DEVIS }) as any)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringMatching(/expired/i) })
    expect(mock.lastOp("quotes", "update")).toBeUndefined()
  })

  it("accepte un devis valide de l'acheteur du dossier", async () => {
    const demain = new Date(Date.now() + 86_400_000).toISOString()
    const mock = setup({ validUntil: demain })

    const res = await POST(makeRequest({ quote_id: DEVIS }) as any)

    expect(res.status).toBeLessThan(400)
    expect(mock.lastOp("quotes", "update")?.payload).toMatchObject({ status: "ACCEPTED" })
  })

  it("renvoie 404 quand le devis n'existe pas", async () => {
    const mock = createSupabaseMock(() => ({ data: null, error: { message: "not found" } }))
    requireUser.mockResolvedValue({ user: { id: ACHETEUR }, role: "BUYER", supabase: mock.client })

    const res = await POST(makeRequest({ quote_id: DEVIS }) as any)

    expect(res.status).toBe(404)
  })
})
