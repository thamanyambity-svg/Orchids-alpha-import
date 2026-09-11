import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock } from "@/test-utils/supabase-mock"

/**
 * Accès aux fichiers privés. La route remplace des liens publics vers des
 * pièces d'identité, des justificatifs de paiement et des factures. Chaque
 * test porte sur une frontière : qui peut ouvrir quoi, et rien au-delà.
 */

const requireUser = vi.fn()
const createSignedUrl = vi.fn((_c?: string, _d?: number) =>
  Promise.resolve({ data: { signedUrl: "https://stockage.test/signe?t=1" } as { signedUrl: string } | null, error: null as any })
)
let service: ReturnType<typeof createSupabaseMock>

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...a: any[]) => requireUser(...a) }
})
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (...a: any[]) => (service.client.from as any)(...a),
    storage: { from: () => ({ createSignedUrl: (c: string, d: number) => createSignedUrl(c, d) }) },
  }),
}))

const { GET } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const MOI = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const AUTRE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const DEMANDE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const COMMANDE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
const FICHE = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"

function setup({
  role = "BUYER",
  acheteur = MOI,
  partenaireAffecte = null as string | null,
  estLePartenaire = false,
} = {}) {
  service = createSupabaseMock((op) => {
    if (op.table === "import_requests") return { data: { buyer_id: acheteur, assigned_partner_id: partenaireAffecte } }
    if (op.table === "partner_profiles") return { data: estLePartenaire ? { id: FICHE } : null }
    if (op.table === "orders") return { data: { id: COMMANDE, request: { buyer_id: acheteur } } }
    return { data: null }
  })
  requireUser.mockResolvedValue({ user: { id: MOI }, role, supabase: {} })
}

const appel = (bucket: string, path: string) =>
  GET(new Request(`https://site.test/api/files/${bucket}?path=${encodeURIComponent(path)}`) as any, {
    params: Promise.resolve({ bucket }),
  })

describe("GET /api/files/[bucket]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("exige une session", async () => {
    setup()
    requireUser.mockRejectedValue(new ApiError(401, "Unauthorized"))

    expect((await appel("documents", `kyc/${MOI}/a.pdf`)).status).toBe(401)
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it("refuse un espace qui n'est pas prévu", async () => {
    setup({ role: "ADMIN" })
    expect((await appel("avatars", "x/a.png")).status).toBe(404)
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it("refuse les chemins de remontée ou exotiques, même pour un administrateur", async () => {
    setup({ role: "ADMIN" })
    for (const p of ["../secrets", "kyc/../../x", "/kyc/a", "kyc//a", "kyc/a b.pdf", ""]) {
      expect((await appel("documents", p)).status, p).toBe(400)
    }
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it("ouvre sa propre pièce KYC par un lien signé de courte durée", async () => {
    setup()

    const res = await appel("documents", `kyc/${MOI}/piece.pdf`)

    expect(res.status).toBe(302)
    expect(res.headers.get("location")).toBe("https://stockage.test/signe?t=1")
    const [, duree] = createSignedUrl.mock.calls[0] as [string, number]
    // Dix minutes au plus : assez pour lire une vidéo de la discussion par
    // morceaux avec le même lien, trop peu pour en faire un lien de partage.
    expect(duree).toBeGreaterThan(0)
    expect(duree).toBeLessThanOrEqual(600)
  })

  it("refuse la pièce KYC d'un autre, en 404 pour ne pas confirmer qu'elle existe", async () => {
    setup()

    const res = await appel("documents", `kyc/${AUTRE}/piece.pdf`)

    expect(res.status).toBe(404)
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it("laisse l'administrateur ouvrir n'importe quelle pièce", async () => {
    setup({ role: "ADMIN" })
    expect((await appel("documents", `kyc/${AUTRE}/piece.pdf`)).status).toBe(302)
  })

  it("laisse l'acheteur ouvrir les documents de sa demande", async () => {
    setup({ acheteur: MOI })
    expect((await appel("documents", `requests/${DEMANDE}/facture.pdf`)).status).toBe(302)
  })

  it("laisse le partenaire affecté ouvrir les documents de la demande", async () => {
    setup({ role: "PARTNER", acheteur: AUTRE, partenaireAffecte: FICHE, estLePartenaire: true })
    expect((await appel("documents", `requests/${DEMANDE}/facture.pdf`)).status).toBe(302)
  })

  it("refuse un partenaire qui n'est pas celui de la demande", async () => {
    setup({ role: "PARTNER", acheteur: AUTRE, partenaireAffecte: FICHE, estLePartenaire: false })
    expect((await appel("documents", `requests/${DEMANDE}/facture.pdf`)).status).toBe(404)
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it("refuse les documents d'une demande à un autre acheteur", async () => {
    setup({ acheteur: AUTRE })
    expect((await appel("documents", `requests/${DEMANDE}/facture.pdf`)).status).toBe(404)
  })

  it("laisse l'acheteur ouvrir le justificatif de paiement de sa commande", async () => {
    setup({ acheteur: MOI })
    expect((await appel("documents", `payment-proofs/${COMMANDE}/1.pdf`)).status).toBe(302)
  })

  it("refuse le justificatif d'une commande qui n'est pas la sienne", async () => {
    setup({ acheteur: AUTRE })
    expect((await appel("documents", `payment-proofs/${COMMANDE}/1.pdf`)).status).toBe(404)
  })

  it("laisse l'acheteur ouvrir la facture de sa commande", async () => {
    setup({ acheteur: MOI })
    expect((await appel("invoices", `${COMMANDE}/INV-COM-2026-DDDDDDDD.pdf`)).status).toBe(302)
  })

  it("refuse la facture d'une commande qui n'est pas la sienne", async () => {
    setup({ acheteur: AUTRE })
    expect((await appel("invoices", `${COMMANDE}/INV.pdf`)).status).toBe(404)
  })

  it("réserve les pièces légales des candidatures à l'administration", async () => {
    setup({ role: "BUYER" })
    expect((await appel("compliance-documents", "partner-applications/x.pdf")).status).toBe(404)
    setup({ role: "PARTNER" })
    expect((await appel("compliance-documents", "partner-applications/x.pdf")).status).toBe(404)
    setup({ role: "ADMIN" })
    expect((await appel("compliance-documents", "partner-applications/x.pdf")).status).toBe(302)
  })

  it("renvoie 404 quand le fichier n'existe pas dans l'espace", async () => {
    setup({ role: "ADMIN" })
    createSignedUrl.mockResolvedValueOnce({ data: null, error: { message: "Object not found" } })
    expect((await appel("documents", `kyc/${AUTRE}/absent.pdf`)).status).toBe(404)
  })
})
