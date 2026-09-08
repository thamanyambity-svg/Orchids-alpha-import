import { describe, it, expect } from "vitest"
import crypto from "crypto"
import { verifySharedSecret, verifySvixSignature } from "./webhook-verify"

/**
 * Vérification de signature des webhooks entrants.
 *
 * C'est la seule barrière entre un tiers et l'écriture de données système. Elle
 * doit échouer fermé dans tous les cas dégradés — secret absent, en-tête
 * manquant, horodatage hors fenêtre — parce qu'un webhook qui accepte par
 * défaut n'est pas une barrière du tout.
 */

const SECRET_BRUT = crypto.randomBytes(24).toString("base64")
const SECRET = `whsec_${SECRET_BRUT}`

function signer(id: string, timestamp: number, corps: string, secret = SECRET_BRUT) {
  return crypto
    .createHmac("sha256", Buffer.from(secret, "base64"))
    .update(`${id}.${timestamp}.${corps}`)
    .digest("base64")
}

function entetes(o: Record<string, string>) {
  return new Headers(o)
}

describe("verifySharedSecret", () => {
  it("accepte le secret exact", () => {
    expect(verifySharedSecret("s3cr3t", "s3cr3t")).toBe(true)
  })

  it("refuse un secret différent", () => {
    expect(verifySharedSecret("s3cr3t", "autre!")).toBe(false)
  })

  it("refuse un secret de longueur différente sans lever", () => {
    // timingSafeEqual jette si les tampons diffèrent en longueur : la
    // comparaison doit court-circuiter proprement.
    expect(() => verifySharedSecret("court", "beaucoup-plus-long")).not.toThrow()
    expect(verifySharedSecret("court", "beaucoup-plus-long")).toBe(false)
  })

  it("échoue fermé quand le secret attendu n'est pas configuré", () => {
    expect(verifySharedSecret("s3cr3t", undefined)).toBe(false)
    expect(verifySharedSecret("s3cr3t", "")).toBe(false)
  })

  it("échoue fermé quand l'en-tête est absent", () => {
    expect(verifySharedSecret(null, "s3cr3t")).toBe(false)
    expect(verifySharedSecret(undefined, "s3cr3t")).toBe(false)
    expect(verifySharedSecret("", "s3cr3t")).toBe(false)
  })
})

describe("verifySvixSignature", () => {
  const CORPS = JSON.stringify({ type: "email.received", data: { email_id: "e1" } })
  const ID = "msg_2abc"

  function maintenant() {
    return Math.floor(Date.now() / 1000)
  }

  it("accepte une signature correcte dans la fenêtre", () => {
    const ts = maintenant()
    const h = entetes({
      "svix-id": ID,
      "svix-timestamp": String(ts),
      "svix-signature": `v1,${signer(ID, ts, CORPS)}`,
    })
    expect(verifySvixSignature(CORPS, h, SECRET)).toBe(true)
  })

  it("refuse un corps modifié après signature", () => {
    const ts = maintenant()
    const h = entetes({
      "svix-id": ID,
      "svix-timestamp": String(ts),
      "svix-signature": `v1,${signer(ID, ts, CORPS)}`,
    })
    expect(verifySvixSignature(CORPS + " ", h, SECRET)).toBe(false)
  })

  it("refuse une signature valide pour un autre identifiant de message", () => {
    const ts = maintenant()
    const h = entetes({
      "svix-id": "msg_autre",
      "svix-timestamp": String(ts),
      "svix-signature": `v1,${signer(ID, ts, CORPS)}`,
    })
    expect(verifySvixSignature(CORPS, h, SECRET)).toBe(false)
  })

  it("refuse un horodatage trop ancien — anti-rejeu", () => {
    const vieux = maintenant() - 600
    const h = entetes({
      "svix-id": ID,
      "svix-timestamp": String(vieux),
      "svix-signature": `v1,${signer(ID, vieux, CORPS)}`,
    })
    expect(verifySvixSignature(CORPS, h, SECRET)).toBe(false)
  })

  it("refuse un horodatage dans le futur", () => {
    const futur = maintenant() + 600
    const h = entetes({
      "svix-id": ID,
      "svix-timestamp": String(futur),
      "svix-signature": `v1,${signer(ID, futur, CORPS)}`,
    })
    expect(verifySvixSignature(CORPS, h, SECRET)).toBe(false)
  })

  it("refuse un horodatage non numérique au lieu de le traiter comme zéro", () => {
    const h = entetes({
      "svix-id": ID,
      "svix-timestamp": "hier",
      "svix-signature": "v1,peu-importe",
    })
    expect(verifySvixSignature(CORPS, h, SECRET)).toBe(false)
  })

  it("échoue fermé si un en-tête manque", () => {
    const ts = maintenant()
    const sig = signer(ID, ts, CORPS)
    for (const absent of ["svix-id", "svix-timestamp", "svix-signature"]) {
      const base: Record<string, string> = {
        "svix-id": ID,
        "svix-timestamp": String(ts),
        "svix-signature": `v1,${sig}`,
      }
      delete base[absent]
      expect(verifySvixSignature(CORPS, entetes(base), SECRET), absent).toBe(false)
    }
  })

  it("échoue fermé quand le secret n'est pas configuré", () => {
    const ts = maintenant()
    const h = entetes({
      "svix-id": ID,
      "svix-timestamp": String(ts),
      "svix-signature": `v1,${signer(ID, ts, CORPS)}`,
    })
    expect(verifySvixSignature(CORPS, h, undefined)).toBe(false)
  })

  it("refuse une signature produite avec un autre secret", () => {
    const autre = crypto.randomBytes(24).toString("base64")
    const ts = maintenant()
    const h = entetes({
      "svix-id": ID,
      "svix-timestamp": String(ts),
      "svix-signature": `v1,${signer(ID, ts, CORPS, autre)}`,
    })
    expect(verifySvixSignature(CORPS, h, SECRET)).toBe(false)
  })

  it("accepte quand l'en-tête porte plusieurs signatures dont une valide", () => {
    // Svix envoie plusieurs signatures pendant une rotation de secret.
    const ts = maintenant()
    const valide = signer(ID, ts, CORPS)
    const h = entetes({
      "svix-id": ID,
      "svix-timestamp": String(ts),
      "svix-signature": `v1,signature-perimee v1,${valide}`,
    })
    expect(verifySvixSignature(CORPS, h, SECRET)).toBe(true)
  })

  it("refuse quand aucune des signatures fournies n'est valide", () => {
    const ts = maintenant()
    const h = entetes({
      "svix-id": ID,
      "svix-timestamp": String(ts),
      "svix-signature": "v1,aaaa v1,bbbb",
    })
    expect(verifySvixSignature(CORPS, h, SECRET)).toBe(false)
  })
})
