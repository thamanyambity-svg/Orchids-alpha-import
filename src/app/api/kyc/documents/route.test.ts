import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock } from "@/test-utils/supabase-mock"

/**
 * Envoi d'une pièce KYC. Chaque envoi échouait auparavant, et le fichier était
 * exposé par lien public. Les tests portent sur le chemin imposé par la
 * session, le rangement dans `kyc_documents`, le passage du statut et le
 * nettoyage d'un fichier qui ne peut pas être rattaché.
 */

const requireRole = vi.fn()
const upload = vi.fn((_c?: string, _b?: unknown, _o?: unknown) => Promise.resolve({ error: null as any }))
const remove = vi.fn((_c?: string[]) => Promise.resolve({ error: null }))
let service: ReturnType<typeof createSupabaseMock>

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...a: any[]) => requireRole(...a) }
})
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (...a: any[]) => (service.client.from as any)(...a),
    storage: { from: () => ({ upload: (c: string, b: unknown, o: unknown) => upload(c, b, o), remove: (c: string[]) => remove(c) }) },
  }),
}))

const { POST } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const MOI = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"

function fichier({ type = "application/pdf", size = 2048, name = "passeport.pdf" } = {}) {
  return { name, type, size, arrayBuffer: async () => new ArrayBuffer(size) }
}

function requete(champs: Record<string, unknown>) {
  return { formData: async () => ({ get: (k: string) => champs[k] ?? null }) } as any
}

function setup({ profil = { user_id: MOI, kyc_status: "NOT_STARTED", kyc_documents: [] } as any, lignesMaj = 1 } = {}) {
  service = createSupabaseMock((op) => {
    if (op.table === "buyer_profiles" && op.type === "select") return { data: profil }
    if (op.table === "buyer_profiles" && op.type === "update") return { data: Array.from({ length: lignesMaj }, () => ({ user_id: MOI })) }
    return { data: null }
  })
  requireRole.mockResolvedValue({ user: { id: MOI }, role: "BUYER", supabase: {} })
}

describe("POST /api/kyc/documents", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("réserve l'envoi aux acheteurs", async () => {
    setup()
    requireRole.mockRejectedValue(new ApiError(403, "Forbidden"))

    expect((await POST(requete({ file: fichier(), type: "PASSPORT" }))).status).toBe(403)
    expect(upload).not.toHaveBeenCalled()
  })

  it("refuse un envoi sans fichier", async () => {
    setup()
    expect((await POST(requete({ type: "PASSPORT" }))).status).toBe(400)
    expect(upload).not.toHaveBeenCalled()
  })

  it("refuse un format hors liste", async () => {
    setup()
    expect((await POST(requete({ file: fichier({ type: "application/x-msdownload" }), type: "PASSPORT" }))).status).toBe(400)
    expect(upload).not.toHaveBeenCalled()
  })

  it("refuse un fichier de plus de 10 Mo", async () => {
    setup()
    expect((await POST(requete({ file: fichier({ size: 11 * 1024 * 1024 }), type: "PASSPORT" }))).status).toBe(400)
    expect(upload).not.toHaveBeenCalled()
  })

  it("refuse un type de pièce vide", async () => {
    setup()
    expect((await POST(requete({ file: fichier(), type: " " }))).status).toBe(400)
  })

  it("dépose sous le dossier du compte de la session, jamais un chemin choisi par l'appelant", async () => {
    setup()

    await POST(requete({ file: fichier(), type: "PASSPORT", path: "kyc/autre/pirate.pdf" }))

    const [chemin] = upload.mock.calls[0] as [string]
    expect(chemin.startsWith(`kyc/${MOI}/`)).toBe(true)
    expect(chemin.endsWith(".pdf")).toBe(true)
  })

  it("range la pièce dans kyc_documents et passe le KYC en cours", async () => {
    setup()

    const res = await POST(requete({ file: fichier(), type: "PASSPORT" }))

    expect(res.status).toBe(200)
    const maj = service.lastOp("buyer_profiles", "update")?.payload
    expect(maj.kyc_status).toBe("IN_PROGRESS")
    expect(maj.kyc_documents).toHaveLength(1)
    expect(maj.kyc_documents[0]).toMatchObject({ type: "PASSPORT", name: "passeport.pdf", mime: "application/pdf" })
  })

  it("ajoute aux pièces existantes au lieu de les remplacer", async () => {
    setup({ profil: { user_id: MOI, kyc_status: "IN_PROGRESS", kyc_documents: [{ path: "kyc/x/1.pdf" }] } })

    await POST(requete({ file: fichier(), type: "RCCM" }))

    expect(service.lastOp("buyer_profiles", "update")?.payload.kyc_documents).toHaveLength(2)
  })

  it("ne rétrograde pas un KYC déjà validé", async () => {
    setup({ profil: { user_id: MOI, kyc_status: "VERIFIED", kyc_documents: [] } })

    await POST(requete({ file: fichier(), type: "RCCM" }))

    expect(service.lastOp("buyer_profiles", "update")?.payload.kyc_status).toBe("VERIFIED")
  })

  it("renvoie un lien par la route d'accès, jamais un lien public", async () => {
    setup()

    const { document } = await (await POST(requete({ file: fichier(), type: "PASSPORT" }))).json()

    expect(document.url.startsWith("/api/files/documents?path=")).toBe(true)
  })

  it("retire le fichier déposé quand il ne peut pas être rattaché au profil", async () => {
    // Une pièce d'identité sans propriétaire dans l'espace est une fuite en attente.
    setup({ lignesMaj: 0 })

    const res = await POST(requete({ file: fichier(), type: "PASSPORT" }))

    expect(res.status).toBe(404)
    const [chemin] = upload.mock.calls[0] as [string]
    expect(remove).toHaveBeenCalledWith([chemin])
  })

  it("ne dépose rien quand le profil acheteur n'existe pas", async () => {
    setup({ profil: null })

    expect((await POST(requete({ file: fichier(), type: "PASSPORT" }))).status).toBe(404)
    expect(upload).not.toHaveBeenCalled()
  })
})
