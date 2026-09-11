import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Discussion d'une demande. Ce qui compte : seuls l'acheteur, le partenaire
 * affecté et l'administration y accèdent ; l'expéditeur vient de la session ;
 * un fichier ne peut être rattaché que depuis le dossier de CETTE demande.
 */

const requireUser = vi.fn()
let db: ReturnType<typeof createSupabaseMock>

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...a: any[]) => requireUser(...a) }
})
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db.client }))
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => ({ allowed: true }) }))

const { GET, POST } = await import("./route")

const DEMANDE = "11111111-1111-4111-8111-111111111111"
const ACHETEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const PARTENAIRE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const FICHE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const INTRUS = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
const ADMIN = "ffffffff-ffff-4fff-8fff-ffffffffffff"

const ctx = (id = DEMANDE) => ({ params: Promise.resolve({ id }) })

function setup({ compte = ACHETEUR, role = "BUYER", demande = { buyer_id: ACHETEUR, assigned_partner_id: FICHE } as any } = {}) {
  db = createSupabaseMock((op) => {
    if (op.table === "import_requests") return { data: demande }
    if (op.table === "partner_profiles") return { data: { user_id: PARTENAIRE } }
    if (op.table === "messages" && op.type === "insert") {
      return { data: { id: "m-new", created_at: "2026-09-11T10:00:00Z", ...op.payload } }
    }
    if (op.table === "messages") {
      return {
        data: [
          { id: "m2", content: "Réponse", created_at: "2026-09-11T09:05:00Z", sender_id: PARTENAIRE, attachments: [] },
          {
            id: "m1",
            content: "Voici la photo",
            created_at: "2026-09-11T09:00:00Z",
            sender_id: ACHETEUR,
            attachments: [{ path: `requests/${DEMANDE}/chat/1.jpg`, name: "modele.jpg", mime: "image/jpeg", size: 1000 }],
          },
        ],
      }
    }
    if (op.table === "profiles") {
      return { data: [{ id: ACHETEUR, full_name: "Client Test", role: "BUYER" }, { id: PARTENAIRE, full_name: "Achignon", role: "PARTNER" }] }
    }
    return { data: null }
  })
  requireUser.mockResolvedValue({ user: { id: compte }, role, supabase: {} })
}

const piece = (extra: Record<string, unknown> = {}) => ({
  path: `requests/${DEMANDE}/chat/1700000000000-abc123.mp4`,
  name: "video.mp4",
  mime: "video/mp4",
  size: 20 * 1024 * 1024,
  ...extra,
})

describe("GET /api/requests/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("donne le fil à l'acheteur, dans l'ordre chronologique, avec des liens privés", async () => {
    setup()
    const res = await GET(makeRequest(null), ctx())
    const corps = await res.json()

    expect(res.status).toBe(200)
    expect(corps.me).toBe(ACHETEUR)
    expect(corps.messages.map((m: any) => m.id)).toEqual(["m1", "m2"])
    expect(corps.messages[0].attachments[0].url).toBe(`/api/files/documents?path=${encodeURIComponent(`requests/${DEMANDE}/chat/1.jpg`)}`)
    expect(corps.messages[1].sender).toEqual({ full_name: "Achignon", role: "PARTNER" })
  })

  it("donne le fil au partenaire affecté", async () => {
    setup({ compte: PARTENAIRE, role: "PARTNER" })
    expect((await GET(makeRequest(null), ctx())).status).toBe(200)
  })

  it("donne le fil à l'administration, même sans y participer", async () => {
    setup({ compte: ADMIN, role: "ADMIN" })
    expect((await GET(makeRequest(null), ctx())).status).toBe(200)
  })

  it("répond 404 à un compte étranger à la demande, sans lire les messages", async () => {
    setup({ compte: INTRUS, role: "BUYER" })
    const res = await GET(makeRequest(null), ctx())

    expect(res.status).toBe(404)
    expect(db.lastOp("messages")).toBeUndefined()
  })

  it("répond 404 à un partenaire non affecté", async () => {
    setup({ compte: INTRUS, role: "PARTNER" })
    expect((await GET(makeRequest(null), ctx())).status).toBe(404)
  })

  it("répond 404 pour une demande inexistante", async () => {
    setup({ demande: null })
    expect((await GET(makeRequest(null), ctx())).status).toBe(404)
  })

  it("refuse un identifiant mal formé sans interroger la base", async () => {
    setup()
    expect((await GET(makeRequest(null), ctx("abc"))).status).toBe(400)
    expect(db.ops.length).toBe(0)
  })
})

