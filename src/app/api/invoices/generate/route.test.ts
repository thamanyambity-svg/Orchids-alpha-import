import { describe, it, expect, vi, beforeEach } from "vitest"
import { makeRequest } from "@/test-utils/supabase-mock"

/**
 * Émission d'une facture.
 *
 * Cette route était ouverte à tous : aucune authentification, client
 * service_role, et elle acceptait n'importe quel identifiant de commande. Elle
 * renvoyait le nom, l'adresse électronique, la société et la ville de
 * l'acheteur — et surtout elle écrivait : un PDF dans le bucket et une ligne
 * dans `invoices`. Ce n'était donc pas seulement une fuite, mais une écriture
 * non authentifiée.
 *
 * Ces tests verrouillent la correction. Le point décisif n'est pas le code de
 * retour : c'est qu'aucun PDF ne soit produit ni téléversé quand
 * l'autorisation échoue.
 */

const requireRole = vi.fn()
const generateInvoice = vi.fn(() => Promise.resolve(Buffer.from("%PDF-1.4")))
const upload = vi.fn(() =>
  Promise.resolve({ data: { path: "f.pdf" } as { path: string } | null, error: null as any })
)
const upsertFacture = vi.fn((_l?: unknown) => ({
  select: () => ({
    single: () =>
      Promise.resolve({ data: { id: "inv_1" } as { id: string } | null, error: null as any }),
  }),
}))
const selectCommande = vi.fn(() =>
  Promise.resolve({ data: COMMANDE as any, error: null as any })
)

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...args: any[]) => requireRole(...args) }
})
vi.mock("@/components/invoices/generate-invoice", () => ({
  generateInvoice: (...a: any[]) => generateInvoice(...(a as [])),
}))
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({ eq: () => ({ single: () => selectCommande() }) }),
      upsert: (l: unknown) => upsertFacture(l),
    }),
    storage: {
      from: () => ({
        upload: (...a: any[]) => upload(...(a as [])),
        getPublicUrl: (f: string) => ({ data: { publicUrl: `https://cdn.test/${f}` } }),
      }),
    },
  },
}))

const COMMANDE: any = {
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  total_amount: 3181,
  deposit_amount: 1908.6,
  balance_amount: 1272.4,
  alpha_commission: 318.1,
  import_requests: {
    id: "rrrrrrrr-rrrr-4rrr-8rrr-rrrrrrrrrrrr",
    reference: "REQ-2026-001",
    quantity: 10,
    unit: "carton",
    buyer_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    profiles: {
      full_name: "Acheteur Test",
      email: "acheteur@exemple.fr",
      company_name: "Société Test",
      city: "Kinshasa",
      countries: { name: "RDC" },
    },
  },
}

const { POST } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

