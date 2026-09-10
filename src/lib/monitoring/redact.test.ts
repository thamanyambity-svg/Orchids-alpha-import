import { describe, it, expect } from "vitest"
import { redactString, redactValue, redactError, LONGUEUR_MAX } from "./redact"

/**
 * Rédaction avant enregistrement d'un incident.
 *
 * Ces tests portent sur des fuites réelles, pas théoriques : chaque cas
 * reproduit une chaîne telle qu'elle apparaît dans une pile d'appels de ce
 * projet — corps du formulaire de mandat, en-tête d'un appel Supabase, message
 * du SDK Stripe, URL de lien de connexion.
 *
 * La règle est asymétrique : laisser passer un secret est une fuite, masquer
 * un peu trop n'est qu'une gêne au diagnostic. En cas de doute, on masque.
 *
 * Les valeurs d'exemple portent toutes une marque explicite (EXEMPLEDETEST,
 * FAUSSE, EXEMPLE). Une première version utilisait des chaînes ressemblant à
 * de vraies clés : un audit de l'historique Git les a prises pour des secrets
 * réellement divulgués, ce qui a déclenché une rotation inutile. Un jeu de
 * test doit être reconnaissable comme tel, y compris par un outil.
 */

describe("redactString — secrets", () => {
  it("masque une clé secrète Stripe recopiée dans un message d'erreur", () => {
    const brut = "StripeAuthenticationError: Invalid API Key provided: sk_live_EXEMPLEDETESTNONREEL"
    const sortie = redactString(brut)
    expect(sortie).not.toContain("sk_live_EXEMPLEDETESTNONREEL")
    expect(sortie).toContain("[SK_LIVE_MASQUEE]")
  })

  it("masque aussi une clé de test — un secret de test reste un secret", () => {
    expect(redactString("key=sk_test_EXEMPLEDETESTNONREEL")).not.toContain("abcdefgh12345678")
  })

  it("masque le secret de signature d'un webhook", () => {
    const sortie = redactString("whsec_9f8e7d6c5b4a39281706")
    expect(sortie).not.toContain("9f8e7d6c5b4a39281706")
    expect(sortie).toContain("[WHSEC_MASQUEE]")
  })

  it("laisse passer la clé publiable, qui est destinée au navigateur", () => {
    // La masquer priverait le diagnostic de l'indication d'environnement,
    // sans rien protéger : cette clé est servie dans le bundle.
    const sortie = redactString("stripe key pk_live_EXEMPLEDETESTNONREEL")
    expect(sortie).toContain("pk_live_EXEMPLEDETESTNONREEL")
  })

  it("masque un jeton JWT — jeton de session ou clé service_role", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.4pCJx7Qk_signature"
    const sortie = redactString(`failed with token ${jwt}`)
    expect(sortie).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9")
    expect(sortie).toContain("[JWT_MASQUE]")
  })

  it("masque la nouvelle clé secrète Supabase", () => {
    const sortie = redactString("sb_secret_vak0hxI8xZcZ7IAaXvYAcEhOaiIy")
    expect(sortie).not.toContain("vak0hxI8xZcZ7IAaXvYAcEhOaiIy")
  })

  it("masque un en-tête Authorization sans perdre le schéma", () => {
    const sortie = redactString("Authorization: Bearer abc123DEF456ghi789JKL")
    expect(sortie).not.toContain("abc123DEF456ghi789JKL")
    // Le schéma reste lisible : il distingue un appel mal authentifié d'un
    // appel non authentifié.
    expect(sortie).toContain("Bearer [JETON_MASQUE]")
  })

  it("masque les identifiants d'une chaîne de connexion Postgres", () => {
    const sortie = redactString(
      "connect ECONNREFUSED postgresql://postgres:MotDePasse123@db.abc.supabase.co:5432/postgres"
    )
    expect(sortie).not.toContain("MotDePasse123")
    expect(sortie).not.toContain("postgres:MotDePasse123")
    // L'hôte survit : c'est lui qui dit quelle base était visée.
    expect(sortie).toContain("db.abc.supabase.co")
  })
})

