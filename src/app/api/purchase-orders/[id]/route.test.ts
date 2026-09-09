import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Signature et annulation d'un bon de commande.
 *
 * La signature engage l'acheteur : c'est elle qui déclenche l'achat de la
 * marchandise. Seul l'acheteur signe — un partenaire, même assigné, ne peut
 * pas engager quelqu'un d'autre.
 *
 * L'annulation est la contrepartie promise sur la page d'accueil : quarante-
 * huit heures après la signature. Trop tôt refermée, l'acheteur perd un droit
 * vendu ; jamais refermée, un bon confirmé depuis des semaines redevient
 * annulable alors que la marchandise est achetée.
 */

const requireRole = vi.fn()
const logAudit = vi.fn()

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...args: any[]) => requireRole(...args) }
})
vi.mock("@/lib/audit", () => ({ logAudit: (...a: any[]) => logAudit(...a) }))
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 29, resetAt: Date.now() + 60000 }),
}))

const { POST, GET } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const ACHETEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const AUTRE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const PARTENAIRE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
const BON = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

const HEURE = 3_600_000

function setup({
  role = "BUYER",
  utilisateur = ACHETEUR,
  statut = "GENERATED",
  cgvAcceptedAt = null as string | null,
  visible = true,
  partenaireCorrespond = false,
} = {}) {
  const mock = createSupabaseMock((op) => {
    if (op.table === "purchase_orders" && op.type === "select") {
      return visible
        ? {
            data: {
              id: BON,
              status: statut,
              partner_id: PARTENAIRE,
              order_id: "oooooooo-oooo-4ooo-8ooo-oooooooooooo",
              cgv_accepted_at: cgvAcceptedAt,
              request: { buyer_id: ACHETEUR, status: "VALIDATED" },
              quote: { grand_total_usd: 1850, currency: "USD", incoterm: "FOB" },
            },
          }
        : { data: null, error: { message: "not found" } }
    }
    if (op.table === "partner_profiles") return { data: partenaireCorrespond ? { id: PARTENAIRE } : null }
    if (op.table === "purchase_orders" && op.type === "update") return { data: { id: BON } }
    return { data: null }
  })
  requireRole.mockResolvedValue({ user: { id: utilisateur }, role, supabase: mock.client })
  return mock
}

const ctx = { params: Promise.resolve({ id: BON }) }
const ctxInvalide = { params: Promise.resolve({ id: "bon-1" }) }

function req(corps: unknown, action?: string) {
  return makeRequest(corps, {
    url: `https://site.test/api/purchase-orders/${BON}${action ? `?action=${action}` : ""}`,
  }) as any
}

const SIGNATURE = { cgv_accepted: true, signature_name: "Acheteur Test" }

describe("POST — signature", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("exige une session", async () => {
    requireRole.mockRejectedValue(new ApiError(401, "Unauthorized"))

    expect((await POST(req(SIGNATURE, "sign"), ctx)).status).toBe(401)
  })

  it("refuse un identifiant de bon mal formé", async () => {
    const mock = setup()

    const res = await POST(req(SIGNATURE, "sign"), ctxInvalide)

    expect(res.status).toBe(400)
    expect(mock.lastOp("purchase_orders")).toBeUndefined()
  })

  it("renvoie 404 pour un bon que l'appelant ne voit pas", async () => {
    const mock = setup({ visible: false })

    const res = await POST(req(SIGNATURE, "sign"), ctx)

    expect(res.status).toBe(404)
    expect(mock.lastOp("purchase_orders", "update")).toBeUndefined()
  })

  it("refuse un tiers sans lien avec le bon", async () => {
    const mock = setup({ utilisateur: AUTRE, role: "PARTNER", partenaireCorrespond: false })

    const res = await POST(req(SIGNATURE, "sign"), ctx)

    expect(res.status).toBe(403)
    expect(mock.lastOp("purchase_orders", "update")).toBeUndefined()
  })

  it("refuse au partenaire assigné de signer à la place de l'acheteur", async () => {
    // Il voit le bon, mais signer engage quelqu'un d'autre.
    const mock = setup({ utilisateur: AUTRE, role: "PARTNER", partenaireCorrespond: true })

    const res = await POST(req(SIGNATURE, "sign"), ctx)

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/only buyer can sign/i),
    })
    expect(mock.lastOp("purchase_orders", "update")).toBeUndefined()
  })

  it("laisse l'acheteur signer son bon", async () => {
    const mock = setup({ statut: "GENERATED" })

    const res = await POST(req(SIGNATURE, "sign"), ctx)

    expect(res.status).toBeLessThan(400)
    expect(mock.lastOp("purchase_orders", "update")).toBeDefined()
  })

  it("refuse de signer un bon dans un état qui ne s'y prête pas", async () => {
    for (const statut of ["CONFIRMED", "CANCELLED", "SIGNED"]) {
      vi.clearAllMocks()
      const mock = setup({ statut })
      const res = await POST(req(SIGNATURE, "sign"), ctx)
      expect(res.status, statut).toBe(400)
      expect(mock.lastOp("purchase_orders", "update"), statut).toBeUndefined()
    }
  })

  it("refuse une signature sans acceptation des conditions", async () => {
    // L'acceptation est ce qui fait courir le délai de rétractation.
    const mock = setup()

    const res = await POST(req({ cgv_accepted: false, signature_name: "X" }, "sign"), ctx)

    expect(res.status).toBe(400)
    expect(mock.lastOp("purchase_orders", "update")).toBeUndefined()
  })

  it("trace la signature", async () => {
    setup()

    await POST(req(SIGNATURE, "sign"), ctx)

    expect(logAudit).toHaveBeenCalled()
  })
})

