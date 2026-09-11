import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Assignation d'une demande à un partenaire. Le bouton de la fiche n'était
 * relié à rien ; l'action existait côté serveur mais écrivait avec la session
 * et acceptait n'importe quel identifiant. Ce qui compte : réservée à
 * l'administration, un partenaire existant et sous contrat actif, pas de
 * retour en arrière d'un dossier avancé, et le partenaire est prévenu.
 */

const requireRole = vi.fn()
const sendToN8N = vi.fn((..._a: unknown[]) => Promise.resolve())
let service: ReturnType<typeof createSupabaseMock>

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...a: any[]) => requireRole(...a) }
})
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => service.client }))
vi.mock("@/lib/webhooks", () => ({ sendToN8N: (...a: unknown[]) => sendToN8N(...a) }))
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(() => Promise.resolve()) }))
vi.mock("@/lib/payments/auto-debit.service", () => ({ processAutomaticDebit: vi.fn() }))
vi.mock("@/lib/admin-audit", () => ({
  logAdminAccess: vi.fn(() => Promise.resolve()),
  getAdminAuditMetadata: () => ({ ip: "127.0.0.1", userAgent: "test" }),
}))
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => ({ allowed: true }) }))

const { POST } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const DEMANDE = "11111111-1111-4111-8111-111111111111"
const FICHE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const COMPTE_PARTENAIRE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

function setup({
  fiche = { id: FICHE, user_id: COMPTE_PARTENAIRE, contract_status: "ACTIVE" } as any,
  statut = "PENDING" as string | null,
  lignesMaj = 1,
} = {}) {
  service = createSupabaseMock((op) => {
    if (op.table === "partner_profiles") return { data: fiche }
    if (op.table === "import_requests" && op.type === "select") return { data: statut ? { id: DEMANDE, status: statut } : null }
    if (op.table === "import_requests" && op.type === "update") {
      return { data: lignesMaj ? { id: DEMANDE, reference: "AIX-20260910-6745", ...op.payload } : null }
    }
    return { data: null }
  })
  requireRole.mockResolvedValue({ user: { id: "admin-1" }, role: "ADMIN", supabase: {} })
}

const assigner = (partnerId: unknown = FICHE) =>
  POST(makeRequest({ action: "ASSIGN_PARTNER", requestId: DEMANDE, data: { partnerId } }))

describe("POST /api/admin/requests — ASSIGN_PARTNER", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("est réservée à l'administration", async () => {
    setup()
    requireRole.mockRejectedValue(new ApiError(403, "Forbidden"))

    expect((await assigner()).status).toBe(403)
    expect(service.lastOp("import_requests", "update")).toBeUndefined()
  })

  it("affecte le partenaire et passe une demande neuve en analyse", async () => {
    setup()
    const res = await assigner()

    expect(res.status).toBe(200)
    const maj = service.lastOp("import_requests", "update")
    expect(maj?.payload).toMatchObject({ assigned_partner_id: FICHE, status: "ANALYSIS" })
    expect(maj?.filtres).toContainEqual({ operateur: "eq", colonne: "id", valeur: DEMANDE })
  })

  it("ne fait pas reculer un dossier déjà avancé", async () => {
    setup({ statut: "QUOTE_ACCEPTED" })
    await assigner()

    expect(service.lastOp("import_requests", "update")?.payload.status).toBe("QUOTE_ACCEPTED")
  })

  it("refuse un identifiant de partenaire mal formé ou absent", async () => {
    setup()
    for (const v of [null, "", "abc", 42]) {
      expect((await assigner(v)).status, String(v)).toBe(400)
    }
    // Sans `data` du tout (l'appel par défaut de `assigner` fournirait un identifiant valide).
    expect((await POST(makeRequest({ action: "ASSIGN_PARTNER", requestId: DEMANDE }))).status).toBe(400)
    expect(service.lastOp("import_requests", "update")).toBeUndefined()
  })

  it("refuse un partenaire inexistant", async () => {
    setup({ fiche: null })
    expect((await assigner()).status).toBe(404)
    expect(service.lastOp("import_requests", "update")).toBeUndefined()
  })

  it("refuse un partenaire dont le contrat n'est pas actif", async () => {
    setup({ fiche: { id: FICHE, user_id: COMPTE_PARTENAIRE, contract_status: "SUSPENDED" } })
    expect((await assigner()).status).toBe(400)
    expect(service.lastOp("import_requests", "update")).toBeUndefined()
  })

  it("répond 404 pour une demande inexistante", async () => {
    setup({ statut: null })
    expect((await assigner()).status).toBe(404)
  })

  it("répond 404, pas un succès, quand la mise à jour ne touche aucune ligne", async () => {
    setup({ lignesMaj: 0 })
    expect((await assigner()).status).toBe(404)
  })

  it("prévient le partenaire dans son espace", async () => {
    setup()
    await assigner()

    expect(service.lastOp("notifications", "insert")?.payload).toMatchObject({
      user_id: COMPTE_PARTENAIRE,
      channel: "status_change",
      link: `/partner/requests/${DEMANDE}`,
    })
    expect(sendToN8N).toHaveBeenCalledWith("partner_assigned", expect.anything())
  })
})