describe("redactString — données personnelles", () => {
  it("masque un IBAN en gardant ses quatre derniers caractères", () => {
    const sortie = redactString("iban invalide : FR7630006000011234567890189")
    expect(sortie).not.toContain("FR7630006000011234567890189")
    expect(sortie).toContain("FR76")
    // Ce que le client voit sur son propre mandat, et qui permet le rapprochement.
    expect(sortie).toContain("0189")
  })

  it("masque un IBAN d'un autre pays et d'une autre longueur", () => {
    const sortie = redactString("DE89370400440532013000")
    expect(sortie).not.toContain("DE89370400440532013000")
    expect(sortie).toContain("3000")
  })

  it("masque un numéro de carte en gardant les quatre derniers chiffres", () => {
    const sortie = redactString("card 4242 4242 4242 4242 declined")
    expect(sortie).not.toContain("4242 4242 4242 4242")
    expect(sortie).toContain("4242")
  })

  it("ne prend pas un UUID pour un numéro de carte", () => {
    // Régression constatée en production : la règle « carte » avalait
    // 55550000-2222-4222-8222 et détruisait l'identifiant, ce qui corrompait
    // la donnée et scindait le regroupement des incidents.
    const uuid = "55550000-2222-4222-8222-cccccccccccc"
    expect(redactString(`Commande ${uuid} introuvable`)).toContain(uuid)
  })

  it("ne prend pas une suite de chiffres quelconque pour une carte", () => {
    // Référence de commande, horodatage, numéro de conteneur : rien de tout
    // cela ne doit être masqué.
    const brut = "commande 1234567890123456789 au 2026-09-09 14:22:31"
    const sortie = redactString(brut)
    expect(sortie).toContain("1234567890123456789")
    expect(sortie).toContain("2026-09-09")
  })

  it("masque un numéro de carte valide, y compris sans séparateurs", () => {
    // Ce qui distingue une vraie carte d'une suite de chiffres est la clé de
    // Luhn : c'est elle qui sert de discriminant.
    expect(redactString("card 4242424242424242 declined")).not.toContain("4242424242424242")
    expect(redactString("card 5555555555554444 declined")).not.toContain("5555555555554444")
  })

  it("masque un courriel en gardant le domaine", () => {
    const sortie = redactString("user acheteur.dupont@example.com not found")
    expect(sortie).not.toContain("acheteur.dupont")
    expect(sortie).toContain("@example.com")
  })

  it("masque le jeton d'un lien de connexion à usage unique", () => {
    const sortie = redactString(
      "redirect https://site.test/auth/callback?token_hash=pkce_9f8e7d6c5b4a&type=magiclink"
    )
    expect(sortie).not.toContain("pkce_9f8e7d6c5b4a")
    // Le reste de l'URL est conservé : sans le chemin, l'incident est muet.
    expect(sortie).toContain("/auth/callback")
    expect(sortie).toContain("type=magiclink")
  })

  it("masque un access_token porté par une URL", () => {
    const sortie = redactString("?access_token=ya29.SECRETVALUE&state=x")
    expect(sortie).not.toContain("ya29.SECRETVALUE")
    expect(sortie).toContain("state=x")
  })
})

describe("redactString — bornes", () => {
  it("tronque un message démesuré en disant la taille d'origine", () => {
    const sortie = redactString("a".repeat(LONGUEUR_MAX + 500))
    expect(sortie.length).toBeLessThan(LONGUEUR_MAX + 100)
    expect(sortie).toContain("tronqué")
    expect(sortie).toContain(String(LONGUEUR_MAX + 500))
  })

  it("laisse intact un texte sans rien de sensible", () => {
    const brut = "TypeError: Cannot read properties of undefined (reading 'status')"
    expect(redactString(brut)).toBe(brut)
  })

  it("traite une entrée hostile en temps linéaire", () => {
    // Un motif à quantificateurs imbriqués transformerait cette chaîne en
    // blocage du processus. Le budget est large pour rester stable en CI.
    const hostile = `${"1234-".repeat(4000)}x`
    const debut = Date.now()
    redactString(hostile)
    expect(Date.now() - debut).toBeLessThan(2000)
  })
})

