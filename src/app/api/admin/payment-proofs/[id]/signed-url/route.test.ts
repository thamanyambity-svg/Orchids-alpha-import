import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Lien temporaire vers un justificatif de paiement.
 *
 * Un justificatif est un document bancaire : relevé, ordre de virement, avis
 * d'opération. Le lien produit ici contourne les protections du bucket pendant
 * toute sa durée de vie, et quiconque l'obtient peut le rejouer sans être
 * connecté.
 *
 * D'où deux exigences. L'accès est réservé à l'administration — et le refus
 * doit précéder toute génération, sinon le lien existe déjà quand on répond
 * non. Et chaque accès est journalisé : sur des pièces bancaires, savoir qui a
 * regardé quoi fait partie de la protection.
 */

const requireRole = vi.fn()
const createSignedUrl = vi.fn(() =>
  Promise.resolve({
    data: { signedUrl: "https://cdn.test/justif.pdf?token=x" } as { signedUrl: string } | null,
    error: null as any,
  })
)

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...args: any[]) => requireRole(...args) }
})

const { POST } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const ADMIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const JUSTIF = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

function setup({ trouve = true, cheminFichier = "proofs/2026/justif.pdf" as string | null } = {}) {
  const mock = createSupabaseMock((op) => {
    if (op.table === "payment_proofs") {
      return trouve ? { data: { id: JUSTIF, file_path: cheminFichier } } : { data: null }
    }
    if (op.table === "document_access_logs") return { data: { id: "log_1" } }
    return { data: null }
  })
  mock.client.storage = {
    from: () => ({ createSignedUrl: (...a: any[]) => createSignedUrl(...(a as [])) }),
  }
  requireRole.mockResolvedValue({ user: { id: ADMIN }, role: "ADMIN", supabase: mock.client })
  return mock
}

const ctx = { params: Promise.resolve({ id: JUSTIF }) }

describe("POST /api/admin/payment-proofs/[id]/signed-url", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://cdn.test/justif.pdf?token=x" },
      error: null,
    })
  })

  it("refuse un appelant non administrateur avant de produire le lien", async () => {
    // Le lien contourne le bucket : il ne doit pas exister quand on répond non.
    requireRole.mockRejectedValue(new ApiError(403, "Forbidden: requires one of [ADMIN]"))

    const res = await POST(makeRequest(null) as any, ctx)

    expect(res.status).toBe(403)
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it("refuse un appelant non connecté", async () => {
    requireRole.mockRejectedValue(new ApiError(401, "Unauthorized"))

    const res = await POST(makeRequest(null) as any, ctx)

    expect(res.status).toBe(401)
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it("renvoie 404 pour un justificatif inexistant", async () => {
    setup({ trouve: false })

    const res = await POST(makeRequest(null) as any, ctx)

    expect(res.status).toBe(404)
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it("produit un lien à durée de vie bornée", async () => {
    // Un lien sans expiration serait un accès permanent distribuable.
    setup()

    await POST(makeRequest(null) as any, ctx)

    const [, duree] = createSignedUrl.mock.calls[0] as unknown as [string, number]
    expect(duree).toBeGreaterThan(0)
    expect(duree).toBeLessThanOrEqual(3600)
  })

  it("demande le lien pour le chemin enregistré, pas pour l'identifiant reçu", async () => {
    setup({ cheminFichier: "proofs/2026/justif.pdf" })

    await POST(makeRequest(null) as any, ctx)

    expect((createSignedUrl.mock.calls[0] as unknown as [string])[0]).toBe("proofs/2026/justif.pdf")
  })

  it("journalise l'accès — sur une pièce bancaire, qui a regardé quoi compte", async () => {
    const mock = setup()

    await POST(makeRequest(null) as any, ctx)

    const trace = mock.lastOp("document_access_logs", "insert")?.payload
    expect(trace).toBeDefined()
    expect(JSON.stringify(trace)).toContain(ADMIN)
  })

  it("signale l'échec de génération au lieu de renvoyer un lien vide", async () => {
    setup()
    createSignedUrl.mockResolvedValue({ data: null, error: { message: "objet absent" } })

    const res = await POST(makeRequest(null) as any, ctx)

    expect(res.status).toBe(500)
    const corps = JSON.stringify(await res.json())
    expect(corps).not.toContain("signedUrl")
  })

  it("renvoie le lien à un administrateur", async () => {
    setup()

    const res = await POST(makeRequest(null) as any, ctx)

    expect(res.status).toBe(200)
    expect(JSON.stringify(await res.json())).toContain("https://cdn.test/justif.pdf")
  })
})
