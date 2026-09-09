import { describe, it, expect, vi, beforeEach } from "vitest"
import crypto from "crypto"

/**
 * Réception d'un e-mail entrant (Resend).
 *
 * La propriété centrale est l'ordre des opérations. L'analyse appelle OpenAI —
 * un appel facturé — et s'exécutait avant l'insertion. `resend_email_id` étant
 * unique, une livraison rejouée payait l'appel, échouait en 23505, renvoyait
 * 500, et Resend rejouait : une boucle qui brûle du crédit sans jamais
 * aboutir. La ligne est donc réclamée d'abord.
 *
 * Le second point est le code de retour en cas d'échec partiel. Une fois
 * l'e-mail enregistré, répondre 500 ferait rejouer Resend sur une livraison
 * déjà acceptée.
 */

const SECRET_BRUT = crypto.randomBytes(24).toString("base64")
const SECRET = `whsec_${SECRET_BRUT}`

// Lus au chargement du module : à poser avant l'import.
process.env.RESEND_WEBHOOK_SECRET = SECRET
process.env.RESEND_API_KEY = ""

const insert = vi.fn((_l?: unknown) => Promise.resolve({ error: null as any }))
const update = vi.fn((_l?: unknown) => ({
  eq: () => Promise.resolve({ error: null as any }),
}))
const analyzeEmail = vi.fn((..._a: unknown[]) =>
  Promise.resolve({ category: "QUOTE", priority: "HIGH", summary: "résumé", suggestedReply: "…" })
)

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ insert: (l: unknown) => insert(l), update: (l: unknown) => update(l) }),
  }),
}))
vi.mock("@/lib/email-ai", () => ({ analyzeEmail: (...a: unknown[]) => analyzeEmail(...a) }))

const { POST } = await import("./route")

const ID = "msg_2abc"

function signer(id: string, ts: number, corps: string, secret = SECRET_BRUT) {
  return crypto.createHmac("sha256", Buffer.from(secret, "base64")).update(`${id}.${ts}.${corps}`).digest("base64")
}

function requete(evenement: unknown, { signature = true, corpsBrut = "" } = {}) {
  const corps = corpsBrut || JSON.stringify(evenement)
  const ts = Math.floor(Date.now() / 1000)
  const entetes: Record<string, string> = {
    "svix-id": ID,
    "svix-timestamp": String(ts),
    "svix-signature": `v1,${signature ? signer(ID, ts, corps) : "signature-invalide"}`,
  }
  return {
    text: async () => corps,
    headers: new Headers(entetes),
  } as any
}

const EVENEMENT = {
  type: "email.received",
  data: {
    email_id: "email_123",
    from: "Jean Dupont <jean.dupont@fournisseur.cn>",
    to: ["contact@aonosekehouseinvestmentdrc.site"],
    subject: "Devis conteneur",
  },
}

describe("authentification", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "log").mockImplementation(() => {})
  })

  it("refuse une signature invalide sans rien faire", async () => {
    const res = await POST(requete(EVENEMENT, { signature: false }))

    expect(res.status).toBe(401)
    expect(insert).not.toHaveBeenCalled()
    expect(analyzeEmail).not.toHaveBeenCalled()
  })

  it("refuse un corps modifié après signature", async () => {
    const req = requete(EVENEMENT)
    const original = req.text
    req.text = async () => (await original()) + " "

    expect((await POST(req)).status).toBe(401)
    expect(insert).not.toHaveBeenCalled()
  })

  it("ignore un type d'événement non géré, sans écrire", async () => {
    const res = await POST(requete({ type: "email.delivered", data: {} }))

    await expect(res.json()).resolves.toMatchObject({ received: false })
    expect(insert).not.toHaveBeenCalled()
    expect(analyzeEmail).not.toHaveBeenCalled()
  })
})

describe("idempotence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "log").mockImplementation(() => {})
    insert.mockResolvedValue({ error: null })
  })

  it("réclame la ligne avant d'appeler le modèle — c'est l'ordre qui protège le crédit", async () => {
    await POST(requete(EVENEMENT))

    expect(insert).toHaveBeenCalled()
    expect(analyzeEmail).toHaveBeenCalled()
    expect(insert.mock.invocationCallOrder[0]).toBeLessThan(analyzeEmail.mock.invocationCallOrder[0])
  })

  it("acquitte un doublon sans payer l'analyse", async () => {
    insert.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } as any })

    const res = await POST(requete(EVENEMENT))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ duplicate: true })
    // Le point qui compte : aucun appel facturé sur un rejeu.
    expect(analyzeEmail).not.toHaveBeenCalled()
  })

  it("répond 500 sur un échec d'insertion qui n'est pas un doublon", async () => {
    // Là, un rejeu de Resend est souhaitable : rien n'a été enregistré.
    insert.mockResolvedValue({ error: { code: "08006", message: "connection failure" } as any })

    const res = await POST(requete(EVENEMENT))

    expect(res.status).toBe(500)
    expect(analyzeEmail).not.toHaveBeenCalled()
  })
})

describe("enregistrement", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "log").mockImplementation(() => {})
    insert.mockResolvedValue({ error: null })
    update.mockReturnValue({ eq: () => Promise.resolve({ error: null }) })
  })

  it("sépare le nom de l'adresse dans « Nom <adresse> »", async () => {
    await POST(requete(EVENEMENT))

    expect(insert.mock.calls[0]?.[0]).toMatchObject({
      from_email: "jean.dupont@fournisseur.cn",
      from_name: "Jean Dupont",
    })
  })

  it("accepte une adresse nue, sans nom", async () => {
    await POST(
      requete({ ...EVENEMENT, data: { ...EVENEMENT.data, from: "brut@fournisseur.cn" } })
    )

    expect(insert.mock.calls[0]?.[0]).toMatchObject({
      from_email: "brut@fournisseur.cn",
      from_name: null,
    })
  })

  it("pose la ligne en attente avant enrichissement", async () => {
    await POST(requete(EVENEMENT))

    expect(insert.mock.calls[0]?.[0]).toMatchObject({
      resend_email_id: "email_123",
      status: "PENDING",
    })
  })

  it("range l'analyse du modèle sur la ligne réclamée", async () => {
    await POST(requete(EVENEMENT))

    expect(update.mock.calls[0]?.[0]).toMatchObject({
      ai_category: "QUOTE",
      ai_priority: "HIGH",
      ai_summary: "résumé",
    })
  })

  it("acquitte quand l'enrichissement échoue, pour ne pas faire rejouer Resend", async () => {
    // L'e-mail est déjà enregistré : un 500 ferait rejouer une livraison
    // pourtant acceptée, et ferait repayer l'analyse.
    update.mockReturnValue({ eq: () => Promise.resolve({ error: { message: "colonne absente" } }) })

    const res = await POST(requete(EVENEMENT))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ ok: true, enriched: false })
  })

  it("ne laisse pas un échec du modèle perdre l'e-mail", async () => {
    analyzeEmail.mockResolvedValueOnce(null as any)

    const res = await POST(requete(EVENEMENT))

    expect(res.status).toBe(200)
    expect(update).toHaveBeenCalled()
  })
})
