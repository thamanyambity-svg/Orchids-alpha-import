import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

/**
 * Contrôle d'état des services externes.
 *
 * Il existe parce qu'une valeur sensible ne peut pas être relue : l'hébergeur
 * la masque, à raison. La seule preuve qu'une clé est encore valide est de s'en
 * servir — et il faut donc que le résultat soit fiable dans les deux sens.
 *
 * Deux exigences le portent. Un secret ne doit jamais ressortir, même par le
 * message d'erreur d'un fournisseur. Et une panne d'un service essentiel doit
 * produire un code d'échec : un contrôle d'état qui répond toujours 200 ne
 * surveille rien.
 */

const requireRole = vi.fn()
const balanceRetrieve = vi.fn(() => Promise.resolve({ object: "balance" }))
const selectProfils = vi.fn(() =>
  Promise.resolve({ error: null as any, count: 3 as number | null })
)

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...args: any[]) => requireRole(...args) }
})
vi.mock("@/lib/stripe", () => ({
  stripe: { balance: { retrieve: () => balanceRetrieve() } },
}))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ select: () => selectProfils() }) }),
}))

const { GET } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const ENV = { ...process.env }

function configurer(sup: Record<string, string | undefined> = {}) {
  Object.assign(process.env, {
    STRIPE_SECRET_KEY: "sk_live_x",
    NEXT_PUBLIC_SUPABASE_URL: "https://projet.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "cle",
    STRIPE_WEBHOOK_SECRET: "whsec_x",
    RESEND_API_KEY: undefined,
    ...sup,
  })
}

function ctrl(corps: any, service: string) {
  return corps.controles.find((c: any) => c.service === service)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  balanceRetrieve.mockResolvedValue({ object: "balance" })
  selectProfils.mockResolvedValue({ error: null, count: 3 })
  configurer()
})

afterEach(() => {
  process.env = { ...ENV }
  vi.restoreAllMocks()
})

describe("accès", () => {
  it("refuse un appelant non administrateur", async () => {
    requireRole.mockRejectedValue(new ApiError(403, "Forbidden: requires one of [ADMIN]"))

    const res = await GET()

    expect(res.status).toBe(403)
    // La seule liste des services configurés renseigne sur l'infrastructure.
    expect(balanceRetrieve).not.toHaveBeenCalled()
  })

  it("refuse un appelant non connecté", async () => {
    requireRole.mockRejectedValue(new ApiError(401, "Unauthorized"))

    expect((await GET()).status).toBe(401)
    expect(balanceRetrieve).not.toHaveBeenCalled()
  })
})

describe("diagnostic", () => {
  beforeEach(() => {
    requireRole.mockResolvedValue({ user: { id: "admin" }, role: "ADMIN", supabase: {} })
  })

  it("répond 200 quand tout ce qui est essentiel fonctionne", async () => {
    const res = await GET()

    expect(res.status).toBe(200)
    const corps = await res.json()
    expect(corps.etat).toBe("ok")
    expect(ctrl(corps, "stripe").etat).toBe("ok")
    expect(ctrl(corps, "supabase").etat).toBe("ok")
  })

  it("distingue une clé Stripe révoquée d'une panne réseau", async () => {
    // La première demande une rotation, la seconde d'attendre : les confondre
    // envoie chercher au mauvais endroit.
    balanceRetrieve.mockRejectedValue(new Error("Invalid API Key provided"))

    const corps = await (await GET()).json()

    expect(ctrl(corps, "stripe").etat).toBe("invalide")
  })

  it("marque une panne réseau comme injoignable, pas comme clé fausse", async () => {
    balanceRetrieve.mockRejectedValue(new Error("ECONNRESET"))

    const corps = await (await GET()).json()

    expect(ctrl(corps, "stripe").etat).toBe("injoignable")
  })

  it("répond 503 quand un service essentiel est en panne", async () => {
    // Un contrôle d'état toujours en 200 ne sert à aucune surveillance.
    balanceRetrieve.mockRejectedValue(new Error("Invalid API Key provided"))

    const res = await GET()

    expect(res.status).toBe(503)
    await expect(res.json()).resolves.toMatchObject({ etat: "degrade" })
  })

  it("reste en 200 quand seul un service non essentiel manque", async () => {
    // Resend absent désactive des e-mails ; ça ne rend pas la plateforme en panne.
    configurer({ RESEND_API_KEY: undefined })

    const res = await GET()

    expect(res.status).toBe(200)
    expect(ctrl(await res.clone().json(), "resend").etat).toBe("absent")
  })

  it("signale Stripe absent plutôt que de l'interroger", async () => {
    configurer({ STRIPE_SECRET_KEY: undefined })

    const corps = await (await GET()).json()

    expect(ctrl(corps, "stripe").etat).toBe("absent")
    expect(balanceRetrieve).not.toHaveBeenCalled()
  })

  it("signale une base qui refuse la lecture", async () => {
    selectProfils.mockResolvedValue({ error: { message: "permission denied" }, count: null })

    const res = await GET()

    expect(res.status).toBe(503)
    expect(ctrl(await res.json(), "supabase").etat).toBe("invalide")
  })

  it("ne renvoie jamais la moindre valeur de secret", async () => {
    // Y compris par le message d'erreur d'un fournisseur, qui recopie parfois
    // la clé reçue.
    balanceRetrieve.mockRejectedValue(new Error("Invalid API Key provided: sk_live_SECRETABC123"))
    configurer({ STRIPE_SECRET_KEY: "sk_live_SECRETABC123" })

    const corps = JSON.stringify(await (await GET()).json())

    expect(corps).not.toContain("sk_live_SECRETABC123")
    expect(corps).not.toContain("SECRETABC123")
  })

  it("borne le motif d'erreur à une seule ligne", async () => {
    balanceRetrieve.mockRejectedValue(new Error(`ligne un\nligne deux\n${"x".repeat(500)}`))

    const detail = ctrl(await (await GET()).json(), "stripe").detail

    expect(detail).toBe("ligne un")
  })

  it("indique la version déployée, pour savoir ce qu'on diagnostique", async () => {
    configurer({ VERCEL_GIT_COMMIT_SHA: "aec3de9abcdef0123" })

    await expect((await GET()).json()).resolves.toMatchObject({ version: "aec3de9abcde" })
  })

  it("rend compte des secrets seulement présents ou absents", async () => {
    configurer({ OPENAI_API_KEY: "sk-proj-xyz", N8N_WEBHOOK_SECRET: undefined })

    const corps = await (await GET()).json()

    expect(ctrl(corps, "openai").etat).toBe("ok")
    expect(ctrl(corps, "n8n").etat).toBe("absent")
    // Présence, jamais la valeur.
    expect(JSON.stringify(corps)).not.toContain("sk-proj-xyz")
  })

  it("n'appelle pas OpenAI — un contrôle d'état ne doit rien coûter", async () => {
    const corps = await (await GET()).json()

    expect(ctrl(corps, "openai")).toBeDefined()
    expect(ctrl(corps, "openai").detail).toBeUndefined()
  })
})
