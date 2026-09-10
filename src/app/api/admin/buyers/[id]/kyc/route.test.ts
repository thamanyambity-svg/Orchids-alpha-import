import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Décision KYC. Avant cette route, la page écrivait depuis le navigateur, où
 * l'administrateur n'a qu'un droit de lecture : chaque validation affichait un
 * succès et ne changeait rien. Les tests portent sur ce qui l'empêche de se
 * reproduire — l'écriture par la clé de service, et le refus d'un succès à
 * zéro ligne.
 */

const requireRole = vi.fn()
const logAudit = vi.fn()
let service: ReturnType<typeof createSupabaseMock>

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...a: any[]) => requireRole(...a) }
})
vi.mock("@/lib/audit", () => ({ logAudit: (...a: any[]) => logAudit(...a) }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => service.client }))

const { PATCH } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const ADMIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const ACHETEUR = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const ctx = (id = ACHETEUR) => ({ params: Promise.resolve({ id }) })

function setup({ lignes = 1 } = {}) {
  service = createSupabaseMock((op) =>
    op.table === "buyer_profiles" && op.type === "update"
      ? { data: Array.from({ length: lignes }, () => ({ user_id: ACHETEUR, kyc_status: op.payload.kyc_status })) }
      : { data: null }
  )
  requireRole.mockResolvedValue({ user: { id: ADMIN }, role: "ADMIN", supabase: {} })
}

describe("PATCH /api/admin/buyers/[id]/kyc", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("refuse un non-administrateur sans rien écrire", async () => {
    setup()
    requireRole.mockRejectedValue(new ApiError(403, "Forbidden: requires one of [ADMIN]"))

    expect((await PATCH(makeRequest({ decision: "VERIFIED" }) as any, ctx())).status).toBe(403)
    expect(service.ops.length).toBe(0)
  })

  it("refuse un identifiant qui n'est pas un UUID", async () => {
    setup()
    expect((await PATCH(makeRequest({ decision: "VERIFIED" }) as any, ctx("acheteur-1"))).status).toBe(400)
    expect(service.ops.length).toBe(0)
  })

  it("refuse une décision hors nomenclature", async () => {
    setup()
    for (const decision of ["APPROVED", "IN_PROGRESS", "", null]) {
      expect((await PATCH(makeRequest({ decision }) as any, ctx())).status, String(decision)).toBe(400)
    }
    expect(service.ops.length).toBe(0)
  })

  it("exige un motif pour un refus", async () => {
    setup()
    expect((await PATCH(makeRequest({ decision: "REJECTED" }) as any, ctx())).status).toBe(400)
    expect((await PATCH(makeRequest({ decision: "REJECTED", motif: " " }) as any, ctx())).status).toBe(400)
    expect(service.ops.length).toBe(0)
  })

  it("valide le KYC par la clé de service, sur la ligne de cet acheteur", async () => {
    setup()

    const res = await PATCH(makeRequest({ decision: "VERIFIED" }) as any, ctx())

    expect(res.status).toBe(200)
    expect(service.lastOp("buyer_profiles", "update")?.payload).toEqual({ kyc_status: "VERIFIED" })
    expect(service.aFiltre("buyer_profiles", "eq", "user_id")).toBe(true)
  })

  it("refuse d'annoncer un succès quand aucune ligne n'est modifiée", async () => {
    // L'échec silencieux d'origine : la page disait « vérifié », rien ne l'était.
    setup({ lignes: 0 })

    const res = await PATCH(makeRequest({ decision: "VERIFIED" }) as any, ctx())

    expect(res.status).toBe(404)
    expect(logAudit).not.toHaveBeenCalled()
  })

  it("trace la décision et son auteur", async () => {
    setup()

    await PATCH(makeRequest({ decision: "VERIFIED" }) as any, ctx())

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "KYC_VERIFIED", actorId: ADMIN, targetId: ACHETEUR })
    )
  })

  it("conserve le motif d'un refus au journal d'audit", async () => {
    setup()

    await PATCH(makeRequest({ decision: "REJECTED", motif: "Pièce d'identité illisible" }) as any, ctx())

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "KYC_REJECTED", details: { motif: "Pièce d'identité illisible" } })
    )
  })
})
