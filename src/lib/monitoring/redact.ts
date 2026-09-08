/**
 * Rédaction des secrets et données personnelles avant enregistrement d'une erreur.
 *
 * Une trace d'exception n'est pas un texte neutre. Sur cette plateforme elle
 * embarque couramment, sans que personne l'ait voulu : l'IBAN posté au
 * formulaire de mandat, le jeton de session Supabase d'un en-tête
 * `Authorization`, une clé Stripe recopiée par le SDK dans son message
 * d'erreur, ou l'URL complète d'un lien de connexion à usage unique.
 *
 * Enregistrer cela — même dans notre propre base — revient à recopier des
 * secrets dans une table que consulteront des administrateurs, et à faire
 * survivre à la session un jeton qui devait mourir avec elle.
 *
 * Le parti pris est de masquer par motif plutôt que par nom de champ : le nom
 * du champ est inconnu au milieu d'une pile d'appels. Les motifs sont donc
 * appliqués au texte final, quel que soit son chemin d'arrivée.
 *
 * Le compromis assumé est de garder un fragment identifiant (les quatre
 * derniers chiffres d'un IBAN, le domaine d'un courriel) : sans lui, deux
 * incidents distincts deviennent indiscernables et la supervision ne sert plus
 * à rien.
 */

/** Au-delà, un message d'erreur n'apporte plus rien et remplit la base. */
export const LONGUEUR_MAX = 4000

/** Profondeur maximale explorée dans un objet de contexte. */
const PROFONDEUR_MAX = 4

/** Nombre maximal de clés retenues par objet. */
const CLES_MAX = 40

/**
 * Clés dont la valeur est masquée intégralement, quel que soit son contenu.
 * La comparaison est faite en minuscules et sur inclusion : `stripeSecretKey`
 * comme `STRIPE_SECRET_KEY` sont couverts par `secret`.
 */
const CLES_SENSIBLES = [
  "password",
  "passwd",
  "secret",
  "token",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "session",
  "credential",
  "iban",
  "bic",
  "cvc",
  "cvv",
  "service_role",
]

interface Motif {
  nom: string
  motif: RegExp
  remplacement: (correspondance: string, ...groupes: string[]) => string
}

/**
 * Les motifs sont ordonnés : le plus spécifique d'abord. Un IBAN masqué avant
 * la règle générique des longues suites alphanumériques garde ses quatre
 * derniers chiffres ; l'inverse le réduirait à une bouillie inexploitable.
 *
 * Aucun motif n'utilise de quantificateur imbriqué : le coût reste linéaire,
 * sinon un message hostile suffirait à bloquer le processus.
 */