describe("POST /api/requests/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("enregistre le message au nom de la session, adressé à tous", async () => {
    setup()
    const res = await POST(makeRequest({ content: "  Couleur noire svp  ", sender_id: INTRUS }), ctx())

    expect(res.status).toBe(200)
    expect(db.lastOp("messages", "insert")?.payload).toEqual({
      request_id: DEMANDE,
      sender_id: ACHETEUR,
      recipient_id: null,
      content: "Couleur noire svp",
      attachments: [],
    })
  })

  it("accepte une vidéo déposée dans le dossier de la discussion", async () => {
    setup()
    const res = await POST(makeRequest({ content: "", attachments: [piece({ extra: "ignoré" })] }), ctx())

    expect(res.status).toBe(200)
    expect(db.lastOp("messages", "insert")?.payload.attachments).toEqual([
      { path: piece().path, name: "video.mp4", mime: "video/mp4", size: 20 * 1024 * 1024 },
    ])
  })

  it("refuse un fichier d'un autre dossier", async () => {
    setup()
    for (const path of [
      `requests/22222222-2222-4222-8222-222222222222/chat/x.mp4`,
      `kyc/${ACHETEUR}/passeport.pdf`,
      `requests/${DEMANDE}/chat/../../kyc/x.pdf`,
      `requests/${DEMANDE}/x.pdf`,
    ]) {
      expect((await POST(makeRequest({ attachments: [piece({ path })] }), ctx())).status, path).toBe(400)
    }
    expect(db.lastOp("messages", "insert")).toBeUndefined()
  })

  it("refuse un format ou une taille hors limites", async () => {
    setup()
    expect((await POST(makeRequest({ attachments: [piece({ mime: "application/x-msdownload" })] }), ctx())).status).toBe(400)
    expect((await POST(makeRequest({ attachments: [piece({ size: 51 * 1024 * 1024 })] }), ctx())).status).toBe(400)
    expect(db.lastOp("messages", "insert")).toBeUndefined()
  })

  it("refuse un message vide ou trop long", async () => {
    setup()
    expect((await POST(makeRequest({ content: "   " }), ctx())).status).toBe(400)
    expect((await POST(makeRequest({ content: "x".repeat(4001) }), ctx())).status).toBe(400)
  })

  it("interdit l'écriture à un compte étranger à la demande", async () => {
    setup({ compte: INTRUS, role: "PARTNER" })
    const res = await POST(makeRequest({ content: "bonjour" }), ctx())

    expect(res.status).toBe(404)
    expect(db.lastOp("messages", "insert")).toBeUndefined()
  })

  it("prévient les autres participants, pas l'expéditeur", async () => {
    setup()
    await POST(makeRequest({ content: "Nouvelle précision" }), ctx())

    const notes = db.lastOp("notifications", "insert")?.payload
    expect(notes).toEqual([
      expect.objectContaining({ user_id: PARTENAIRE, channel: "message", type: "info", link: `/partner/requests/${DEMANDE}` }),
    ])
  })

  it("prévient l'acheteur quand l'administration écrit", async () => {
    setup({ compte: ADMIN, role: "ADMIN" })
    await POST(makeRequest({ content: "Nous vérifions" }), ctx())

    const destinataires = db.lastOp("notifications", "insert")?.payload.map((n: any) => n.user_id)
    expect(destinataires).toEqual([ACHETEUR, PARTENAIRE])
  })
})