describe("POST /api/invoices/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
    requireRole.mockResolvedValue({ user: { id: "admin" }, role: "ADMIN", supabase: {} })
    selectCommande.mockResolvedValue({ data: COMMANDE, error: null })
    upload.mockResolvedValue({ data: { path: "f.pdf" }, error: null })
    upsertFacture.mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ data: { id: "inv_1" }, error: null }) }),
    })
  })

  it("refuse un appelant non administrateur, sans produire de PDF", async () => {
    requireRole.mockRejectedValue(new ApiError(403, "Forbidden: requires one of [ADMIN]"))

    const res = await POST(makeRequest({ orderId: ID, type: "COMMERCIAL" }) as any)

    expect(res.status).toBe(403)
    expect(generateInvoice).not.toHaveBeenCalled()
    expect(upload).not.toHaveBeenCalled()
    expect(upsertFacture).not.toHaveBeenCalled()
  })

  it("refuse un appelant non connecté", async () => {
    requireRole.mockRejectedValue(new ApiError(401, "Unauthorized"))

    const res = await POST(makeRequest({ orderId: ID, type: "COMMERCIAL" }) as any)

    expect(res.status).toBe(401)
    expect(generateInvoice).not.toHaveBeenCalled()
  })

  it("ne divulgue aucune donnée de l'acheteur à un appelant refusé", async () => {
    requireRole.mockRejectedValue(new ApiError(403, "Forbidden"))

    const res = await POST(makeRequest({ orderId: ID, type: "COMMERCIAL" }) as any)
    const corps = JSON.stringify(await res.json())

    expect(corps).not.toContain("acheteur@exemple.fr")
    expect(corps).not.toContain("Acheteur Test")
  })

  it("refuse un identifiant de commande qui n'est pas un UUID", async () => {
    const res = await POST(makeRequest({ orderId: "commande-1", type: "COMMERCIAL" }) as any)

    expect(res.status).toBe(400)
    expect(selectCommande).not.toHaveBeenCalled()
    expect(generateInvoice).not.toHaveBeenCalled()
  })

  it("refuse un type de facture hors nomenclature", async () => {
    for (const type of ["AVOIR", "", "proforma", 42, null]) {
      vi.clearAllMocks()
      requireRole.mockResolvedValue({ user: { id: "admin" }, role: "ADMIN", supabase: {} })
      const res = await POST(makeRequest({ orderId: ID, type }) as any)
      expect(res.status, String(type)).toBe(400)
      expect(generateInvoice, String(type)).not.toHaveBeenCalled()
    }
  })

  it("refuse un corps illisible", async () => {
    const res = await POST({ json: async () => { throw new SyntaxError("x") } } as any)

    expect(res.status).toBe(400)
    expect(generateInvoice).not.toHaveBeenCalled()
  })

  it("renvoie 404 pour une commande inexistante, sans produire de PDF", async () => {
    selectCommande.mockResolvedValue({ data: null, error: { message: "not found" } })

    const res = await POST(makeRequest({ orderId: ID, type: "COMMERCIAL" }) as any)

    expect(res.status).toBe(404)
    expect(generateInvoice).not.toHaveBeenCalled()
  })

  it("numérote la facture selon son type et l'année", async () => {
    await POST(makeRequest({ orderId: ID, type: "PROFORMA" }) as any)

    const numero = (upsertFacture.mock.calls[0]?.[0] as any).number
    expect(numero).toMatch(new RegExp(`^INV-PRO-${new Date().getFullYear()}-CCCCCCCC$`))
  })

  it("distingue les trois préfixes de numérotation", async () => {
    const attendus: Record<string, string> = {
      PROFORMA: "INV-PRO-",
      COMMERCIAL: "INV-COM-",
      FINAL: "INV-FIN-",
    }
    for (const [type, prefixe] of Object.entries(attendus)) {
      vi.clearAllMocks()
      requireRole.mockResolvedValue({ user: { id: "admin" }, role: "ADMIN", supabase: {} })
      selectCommande.mockResolvedValue({ data: COMMANDE, error: null })
      upload.mockResolvedValue({ data: { path: "f.pdf" }, error: null })
      upsertFacture.mockReturnValue({
        select: () => ({ single: () => Promise.resolve({ data: { id: "inv_1" }, error: null }) }),
      })

      await POST(makeRequest({ orderId: ID, type }) as any)

      expect((upsertFacture.mock.calls[0]?.[0] as any).number, type).toContain(prefixe)
    }
  })

  it("reporte les montants de la commande sans les recalculer", async () => {
    // Une facture qui n'affiche pas exactement ce qui a été engagé est un
    // document commercial faux.
    await POST(makeRequest({ orderId: ID, type: "COMMERCIAL" }) as any)

    expect(upsertFacture.mock.calls[0]?.[0]).toMatchObject({
      total_amount: 3181,
      deposit_amount: 1908.6,
      balance_amount: 1272.4,
      alpha_commission: 318.1,
    })
  })

  it("n'assigne pas d'échéance à une proforma", async () => {
    // Une proforma n'est pas exigible : lui donner une échéance la ferait
    // apparaître en retard de paiement.
    await POST(makeRequest({ orderId: ID, type: "PROFORMA" }) as any)

    expect((upsertFacture.mock.calls[0]?.[0] as any).due_at).toBeNull()
  })

  it("assigne une échéance à une facture commerciale", async () => {
    await POST(makeRequest({ orderId: ID, type: "COMMERCIAL" }) as any)

    expect((upsertFacture.mock.calls[0]?.[0] as any).due_at).toBeTruthy()
  })

  it("n'enregistre pas la facture quand le téléversement échoue", async () => {
    // Sinon la ligne pointerait vers un PDF inexistant.
    upload.mockResolvedValue({ data: null, error: { message: "bucket plein" } })

    const res = await POST(makeRequest({ orderId: ID, type: "COMMERCIAL" }) as any)

    expect(res.status).toBe(500)
    expect(upsertFacture).not.toHaveBeenCalled()
  })

  it("signale un échec d'enregistrement au lieu de renvoyer une facture fantôme", async () => {
    upsertFacture.mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ data: null, error: { message: "contrainte" } }) }),
    })

    expect((await POST(makeRequest({ orderId: ID, type: "COMMERCIAL" }) as any)).status).toBe(500)
  })

  it("renvoie la facture et son adresse à un administrateur", async () => {
    const res = await POST(makeRequest({ orderId: ID, type: "COMMERCIAL" }) as any)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      invoice: { id: "inv_1" },
      url: expect.stringContaining("https://cdn.test/"),
    })
  })
})
