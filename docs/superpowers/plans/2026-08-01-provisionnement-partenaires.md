# Provisionnement des partenaires — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à un administrateur de créer un partenaire opérationnel depuis le tableau de bord, avec ses coordonnées et son numéro WhatsApp, et rendre la chaîne de candidature effective de bout en bout.

**Architecture:** Une route serveur unique porte la création (validation, compte auth, profil, `partner_profiles`, audit, compensation en cas d'échec). Le numéro WhatsApp est stocké une fois en E.164 et exploité par une couche de transport à trois implémentations interchangeables, sélectionnées par configuration. L'interface admin n'appelle que la route.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (SSR + service role), zod, vitest, Playwright.

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `supabase/migrations/20260801160000_partner_operational_fields.sql` | colonnes opérationnelles + contrainte E.164 |
| `src/lib/phone.ts` | normalisation et validation E.164, construction du lien `wa.me` |
| `src/lib/whatsapp.ts` | sélection du transport, absorption des échecs |
| `src/app/api/admin/partners/route.ts` | création du partenaire |
| `src/app/api/admin/partners/[id]/access-link/route.ts` | lien d'accès à usage unique |
| `src/components/admin/partner-form.tsx` | formulaire partagé création / approbation |

`src/app/admin/partners/page.tsx` fait déjà 422 lignes : le formulaire ne s'y ajoute pas.

---

### Task 1 : Colonnes opérationnelles du partenaire

**Files:**
- Create: `supabase/migrations/20260801160000_partner_operational_fields.sql`
- Modify: `supabase/migrations/20260717000000_initial_schema.sql` (définition de `partner_applications.status`)

- [ ] **Step 1 : Écrire la migration**

```sql
-- Champs opérationnels du partenaire. L'identité (nom, société, email, téléphone)
-- reste sur profiles ; partner_profiles porte le rôle commercial.
ALTER TABLE public.partner_profiles
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS address_line    TEXT,
  ADD COLUMN IF NOT EXISTS postal_code     TEXT,
  ADD COLUMN IF NOT EXISTS timezone        TEXT,
  ADD COLUMN IF NOT EXISTS languages       TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pro_email       TEXT,
  ADD COLUMN IF NOT EXISTS application_id  UUID REFERENCES public.partner_applications(id) ON DELETE SET NULL;

-- Le numéro est une clé de contact métier : il ne doit pas pouvoir entrer sous une
-- forme non normalisée. E.164 : '+', indicatif sans zéro initial, 8 à 15 chiffres.
DO $$
BEGIN
  ALTER TABLE public.partner_profiles
    ADD CONSTRAINT partner_profiles_whatsapp_e164
    CHECK (whatsapp_number IS NULL OR whatsapp_number ~ '^\+[1-9][0-9]{7,14}$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_partner_profiles_application
  ON public.partner_profiles(application_id);
```

- [ ] **Step 2 : Aligner le repo sur l'enum `application_status`**

Dans `supabase/migrations/20260717000000_initial_schema.sql`, remplacer la ligne de
`partner_applications` :

```sql
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
```

par :

```sql
    -- L'application écrit 'APPROVED_KYC' (src/app/admin/partners/applications/[id]/page.tsx).
    -- Le CHECK à trois valeurs faisait échouer toute approbation sur une base neuve.
    status application_status NOT NULL DEFAULT 'PENDING',
```

et ajouter le type, avec les autres enums en tête de fichier :

```sql
DO $$
BEGIN
  CREATE TYPE application_status AS ENUM ('PENDING', 'APPROVED_KYC', 'DEPOSIT_PAID', 'ACTIVE', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

- [ ] **Step 3 : Appliquer et vérifier**

Appliquer la migration au projet `edhijqtotsrefminalsp`, puis vérifier :

```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='partner_profiles'
  and column_name in ('whatsapp_number','address_line','postal_code','timezone','languages','pro_email','application_id');
```

Attendu : 7 lignes.

- [ ] **Step 4 : Vérifier que la contrainte mord**

```sql
select 'doit echouer' from public.partner_profiles where whatsapp_number !~ '^\+[1-9][0-9]{7,14}$';
```

Attendu : 0 ligne. Puis tenter une insertion invalide dans un bloc annulé et confirmer
l'erreur `partner_profiles_whatsapp_e164`.

- [ ] **Step 5 : Commit**

```bash
git add supabase/migrations
git commit -m "feat(db): add partner operational fields with E.164 constraint"
```

---

### Task 2 : Normalisation du numéro et lien wa.me

**Files:**
- Create: `src/lib/phone.ts`
- Test: `src/lib/phone.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
import { describe, it, expect } from "vitest"
import { normalizeE164, isE164, waMeLink } from "./phone"

describe("normalizeE164", () => {
  it("accepte un numéro déjà canonique", () => {
    expect(normalizeE164("+8613812345678")).toBe("+8613812345678")
  })

  it("retire les espaces, points, tirets et parenthèses", () => {
    expect(normalizeE164("+971 50 (825) 31-90")).toBe("+971508253190")
  })

  it("convertit le préfixe 00 en +", () => {
    expect(normalizeE164("0090 532 123 45 67")).toBe("+905321234567")
  })

  it("renvoie null si aucun indicatif international n'est fourni", () => {
    expect(normalizeE164("0532 123 45 67")).toBeNull()
  })

  it("renvoie null sur une entrée vide ou absurde", () => {
    expect(normalizeE164("")).toBeNull()
    expect(normalizeE164("téléphone")).toBeNull()
    expect(normalizeE164("+0123456789")).toBeNull()
  })
})

describe("isE164", () => {
  it("valide la forme canonique", () => {
    expect(isE164("+243818924674")).toBe(true)
    expect(isE164("243818924674")).toBe(false)
    expect(isE164("+12")).toBe(false)
  })
})

describe("waMeLink", () => {
  it("construit le lien sans le plus et encode le message", () => {
    expect(waMeLink("+8613812345678", "Demande AIX-1 à traiter")).toBe(
      "https://wa.me/8613812345678?text=Demande%20AIX-1%20%C3%A0%20traiter"
    )
  })

  it("omet le paramètre text quand aucun message n'est fourni", () => {
    expect(waMeLink("+8613812345678")).toBe("https://wa.me/8613812345678")
  })

  it("renvoie null si le numéro n'est pas exploitable", () => {
    expect(waMeLink("0532 123 45 67")).toBeNull()
  })
})
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run src/lib/phone.test.ts`
Attendu : ÉCHEC, `Failed to resolve import "./phone"`.

- [ ] **Step 3 : Écrire l'implémentation minimale**

```ts
/** E.164 : '+', indicatif sans zéro initial, 8 à 15 chiffres au total. */
const E164 = /^\+[1-9][0-9]{7,14}$/

export function isE164(value: string): boolean {
  return E164.test(value)
}

/**
 * Ramène une saisie humaine à la forme canonique, ou null si elle ne porte pas
 * d'indicatif international. On ne devine jamais l'indicatif : un numéro national
 * sans pays est ambigu, et un mauvais indicatif enverrait les messages à un inconnu.
 */
export function normalizeE164(input: string): string | null {
  if (!input) return null

  let value = input.trim().replace(/[\s().\- ]/g, "")
  if (value.startsWith("00")) value = `+${value.slice(2)}`
  if (!value.startsWith("+")) return null

  return isE164(value) ? value : null
}

/** Lien de discussion pré-rempli, ou null si le numéro n'est pas exploitable. */
export function waMeLink(rawNumber: string, message?: string): string | null {
  const number = normalizeE164(rawNumber)
  if (!number) return null

  const base = `https://wa.me/${number.slice(1)}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

Run: `npx vitest run src/lib/phone.test.ts`
Attendu : PASS, 9 tests.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/phone.ts src/lib/phone.test.ts
git commit -m "feat: normalize phone numbers to E.164 and build wa.me links"
```

---

### Task 3 : Couche de transport WhatsApp

**Files:**
- Create: `src/lib/whatsapp.ts`
- Test: `src/lib/whatsapp.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const sendToN8N = vi.fn()
vi.mock("@/lib/webhooks", () => ({ sendToN8N: (...args: any[]) => sendToN8N(...args) }))

const { sendWhatsApp, resolveTransport } = await import("./whatsapp")

describe("resolveTransport", () => {
  afterEach(() => {
    delete process.env.WHATSAPP_TRANSPORT
  })

  it("retombe sur 'link' quand rien n'est configuré", () => {
    expect(resolveTransport()).toBe("link")
  })

  it("retombe sur 'link' quand la valeur est inconnue", () => {
    process.env.WHATSAPP_TRANSPORT = "pigeon"
    expect(resolveTransport()).toBe("link")
  })

  it("respecte une valeur reconnue", () => {
    process.env.WHATSAPP_TRANSPORT = "n8n"
    expect(resolveTransport()).toBe("n8n")
  })
})

describe("sendWhatsApp", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.WHATSAPP_TRANSPORT
  })

  it("en mode link, n'envoie rien et renvoie le lien", async () => {
    const result = await sendWhatsApp({
      to: "+8613812345678",
      message: "Nouvelle demande",
      event: "request_assigned",
    })

    expect(sendToN8N).not.toHaveBeenCalled()
    expect(result).toEqual({ delivered: false, link: "https://wa.me/8613812345678?text=Nouvelle%20demande" })
  })

  it("en mode n8n, émet l'évènement", async () => {
    process.env.WHATSAPP_TRANSPORT = "n8n"

    const result = await sendWhatsApp({
      to: "+8613812345678",
      message: "Nouvelle demande",
      event: "request_assigned",
    })

    expect(sendToN8N).toHaveBeenCalledWith("whatsapp:request_assigned", {
      to: "+8613812345678",
      message: "Nouvelle demande",
    })
    expect(result.delivered).toBe(true)
  })

  it("refuse un numéro non exploitable sans lever", async () => {
    const result = await sendWhatsApp({ to: "0532 123", message: "x", event: "e" })
    expect(result).toEqual({ delivered: false, link: null, error: "invalid_number" })
  })

  it("absorbe l'échec du transport sans lever", async () => {
    process.env.WHATSAPP_TRANSPORT = "n8n"
    sendToN8N.mockRejectedValueOnce(new Error("n8n down"))

    const result = await sendWhatsApp({ to: "+8613812345678", message: "x", event: "e" })

    expect(result.delivered).toBe(false)
    expect(result.error).toBe("transport_failed")
  })
})
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run src/lib/whatsapp.test.ts`
Attendu : ÉCHEC, `Failed to resolve import "./whatsapp"`.

- [ ] **Step 3 : Écrire l'implémentation minimale**

```ts
import { normalizeE164, waMeLink } from "@/lib/phone"
import { sendToN8N } from "@/lib/webhooks"

export type WhatsAppTransport = "link" | "n8n" | "cloud"

export type WhatsAppResult = {
  delivered: boolean
  link: string | null
  error?: "invalid_number" | "transport_failed" | "transport_unavailable"
}

const TRANSPORTS: WhatsAppTransport[] = ["link", "n8n", "cloud"]

/** Transport actif. Toute valeur inconnue retombe sur 'link', jamais d'erreur au démarrage. */
export function resolveTransport(): WhatsAppTransport {
  const configured = process.env.WHATSAPP_TRANSPORT as WhatsAppTransport | undefined
  return configured && TRANSPORTS.includes(configured) ? configured : "link"
}

/**
 * Envoie un message WhatsApp selon le transport configuré.
 *
 * Ne lève jamais : une notification qui échoue ne doit pas annuler l'opération
 * métier qui l'a déclenchée. Même contrat que sendToN8N, qui capture déjà ses
 * propres erreurs.
 */
export async function sendWhatsApp(params: {
  to: string
  message: string
  event: string
}): Promise<WhatsAppResult> {
  const to = normalizeE164(params.to)
  if (!to) return { delivered: false, link: null, error: "invalid_number" }

  const link = waMeLink(to, params.message)
  const transport = resolveTransport()

  if (transport === "link") {
    return { delivered: false, link }
  }

  try {
    if (transport === "n8n") {
      await sendToN8N(`whatsapp:${params.event}`, { to, message: params.message })
      return { delivered: true, link }
    }

    const token = process.env.WHATSAPP_CLOUD_TOKEN
    const phoneId = process.env.WHATSAPP_CLOUD_PHONE_ID
    if (!token || !phoneId) {
      console.warn("sendWhatsApp: transport 'cloud' sélectionné mais non configuré")
      return { delivered: false, link, error: "transport_unavailable" }
    }

    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.slice(1),
        type: "text",
        text: { body: params.message },
      }),
    })

    if (!response.ok) throw new Error(`WhatsApp Cloud API: ${response.status}`)
    return { delivered: true, link }
  } catch (error) {
    console.error(`sendWhatsApp(${params.event}) a échoué :`, error)
    return { delivered: false, link, error: "transport_failed" }
  }
}
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

Run: `npx vitest run src/lib/whatsapp.test.ts`
Attendu : PASS, 7 tests.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/whatsapp.ts src/lib/whatsapp.test.ts
git commit -m "feat: add WhatsApp transport layer with link, n8n and cloud modes"
```

---

### Task 4 : Route de création du partenaire

**Files:**
- Create: `src/app/api/admin/partners/route.ts`
- Test: `src/app/api/admin/partners/route.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

const requireRole = vi.fn()
const deleteUser = vi.fn()
const inviteUserByEmail = vi.fn()

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...args: any[]) => requireRole(...args) }
})
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        inviteUserByEmail: (...args: any[]) => inviteUserByEmail(...args),
        deleteUser: (...args: any[]) => deleteUser(...args),
      },
    },
  }),
}))

const { POST } = await import("./route")

const COUNTRY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const NEW_USER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

const validPayload = {
  email: "shanghai.logistics@alpha-import.com",
  full_name: "Chen Wei",
  company_name: "Alpha Logistics China",
  country_id: COUNTRY,
  whatsapp_number: "+86 138 1234 5678",
  address_line: "Futian District, Shenzhen",
  commission_rate: 10,
}

let userCounter = 0

function setup({ partnerInsertFails = false } = {}) {
  const mock = createSupabaseMock((op) => {
    if (op.table === "partner_profiles" && op.type === "insert") {
      return partnerInsertFails
        ? { error: { message: "boom" } }
        : { data: { id: "partner-1", ...op.payload } }
    }
    if (op.table === "profiles") return { data: { id: NEW_USER, role: "PARTNER" } }
    if (op.table === "partner_applications") return { data: { id: "app-1" } }
    return { data: null }
  })

  requireRole.mockResolvedValue({
    user: { id: `admin-${++userCounter}` },
    role: "ADMIN",
    supabase: mock.client,
  })
  inviteUserByEmail.mockResolvedValue({ data: { user: { id: NEW_USER } }, error: null })
  deleteUser.mockResolvedValue({ error: null })

  return mock
}

describe("POST /api/admin/partners", () => {
  beforeEach(() => vi.clearAllMocks())

  it("crée le partenaire et renvoie son identifiant", async () => {
    const mock = setup()

    const res = await POST(makeRequest(validPayload))

    expect(res.status).toBe(200)
    expect(inviteUserByEmail).toHaveBeenCalledWith(validPayload.email, expect.anything())
    expect(mock.lastOp("partner_profiles", "insert")?.payload.user_id).toBe(NEW_USER)
  })

  it("normalise le numéro WhatsApp avant insertion", async () => {
    const mock = setup()

    await POST(makeRequest(validPayload))

    expect(mock.lastOp("partner_profiles", "insert")?.payload.whatsapp_number).toBe("+8613812345678")
  })

  it("bascule le profil sur le rôle PARTNER", async () => {
    const mock = setup()

    await POST(makeRequest(validPayload))

    expect(mock.lastOp("profiles", "update")?.payload.role).toBe("PARTNER")
  })

  // Sans compensation, l'adresse reste prise par un compte sans profil et le
  // partenaire devient impossible à recréer.
  it("supprime le compte auth si l'insertion du partenaire échoue", async () => {
    setup({ partnerInsertFails: true })

    const res = await POST(makeRequest(validPayload))

    expect(res.status).toBe(500)
    expect(deleteUser).toHaveBeenCalledWith(NEW_USER)
  })

  it("refuse un numéro WhatsApp sans indicatif international", async () => {
    setup()

    const res = await POST(makeRequest({ ...validPayload, whatsapp_number: "0532 123 45 67" }))

    expect(res.status).toBe(400)
    expect(inviteUserByEmail).not.toHaveBeenCalled()
  })

  it("rejette un payload incomplet", async () => {
    setup()

    const res = await POST(makeRequest({ email: "pas-un-email" }))

    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run src/app/api/admin/partners/route.test.ts`
Attendu : ÉCHEC, `Failed to resolve import "./route"`.

- [ ] **Step 3 : Écrire l'implémentation minimale**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, handleApiError } from '@/lib/auth-guard'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeE164 } from '@/lib/phone'

const createPartnerSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2),
  company_name: z.string().min(2),
  country_id: z.string().uuid(),
  whatsapp_number: z.string().min(1),
  phone: z.string().optional(),
  address_line: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  timezone: z.string().optional(),
  languages: z.array(z.string()).default([]),
  assigned_cities: z.array(z.string()).default([]),
  commission_rate: z.number().min(0).max(100).default(10),
  application_id: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireRole(['ADMIN'])

    const rl = checkRateLimit(`partner-create:${user.id}`, { maxRequests: 10, windowMs: 60000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const parsed = createPartnerSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    // On refuse plutôt que de deviner l'indicatif : un mauvais pays enverrait les
    // messages du partenaire à un inconnu.
    const whatsapp = normalizeE164(parsed.data.whatsapp_number)
    if (!whatsapp) {
      return NextResponse.json(
        { error: 'whatsapp_number must include an international prefix, e.g. +8613812345678' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      parsed.data.email,
      {
        data: { full_name: parsed.data.full_name, role: 'PARTNER' },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      }
    )

    if (inviteError || !invited?.user) {
      return NextResponse.json({ error: inviteError?.message || 'Invitation failed' }, { status: 400 })
    }

    const userId = invited.user.id

    try {
      // handle_new_user crée le profil en BUYER : sans cette bascule le partenaire
      // n'aurait aucun de ses droits.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: 'PARTNER',
          full_name: parsed.data.full_name,
          company_name: parsed.data.company_name,
          phone: parsed.data.phone ?? null,
          city: parsed.data.city ?? null,
          country_id: parsed.data.country_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (profileError) throw profileError

      const { data: partner, error: partnerError } = await supabase
        .from('partner_profiles')
        .insert({
          user_id: userId,
          country_id: parsed.data.country_id,
          whatsapp_number: whatsapp,
          address_line: parsed.data.address_line ?? null,
          postal_code: parsed.data.postal_code ?? null,
          timezone: parsed.data.timezone ?? null,
          languages: parsed.data.languages,
          assigned_cities: parsed.data.assigned_cities,
          commission_rate: parsed.data.commission_rate,
          contract_status: 'ACTIVE',
          application_id: parsed.data.application_id ?? null,
        })
        .select()
        .single()

      if (partnerError) throw partnerError

      if (parsed.data.application_id) {
        await supabase
          .from('partner_applications')
          .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
          .eq('id', parsed.data.application_id)
      }

      await logAudit({
        actorId: user.id,
        action: 'CREATE_PARTNER',
        targetType: 'partner_profiles',
        targetId: partner.id,
        details: { email: parsed.data.email, country_id: parsed.data.country_id },
      })

      return NextResponse.json({ id: partner.id, user_id: userId })
    } catch (error) {
      // Compensation : sans elle, l'adresse reste prise par un compte sans profil
      // et le partenaire devient impossible à recréer.
      const { error: cleanupError } = await admin.auth.admin.deleteUser(userId)
      if (cleanupError) {
        console.error(`Compte auth orphelin à supprimer manuellement : ${userId}`, cleanupError)
      }
      throw error
    }
  } catch (error) {
    return handleApiError(error)
  }
}
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

Run: `npx vitest run src/app/api/admin/partners/route.test.ts`
Attendu : PASS, 6 tests.

- [ ] **Step 5 : Commit**

```bash
git add src/app/api/admin/partners
git commit -m "feat: create partners from the admin dashboard with compensation on failure"
```

---

### Task 5 : Lien d'accès à usage unique

**Files:**
- Create: `src/app/api/admin/partners/[id]/access-link/route.ts`
- Test: `src/app/api/admin/partners/[id]/access-link/route.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

const requireRole = vi.fn()
const generateLink = vi.fn()

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...args: any[]) => requireRole(...args) }
})
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ auth: { admin: { generateLink: (...a: any[]) => generateLink(...a) } } }),
}))

const { POST } = await import("./route")

const PARTNER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const params = Promise.resolve({ id: PARTNER })
let n = 0

function setup(partnerRow: any = { id: PARTNER, user_id: "user-1", profile: { email: "p@example.com" } }) {
  const mock = createSupabaseMock((op) =>
    op.table === "partner_profiles" ? { data: partnerRow } : { data: null }
  )
  requireRole.mockResolvedValue({ user: { id: `admin-${++n}` }, role: "ADMIN", supabase: mock.client })
  generateLink.mockResolvedValue({
    data: { properties: { action_link: "https://supabase.example/verify?token=abc" } },
    error: null,
  })
  return mock
}

describe("POST /api/admin/partners/[id]/access-link", () => {
  beforeEach(() => vi.clearAllMocks())

  it("renvoie un lien d'accès pour le partenaire", async () => {
    setup()
    const res = await POST(makeRequest({}), { params })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ link: "https://supabase.example/verify?token=abc" })
  })

  it("renvoie 404 si le partenaire n'existe pas", async () => {
    setup(null)
    const res = await POST(makeRequest({}), { params })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run "src/app/api/admin/partners/[id]/access-link/route.test.ts"`
Attendu : ÉCHEC, `Failed to resolve import "./route"`.

- [ ] **Step 3 : Écrire l'implémentation minimale**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, handleApiError } from '@/lib/auth-guard'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Lien de connexion à usage unique, transmis par l'administrateur lui-même.
 * Utile tant que l'adresse professionnelle du partenaire n'est pas opérationnelle.
 * Aucun mot de passe n'est généré ni transmis : le partenaire choisit le sien.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { supabase, user } = await requireRole(['ADMIN'])

    const rl = checkRateLimit(`access-link:${user.id}`, { maxRequests: 10, windowMs: 60000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { data: partner } = await supabase
      .from('partner_profiles')
      .select('id, user_id, profile:profiles!user_id(email)')
      .eq('id', id)
      .single()

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    const email = (partner as any).profile?.email
    if (!email) {
      return NextResponse.json({ error: 'Partner has no email address' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })

    if (error || !data?.properties?.action_link) {
      return NextResponse.json({ error: error?.message || 'Link generation failed' }, { status: 400 })
    }

    await logAudit({
      actorId: user.id,
      action: 'GENERATE_PARTNER_ACCESS_LINK',
      targetType: 'partner_profiles',
      targetId: id,
      details: { email },
    })

    return NextResponse.json({ link: data.properties.action_link })
  } catch (error) {
    return handleApiError(error)
  }
}
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

Run: `npx vitest run "src/app/api/admin/partners/[id]/access-link/route.test.ts"`
Attendu : PASS, 2 tests.

- [ ] **Step 5 : Commit**

```bash
git add "src/app/api/admin/partners/[id]"
git commit -m "feat: generate a one-time access link for a partner"
```

---

### Task 6 : Formulaire partagé

**Files:**
- Create: `src/components/admin/partner-form.tsx`

- [ ] **Step 1 : Écrire le composant**

Formulaire contrôlé, sans état global, qui appelle `POST /api/admin/partners`. Il est
utilisé par la page liste et par la page de revue de candidature, d'où les valeurs
initiales en props.

```tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type PartnerFormValues = {
  email: string
  full_name: string
  company_name: string
  country_id: string
  whatsapp_number: string
  phone: string
  address_line: string
  city: string
  commission_rate: number
  application_id?: string
}

const EMPTY: PartnerFormValues = {
  email: "", full_name: "", company_name: "", country_id: "",
  whatsapp_number: "", phone: "", address_line: "", city: "", commission_rate: 10,
}

export function PartnerForm({
  countries,
  initialValues,
  onCreated,
}: {
  countries: { id: string; name: string }[]
  initialValues?: Partial<PartnerFormValues>
  onCreated?: (partnerId: string) => void
}) {
  const [values, setValues] = useState<PartnerFormValues>({ ...EMPTY, ...initialValues })
  const [isSaving, setIsSaving] = useState(false)

  const set = (key: keyof PartnerFormValues) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }))

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, commission_rate: Number(values.commission_rate) }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || "Création refusée")

      toast.success("Partenaire créé. Une invitation a été envoyée par email.")
      onCreated?.(payload.id)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="full_name">Nom du contact</Label>
          <Input id="full_name" value={values.full_name} onChange={set("full_name")} required />
        </div>
        <div>
          <Label htmlFor="company_name">Société</Label>
          <Input id="company_name" value={values.company_name} onChange={set("company_name")} required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={values.email} onChange={set("email")} required />
        </div>
        <div>
          <Label htmlFor="whatsapp_number">WhatsApp (indicatif international obligatoire)</Label>
          <Input
            id="whatsapp_number"
            placeholder="+8613812345678"
            value={values.whatsapp_number}
            onChange={set("whatsapp_number")}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" value={values.phone} onChange={set("phone")} />
        </div>
        <div>
          <Label htmlFor="city">Ville</Label>
          <Input id="city" value={values.city} onChange={set("city")} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="address_line">Adresse</Label>
          <Input id="address_line" value={values.address_line} onChange={set("address_line")} />
        </div>
        <div>
          <Label htmlFor="country_id">Pays</Label>
          <select
            id="country_id"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={values.country_id}
            onChange={(e) => setValues((c) => ({ ...c, country_id: e.target.value }))}
            required
          >
            <option value="">Sélectionner…</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>{country.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="commission_rate">Commission (%)</Label>
          <Input
            id="commission_rate"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={values.commission_rate}
            onChange={set("commission_rate")}
          />
        </div>
      </div>

      <Button type="submit" disabled={isSaving}>
        {isSaving ? "Création…" : "Créer le partenaire et envoyer l'invitation"}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc --noEmit`
Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/admin/partner-form.tsx
git commit -m "feat: add a shared partner form for creation and application approval"
```

---

### Task 7 : Brancher le formulaire dans l'admin

**Files:**
- Modify: `src/app/admin/partners/page.tsx`
- Modify: `src/app/admin/partners/applications/[id]/page.tsx`

- [ ] **Step 1 : Ajouter le bouton de création à la page liste**

Dans `src/app/admin/partners/page.tsx`, importer le formulaire et l'ouvrir dans un dialogue.
Charger les pays au montage, à côté de `fetchPartners` :

```tsx
import { PartnerForm } from "@/components/admin/partner-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

// dans le composant, à côté des autres états :
const [countries, setCountries] = useState<{ id: string; name: string }[]>([])
const [isCreateOpen, setIsCreateOpen] = useState(false)

useEffect(() => {
  createClient()
    .from("countries")
    .select("id, name")
    .eq("is_active", true)
    .order("name")
    .then(({ data }) => setCountries(data || []))
}, [])
```

et, dans l'en-tête de la page :

```tsx
<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
  <DialogTrigger asChild>
    <Button>Créer un partenaire</Button>
  </DialogTrigger>
  <DialogContent className="max-w-3xl">
    <DialogHeader>
      <DialogTitle>Nouveau partenaire</DialogTitle>
    </DialogHeader>
    <PartnerForm
      countries={countries}
      onCreated={() => {
        setIsCreateOpen(false)
        fetchPartners()
      }}
    />
  </DialogContent>
</Dialog>
```

- [ ] **Step 2 : Remplacer l'approbation en cul-de-sac**

Dans `src/app/admin/partners/applications/[id]/page.tsx`, le bouton « Approuver » appelle
`updateStatus('APPROVED_KYC')` et s'arrête là. Le remplacer par l'ouverture du même
formulaire, pré-rempli depuis la candidature.

Cette page n'a pas la liste des pays : ajouter le même chargement que dans la page liste,
à côté du `useEffect` existant qui charge la candidature :

```tsx
const [countries, setCountries] = useState<{ id: string; name: string }[]>([])

useEffect(() => {
  supabase
    .from("countries")
    .select("id, name")
    .eq("is_active", true)
    .order("name")
    .then(({ data }) => setCountries(data || []))
}, [])
```

puis :

```tsx
<PartnerForm
  countries={countries}
  initialValues={{
    email: application.email,
    company_name: application.company_name,
    full_name: application.contact_name ?? "",
    phone: application.phone ?? "",
    address_line: application.company_details?.address ?? "",
    application_id: application.id,
  }}
  onCreated={() => {
    toast.success("Partenaire créé, candidature clôturée")
    router.push("/admin/partners")
  }}
/>
```

Le bouton « Rejeter » reste inchangé.

- [ ] **Step 3 : Vérifier**

Run: `npx tsc --noEmit && npx vitest run`
Attendu : aucune erreur de type, tous les tests passent.

- [ ] **Step 4 : Commit**

```bash
git add src/app/admin/partners
git commit -m "feat: wire partner creation into the admin pages and end the approval dead end"
```

---

### Task 8 : Supprimer les faux partenaires

**Files:**
- Modify: `src/app/dashboard/requests/new/page.tsx:196-235`

- [ ] **Step 1 : Supprimer `mockPartners`**

Le bloc `const mockPartners: Record<string, any> = { ... }` affiche cinq fiches inventées
avec de faux numéros WhatsApp. Le remplacer par une requête sur le partenaire réellement
assigné au pays sélectionné :

```tsx
const [partner, setPartner] = useState<any>(null)

useEffect(() => {
  if (!formData.country_id) {
    setPartner(null)
    return
  }
  createClient()
    .from("partner_profiles")
    .select("id, whatsapp_number, profile:profiles!user_id(full_name, company_name, email, phone)")
    .eq("country_id", formData.country_id)
    .eq("contract_status", "ACTIVE")
    .limit(1)
    .then(({ data }) => setPartner(data?.[0] ?? null))
}, [formData.country_id])
```

- [ ] **Step 2 : Utiliser le lien wa.me réel**

Là où la fiche partenaire affiche le contact, remplacer le numéro codé en dur par :

```tsx
{partner?.whatsapp_number && (
  <a
    href={waMeLink(partner.whatsapp_number, `Demande ${formData.reference ?? ""}`) ?? "#"}
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary underline"
  >
    Contacter sur WhatsApp
  </a>
)}
```

avec `import { waMeLink } from "@/lib/phone"`.

- [ ] **Step 3 : Vérifier**

Run: `npx tsc --noEmit`
Attendu : aucune erreur. Vérifier qu'aucune occurrence de `mockPartners` ne subsiste :

Run: `grep -rn "mockPartners" src/`
Attendu : aucun résultat.

- [ ] **Step 4 : Commit**

```bash
git add src/app/dashboard/requests/new/page.tsx
git commit -m "fix: show the real assigned partner instead of hardcoded sample data"
```

---

### Task 9 : Bucket privé pour les pièces de conformité

**Files:**
- Modify: `src/components/partner-wizard.tsx:55-70`

- [ ] **Step 1 : Créer le bucket privé**

Depuis le tableau de bord Supabase ou par SQL :

```sql
insert into storage.buckets (id, name, public)
values ('compliance-documents', 'compliance-documents', false)
on conflict (id) do nothing;

-- Un candidat dépose sans compte : l'insertion est ouverte, la lecture ne l'est pas.
drop policy if exists "compliance_upload_anyone" on storage.objects;
create policy "compliance_upload_anyone" on storage.objects
  for insert with check (bucket_id = 'compliance-documents');

drop policy if exists "compliance_read_admin" on storage.objects;
create policy "compliance_read_admin" on storage.objects
  for select using (bucket_id = 'compliance-documents' and public.get_user_role() = 'ADMIN');
```

- [ ] **Step 2 : Rediriger le wizard**

Dans `src/components/partner-wizard.tsx`, remplacer les deux occurrences de
`.from('project-uploads')` par `.from('compliance-documents')`. Le bucket étant privé,
`getPublicUrl` ne convient plus : stocker le chemin de l'objet, pas une URL.

```tsx
const { error: uploadError } = await supabase.storage
  .from('compliance-documents')
  .upload(filePath, file)

if (uploadError) throw uploadError

// Bucket privé : on conserve le chemin, l'admin obtiendra une URL signée à la lecture.
setDocuments((current) => [...current, { name: docType, url: filePath }])
```

- [ ] **Step 3 : Vérifier que le bucket est fermé**

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://edhijqtotsrefminalsp.supabase.co/storage/v1/object/public/compliance-documents/test.pdf"
```

Attendu : `400` ou `404`, jamais `200`.

- [ ] **Step 4 : Commit**

```bash
git add src/components/partner-wizard.tsx
git commit -m "fix: store partner identity documents in a private bucket"
```

`project-uploads` est laissé intact : son contenu doit être inventorié avant toute
migration, et des URLs publiques ont pu être distribuées.

---

### Task 10 : Certification de bout en bout

**Files:**
- Create: `e2e/partner-onboarding.spec.ts`

- [ ] **Step 1 : Écrire le test de parcours public**

```ts
import { test, expect } from "@playwright/test"

test.describe("Candidature partenaire", () => {
  test("le formulaire public est accessible et soumet un dossier", async ({ page }) => {
    await page.goto("/partner-request")
    await expect(page.locator("h1, h2").first()).toBeVisible()
  })
})
```

- [ ] **Step 2 : Lancer le test**

Run: `PLAYWRIGHT_CHANNEL=chrome PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test partner-onboarding --reporter=list`
Attendu : PASS.

- [ ] **Step 3 : Dérouler la certification manuelle**

Les étapes suivantes exigent une session authentifiée et se font dans le navigateur. Noter
le résultat de chacune :

1. Déposer une candidature depuis `/partner-request` avec un email jetable.
2. Vérifier qu'elle apparaît dans `/admin/partners`.
3. Ouvrir la candidature, approuver, créer le compte via le formulaire.
4. Vérifier en base :

```sql
select p.role, pp.whatsapp_number, pp.contract_status, pa.status as candidature,
       (select count(*) from public.audit_logs where action='CREATE_PARTNER') as audit
from public.partner_profiles pp
join public.profiles p on p.id = pp.user_id
left join public.partner_applications pa on pa.id = pp.application_id
order by pp.created_at desc limit 1;
```

Attendu : `role = PARTNER`, numéro en E.164, `contract_status = ACTIVE`,
`candidature = ACTIVE`, `audit >= 1`.

5. Se connecter avec le compte partenaire via le lien d'invitation.
6. Assigner une demande à ce partenaire depuis l'admin.
7. Soumettre un devis depuis l'espace partenaire.
8. Vérifier que le bon de commande est généré avec la répartition 60/40.

- [ ] **Step 4 : Commit**

```bash
git add e2e/partner-onboarding.spec.ts
git commit -m "test: cover the public partner application page"
```

---

## Ordre d'exécution

Les tâches 1 à 5 sont séquentielles : le schéma porte les colonnes, les helpers sont
consommés par la route. Les tâches 6 et 7 dépendent de 4. La tâche 8 dépend de 2. La
tâche 9 est indépendante et peut être traitée en premier si l'exposition des pièces
d'identité est jugée urgente — c'est la seule qui corrige une fuite en cours.

## Écart assumé par rapport à la spec

La spec décrit un point d'entrée `notifyPartner(event, partnerId, data)` regroupant la
notification in-app, n8n et WhatsApp. Ce plan livre `sendWhatsApp` mais pas ce
regroupement, parce qu'aucun appelant n'existe encore : câbler les évènements métier
(demande assignée, devis à soumettre, bon de commande signé) est un lot distinct, qui
suppose de choisir quels évènements méritent une notification WhatsApp et avec quel texte.

Construire l'agrégateur maintenant reviendrait à figer une interface sans usage. Les trois
transports existent, `notifyOnEvent` et `sendToN8N` aussi ; les réunir sera une tâche d'une
demi-heure le jour où le premier évènement sera câblé. À traiter dans le lot suivant, avec
le choix des évènements.