describe("redactValue — objets de contexte", () => {
  it("masque toute valeur portée par une clé sensible, quel que soit son contenu", () => {
    const sortie = redactValue({
      orderId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      password: "correct horse battery staple",
      stripeSecretKey: "peu importe",
      Authorization: "peu importe",
      iban: "FR7630006000011234567890189",
    }) as Record<string, unknown>

    expect(sortie.password).toBe("[MASQUE]")
    expect(sortie.stripeSecretKey).toBe("[MASQUE]")
    expect(sortie.Authorization).toBe("[MASQUE]")
    expect(sortie.iban).toBe("[MASQUE]")
    // L'identifiant de commande est ce qui rend l'incident exploitable.
    expect(sortie.orderId).toBe("cccccccc-cccc-4ccc-8ccc-cccccccccccc")
  })

  it("reconnaît une clé sensible quelle que soit sa casse ou son enrobage", () => {
    const sortie = redactValue({
      SUPABASE_SERVICE_ROLE_KEY: "x",
      refreshToken: "x",
      "set-cookie": "x",
    }) as Record<string, unknown>
    expect(Object.values(sortie)).toEqual(["[MASQUE]", "[MASQUE]", "[MASQUE]"])
  })

  it("masque aussi en profondeur, pas seulement au premier niveau", () => {
    const sortie = redactValue({ requete: { corps: { iban: "FR76300060000112345678" } } }) as any
    expect(sortie.requete.corps.iban).toBe("[MASQUE]")
  })

  it("masque les motifs sensibles des valeurs dont la clé est anodine", () => {
    // Le cas réel : un message de validation qui recopie la saisie.
    const sortie = redactValue({ detail: "IBAN FR7630006000011234567890189 rejeté" }) as any
    expect(sortie.detail).not.toContain("FR7630006000011234567890189")
  })

  it("s'arrête sur une référence circulaire au lieu de tourner", () => {
    const a: Record<string, unknown> = { nom: "a" }
    a.moi = a
    expect(() => redactValue(a)).not.toThrow()
    expect(JSON.stringify(redactValue(a))).toContain("référence circulaire")
  })

  it("borne la profondeur d'un objet très imbriqué", () => {
    let noeud: Record<string, unknown> = { fin: true }
    for (let i = 0; i < 20; i++) noeud = { suivant: noeud }
    expect(JSON.stringify(redactValue(noeud))).toContain("profondeur maximale")
  })

  it("borne la taille d'un tableau en disant combien manque", () => {
    const sortie = redactValue(Array.from({ length: 100 }, (_, i) => i)) as unknown[]
    expect(sortie.length).toBeLessThanOrEqual(41)
    expect(String(sortie[sortie.length - 1])).toContain("omis")
  })

  it("rend une valeur sérialisable en JSON dans tous les cas", () => {
    const sortie = redactValue({
      f: () => null,
      d: new Date("2026-01-01T00:00:00Z"),
      g: BigInt(10),
      u: undefined,
      n: null,
    })
    expect(() => JSON.stringify(sortie)).not.toThrow()
  })
})

describe("redactError", () => {
  it("conserve le nom, le message et la pile", () => {
    const e = new TypeError("quelque chose a cassé")
    const sortie = redactError(e)
    expect(sortie.name).toBe("TypeError")
    expect(sortie.message).toBe("quelque chose a cassé")
    expect(sortie.stack).toContain("TypeError")
  })

  it("masque un secret présent dans la pile, pas seulement dans le message", () => {
    // Cas réel : une couche inférieure recopie l'URL appelée dans sa pile.
    const e = new Error("échec")
    e.stack = "Error: échec\n    at fetch (https://api.test/x?token=SECRETABC123)"
    const sortie = redactError(e)
    expect(sortie.stack).not.toContain("SECRETABC123")
  })

  it("masque la cause chaînée", () => {
    const e = new Error("échec haut niveau", {
      cause: new Error("clé sk_live_AUTREEXEMPLEDETEST refusée"),
    })
    expect(JSON.stringify(redactError(e))).not.toContain("ABCDEFGH12345678")
  })

  it("accepte ce qui n'est pas une Error sans lever", () => {
    expect(redactError("panne brute").message).toBe("panne brute")
    expect(redactError({ code: 500 }).name).toBe("Error")
    expect(() => redactError(null)).not.toThrow()
    expect(() => redactError(undefined)).not.toThrow()
  })

  it("lit le message d'une erreur Supabase au lieu de « [object Object] »", () => {
    const sortie = redactError({
      message: "Could not find the 'buyer_country' column of 'import_requests' in the schema cache",
      code: "PGRST204",
      details: null,
      hint: null,
    })
    expect(sortie.name).toBe("PostgrestError")
    expect(sortie.message).toContain("buyer_country")
    expect(sortie.message).toContain("PGRST204")
    expect(sortie.message).not.toContain("[object Object]")
  })

  it("masque un secret présent dans le détail d'une erreur Supabase", () => {
    const sortie = redactError({ message: "échec", code: "42501", details: "clé sk_live_AUTREEXEMPLEDETEST refusée" })
    expect(sortie.message).not.toContain("AUTREEXEMPLEDETEST")
  })
})