describe("POST — annulation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  const MOTIF = { reason: "Le fournisseur ne peut plus tenir le délai annoncé." }

  it("refuse l'annulation d'un bon jamais signé", async () => {
    const mock = setup({ statut: "SIGNED", cgvAcceptedAt: null })

    const res = await POST(req(MOTIF, "cancel"), ctx)

    expect(res.status).toBe(400)
    expect(mock.lastOp("purchase_orders", "update")).toBeUndefined()
  })

  it("refuse au-delà de la fenêtre de 48 heures", async () => {
    const mock = setup({
      statut: "SIGNED",
      cgvAcceptedAt: new Date(Date.now() - 49 * HEURE).toISOString(),
    })

    const res = await POST(req(MOTIF, "cancel"), ctx)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringMatching(/48h/i) })
    expect(mock.lastOp("purchase_orders", "update")).toBeUndefined()
  })

  it("accepte à 47 heures, juste avant la fermeture", async () => {
    const mock = setup({
      statut: "SIGNED",
      cgvAcceptedAt: new Date(Date.now() - 47 * HEURE).toISOString(),
    })

    const res = await POST(req(MOTIF, "cancel"), ctx)

    expect(res.status).toBeLessThan(400)
    expect(mock.lastOp("purchase_orders", "update")).toBeDefined()
  })

  it("refuse à un autre que l'acheteur d'annuler", async () => {
    const mock = setup({
      utilisateur: AUTRE,
      role: "PARTNER",
      partenaireCorrespond: true,
      statut: "SIGNED",
      cgvAcceptedAt: new Date(Date.now() - 2 * HEURE).toISOString(),
    })

    const res = await POST(req(MOTIF, "cancel"), ctx)

    expect(res.status).toBe(403)
    expect(mock.lastOp("purchase_orders", "update")).toBeUndefined()
  })
})

describe("POST — action inconnue", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("refuse une action non prévue sans rien modifier", async () => {
    const mock = setup()

    const res = await POST(req({}, "supprimer"), ctx)

    expect(res.status).toBe(400)
    expect(mock.lastOp("purchase_orders", "update")).toBeUndefined()
  })

  it("refuse une requête sans action", async () => {
    const mock = setup()

    const res = await POST(req({}), ctx)

    expect(res.status).toBe(400)
    expect(mock.lastOp("purchase_orders", "update")).toBeUndefined()
  })
})

describe("GET", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("refuse un identifiant mal formé", async () => {
    setup()

    expect((await GET(req(null), ctxInvalide)).status).toBe(400)
  })

  it("refuse un tiers sans lien avec le bon", async () => {
    setup({ utilisateur: AUTRE, role: "PARTNER", partenaireCorrespond: false })

    expect((await GET(req(null), ctx)).status).toBe(403)
  })

  it("laisse l'acheteur consulter son bon", async () => {
    setup({ utilisateur: ACHETEUR, role: "BUYER" })

    expect((await GET(req(null), ctx)).status).toBe(200)
  })

  it("laisse un administrateur consulter n'importe quel bon", async () => {
    setup({ utilisateur: AUTRE, role: "ADMIN" })

    expect((await GET(req(null), ctx)).status).toBe(200)
  })
})
