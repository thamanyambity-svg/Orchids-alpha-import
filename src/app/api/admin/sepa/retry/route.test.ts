import { describe, it, expect, vi, beforeEach } from "vitest"
import { makeRequest } from "@/test-utils/supabase-mock"

/**
 * Relance manuelle d'un prélèvement SEPA en échec.
 *
 * La route relance un mouvement d'argent : elle doit être réservée aux
 * administrateurs, et ne rien lancer quand l'entrée est douteuse.
 *
 * Le contrôle de rôle était réécrit à la main ici plutôt que confié au garde
 * partagé. Ces tests vérifient que la règle est bien celle du garde — qui est
 * le seul endroit testé — et surtout que le service n'est jamais atteint quand
 * elle échoue.
 */

const requireRole = vi.fn()
const initiateRetry = vi.fn((..._args: any[]) =>
  Promise.resolve({ success: true, retryId: "retry_1" })
)

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...args: any[]) => requireRole(...args) }
})
vi.mock("@/lib/payments/sepa-admin.utils", () => ({
  initiateRetryForFailedSEPA: (...args: any[]) => initiateRetry(...args),
}))

const { POST } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const ADMIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const TRANSACTION = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

describe("POST /api/admin/sepa/retry", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireRole.mockResolvedValue({ user: { id: ADMIN }, role: "ADMIN", supabase: {} })
  })

  it("exige le rôle administrateur", async () => {
    // Le garde partagé lève ; la route ne doit pas atteindre le service.
    requireRole.mockRejectedValue(new ApiError(403, "Forbidden: requires one of [ADMIN]"))

    const res = await POST(makeRequest({ transactionId: TRANSACTION }) as any)

    expect(res.status).toBe(403)
    expect(initiateRetry).not.toHaveBeenCalled()
  })

  it("répond 401 pour un appelant non connecté, sans relancer", async () => {
    requireRole.mockRejectedValue(new ApiError(401, "Unauthorized"))

    const res = await POST(makeRequest({ transactionId: TRANSACTION }) as any)

    expect(res.status).toBe(401)
    expect(initiateRetry).not.toHaveBeenCalled()
  })

  it("refuse un identifiant de transaction qui n'est pas un UUID", async () => {
    const res = await POST(makeRequest({ transactionId: "tx-42" }) as any)

    expect(res.status).toBe(400)
    expect(initiateRetry).not.toHaveBeenCalled()
  })

  it("refuse une charge vide", async () => {
    const res = await POST(makeRequest({}) as any)

    expect(res.status).toBe(400)
    expect(initiateRetry).not.toHaveBeenCalled()
  })

  it("relance la transaction en enregistrant l'administrateur à l'origine", async () => {
    const res = await POST(makeRequest({ transactionId: TRANSACTION }) as any)

    expect(res.status).toBe(200)
    // L'auteur de la relance est tracé : une relance de prélèvement doit être
    // imputable à quelqu'un.
    expect(initiateRetry).toHaveBeenCalledWith(TRANSACTION, ADMIN)
  })

  it("remonte l'échec du service sans le maquiller en succès", async () => {
    initiateRetry.mockRejectedValueOnce(new Error("Stripe refused the retry"))

    const res = await POST(makeRequest({ transactionId: TRANSACTION }) as any)

    expect(res.status).toBe(500)
  })
})
