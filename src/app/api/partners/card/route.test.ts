import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock } from "@/test-utils/supabase-mock"

/**
 * Carte de contact du partenaire.
 *
 * La route lit avec la clé de service, hors des règles d'accès : c'est ce qui
 * la rend utile, et ce qui la rend dangereuse. Trois propriétés la bornent, et
 * chacune a son test : il faut être connecté, seul un contrat actif est
 * montré, et seuls les champs de la carte sortent — jamais la commission ni la
 * caution. Le mode `latest` ne doit renvoyer que le partenaire d'une demande
 * de l'appelant.
 */

const requireUser = vi.fn()
let mock: ReturnType<typeof createSupabaseMock>

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...args: any[]) => requireUser(...args) }
})
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mock.client }))

const { GET } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const ACHETEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const COMPTE_PARTENAIRE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const FICHE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

const LIGNE_PARTENAIRE = {
  id: FICHE,
  user_id: COMPTE_PARTENAIRE,
  whatsapp_number: "+971526559895",
  assigned_cities: ["Dubaï"],
  commission_rate: 10,
  deposit_amount: 5000,
  address_line: "Rue confidentielle",
  country: { name: "Émirats Arabes Unis", code: "AE" },
  profile: {
    full_name: "Achignon Bilongo",
    company_name: "MAARMALA SARL",
    email: "contact@maarmala.test",
    phone: "+971501201719",
    avatar_url: null,
    city: "Dubaï",
  },
}

function setup({ pays = true as boolean, partenaire = LIGNE_PARTENAIRE as any, demande = { assigned_partner_id: FICHE } as any } = {}) {
  mock = createSupabaseMock((op) => {
    if (op.table === "countries") return { data: pays ? { id: "pays-ae" } : null }
    if (op.table === "partner_profiles") return { data: partenaire }
    if (op.table === "import_requests") return { data: demande }
    return { data: null }
  })
  requireUser.mockResolvedValue({ user: { id: ACHETEUR }, role: "BUYER", supabase: {} })
}

const req = (q: string) => new Request(`https://site.test/api/partners/card${q}`) as any

describe("GET /api/partners/card", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("exige d'être connecté", async () => {
    setup()
    requireUser.mockRejectedValue(new ApiError(401, "Unauthorized"))

    expect((await GET(req("?country=AE"))).status).toBe(401)
    expect(mock.ops.length).toBe(0)
  })

  it("refuse une requête sans mode", async () => {
    setup()
    expect((await GET(req(""))).status).toBe(400)
  })

  it("refuse un code pays mal formé sans interroger la base", async () => {
    setup()
    for (const code of ["ae", "ARE", "A", "1'--"]) {
      expect((await GET(req(`?country=${encodeURIComponent(code)}`))).status, code).toBe(400)
    }
    expect(mock.ops.length).toBe(0)
  })

  it("renvoie le partenaire actif du pays", async () => {
    setup()

    const res = await GET(req("?country=AE"))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      partner: {
        full_name: "Achignon Bilongo",
        company_name: "MAARMALA SARL",
        whatsapp: "+971526559895",
        country: { code: "AE" },
      },
    })
  })

  it("ne montre qu'un contrat actif", async () => {
    setup()

    await GET(req("?country=AE"))

    expect(mock.aFiltre("partner_profiles", "eq", "contract_status")).toBe(true)
  })

  it("utilise l'identifiant du compte, destinataire des messages", async () => {
    // La messagerie adresse `recipient_id` à un compte : l'identifiant de la
    // fiche partenaire enverrait les messages dans le vide.
    setup()

    const { partner } = await (await GET(req("?country=AE"))).json()

    expect(partner.id).toBe(COMPTE_PARTENAIRE)
    expect(partner.partnerProfileId).toBe(FICHE)
  })

  it("ne laisse sortir aucun champ hors de la carte", async () => {
    // Lue avec la clé de service, la fiche complète contient la commission,
    // la caution et l'adresse. Rien de cela ne doit atteindre le navigateur.
    setup()

    const corps = JSON.stringify(await (await GET(req("?country=AE"))).json())

    expect(corps).not.toContain("commission")
    expect(corps).not.toContain("deposit")
    expect(corps).not.toContain("Rue confidentielle")
  })

  it("renvoie null pour un pays inconnu, sans chercher de partenaire", async () => {
    setup({ pays: false })

    const res = await GET(req("?country=ZZ"))

    await expect(res.json()).resolves.toEqual({ partner: null })
    expect(mock.lastOp("partner_profiles")).toBeUndefined()
  })

  it("renvoie null quand aucun partenaire n'est affecté au pays", async () => {
    setup({ partenaire: null })

    await expect((await GET(req("?country=AE"))).json()).resolves.toEqual({ partner: null })
  })

  it("ne cherche que parmi les demandes de l'appelant", async () => {
    setup()

    await GET(req("?request=latest"))

    expect(mock.aFiltre("import_requests", "eq", "buyer_id")).toBe(true)
  })

  it("renvoie le partenaire affecté à la dernière demande", async () => {
    setup()

    const res = await GET(req("?request=latest"))

    await expect(res.json()).resolves.toMatchObject({ partner: { full_name: "Achignon Bilongo" } })
  })

  it("renvoie null quand la dernière demande n'est pas encore affectée", async () => {
    setup({ demande: { assigned_partner_id: null } })

    const res = await GET(req("?request=latest"))

    await expect(res.json()).resolves.toEqual({ partner: null })
    expect(mock.lastOp("partner_profiles")).toBeUndefined()
  })

  it("renvoie null quand l'acheteur n'a aucune demande", async () => {
    setup({ demande: null })

    await expect((await GET(req("?request=latest"))).json()).resolves.toEqual({ partner: null })
  })
})