const MOTIFS: Motif[] = [
  {
    // Chaîne de connexion Postgres : l'identifiant et le mot de passe y sont en clair.
    nom: "chaine-connexion",
    motif: /\b(postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:@/]+:[^\s@/]+@/gi,
    remplacement: (_m, schema: string) => `${schema}://[IDENTIFIANTS_MASQUES]@`,
  },
  {
    // Clés secrètes Stripe. Les clés publiables (pk_) sont volontairement
    // épargnées : elles sont destinées au navigateur et servent à identifier
    // l'environnement dans lequel l'incident s'est produit.
    nom: "cle-stripe",
    motif: /\b((?:sk|rk)_(?:live|test)|whsec)_[A-Za-z0-9]{8,}/g,
    remplacement: (_m, prefixe: string) => `[${prefixe.toUpperCase()}_MASQUEE]`,
  },
  {
    // Clé secrète Supabase nouvelle génération.
    nom: "cle-supabase",
    motif: /\bsb_secret_[A-Za-z0-9_-]{8,}/g,
    remplacement: () => "[SB_SECRET_MASQUEE]",
  },
  {
    // Jeton JWT — jeton de session Supabase, clé service_role héritée.
    nom: "jwt",
    motif: /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}/g,
    remplacement: () => "[JWT_MASQUE]",
  },
  {
    nom: "en-tete-bearer",
    motif: /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi,
    remplacement: (_m, schema: string) => `${schema} [JETON_MASQUE]`,
  },
  {
    // IBAN : deux lettres de pays, deux chiffres de contrôle, puis le corps.
    // Les quatre derniers caractères sont conservés — c'est ce que le client
    // voit lui-même sur son mandat, et ce qui permet de rapprocher l'incident.
    nom: "iban",
    motif: /\b([A-Z]{2}\d{2})[A-Z0-9]{6,26}([A-Z0-9]{4})\b/g,
    remplacement: (_m, tete: string, queue: string) => `${tete}[IBAN_MASQUE]${queue}`,
  },
  {
    // Numéro de carte : 13 à 19 chiffres, éventuellement groupés.
    nom: "carte",
    motif: /\b(?:\d[ -]?){12,18}\d\b/g,
    remplacement: (m: string) => {
      const chiffres = m.replace(/\D/g, "")
      return `[CARTE_MASQUEE]${chiffres.slice(-4)}`
    },
  },
  {
    // Le domaine est conservé : il distingue un incident interne d'un incident
    // client sans identifier la personne.
    nom: "courriel",
    motif: /\b[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g,
    remplacement: (_m, domaine: string) => `[COURRIEL_MASQUE]@${domaine}`,
  },
  {
    // Jetons portés par une URL : lien de connexion, réinitialisation,
    // confirmation. Ils sont utilisables tels quels par qui les lit.
    nom: "jeton-url",
    motif: /([?&](?:access_token|refresh_token|token|token_hash|code|secret|apikey|api_key)=)[^&\s"']+/gi,
    remplacement: (_m, cle: string) => `${cle}[MASQUE]`,
  },
]

/** Masque les motifs sensibles dans une chaîne et la borne en longueur. */
export function redactString(valeur: string, longueurMax = LONGUEUR_MAX): string {
  let sortie = valeur
  for (const { motif, remplacement } of MOTIFS) {
    sortie = sortie.replace(motif, remplacement as (...a: string[]) => string)
  }
  if (sortie.length > longueurMax) {
    sortie = `${sortie.slice(0, longueurMax)}… [tronqué, ${sortie.length} caractères]`
  }
  return sortie
}

function cleEstSensible(cle: string): boolean {
  const minuscule = cle.toLowerCase()
  return CLES_SENSIBLES.some((interdite) => minuscule.includes(interdite))
}

/**
 * Masque récursivement une valeur de contexte arbitraire.
 *
 * Borne la profondeur, le nombre de clés et la taille des tableaux : un
 * contexte d'erreur est parfois un objet de requête entier, et rien ne garantit
 * qu'il soit fini ni acyclique.
 */
export function redactValue(valeur: unknown, profondeur = 0, vus = new WeakSet<object>()): unknown {
  if (valeur === null || valeur === undefined) return valeur
  if (typeof valeur === "string") return redactString(valeur)
  if (typeof valeur === "number" || typeof valeur === "boolean") return valeur
  if (typeof valeur === "bigint") return valeur.toString()
  if (typeof valeur === "function") return "[fonction]"
  if (valeur instanceof Date) return valeur.toISOString()
  if (valeur instanceof Error) return redactError(valeur)

  if (profondeur >= PROFONDEUR_MAX) return "[profondeur maximale atteinte]"

  if (typeof valeur === "object") {
    // Une référence circulaire ferait tourner la rédaction indéfiniment.
    if (vus.has(valeur as object)) return "[référence circulaire]"
    vus.add(valeur as object)

    if (Array.isArray(valeur)) {
      const garde = valeur.slice(0, CLES_MAX).map((e) => redactValue(e, profondeur + 1, vus))
      if (valeur.length > CLES_MAX) garde.push(`[… ${valeur.length - CLES_MAX} éléments omis]`)
      return garde
    }

    const sortie: Record<string, unknown> = {}
    let n = 0
    for (const [cle, v] of Object.entries(valeur as Record<string, unknown>)) {
      if (n >= CLES_MAX) {
        sortie["…"] = "[clés supplémentaires omises]"
        break
      }
      sortie[cle] = cleEstSensible(cle) ? "[MASQUE]" : redactValue(v, profondeur + 1, vus)
      n++
    }
    return sortie
  }

  return String(valeur)
}

export interface ErreurRedigee {
  name: string
  message: string
  stack?: string
  cause?: unknown
}

/** Réduit une erreur — quelle que soit sa forme — à une charge sûre à stocker. */
export function redactError(erreur: unknown): ErreurRedigee {
  if (erreur instanceof Error) {
    return {
      name: erreur.name,
      message: redactString(erreur.message, 1000),
      // La pile est conservée : sans elle il n'y a pas de diagnostic possible.
      // Elle est masquée comme le reste, car un message d'erreur d'une couche
      // inférieure y est recopié tel quel.
      stack: erreur.stack ? redactString(erreur.stack) : undefined,
      cause: erreur.cause === undefined ? undefined : redactValue(erreur.cause, 1),
    }
  }
  if (typeof erreur === "string") {
    return { name: "Error", message: redactString(erreur, 1000) }
  }
  return { name: "Error", message: redactString(String(erreur), 1000) }
}
