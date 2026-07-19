/**
 * Validation mathématique MOD-97 (ISO 7064)
 * Vérifie la structure de l'IBAN avant de l'envoyer à Stripe
 */

export function validateIBAN(iban: string): {
  valid: boolean
  error?: string
  lastFour?: string
  countryCode?: string
} {
  try {
    // Nettoyer et mettre en majuscules
    const clean = iban.replace(/\s/g, '').toUpperCase()

    // Vérifier les longueurs
    if (clean.length < 15 || clean.length > 34) {
      return {
        valid: false,
        error: `IBAN length invalid: ${clean.length} (expected 15-34)`
      }
    }

    // Vérifier que cela commence par 2 lettres
    if (!/^[A-Z]{2}/.test(clean)) {
      return {
        valid: false,
        error: 'IBAN must start with 2 country letters'
      }
    }

    const countryCode = clean.substring(0, 2)
    const checkDigits = clean.substring(2, 4)
    const lastFour = clean.substring(clean.length - 4)

    // Vérifier que les check digits sont numériques
    if (!/^\d{2}$/.test(checkDigits)) {
      return {
        valid: false,
        error: 'IBAN check digits must be numeric'
      }
    }

    // Réorganisation: déplacer les 4 premiers caractères à la fin
    const rearranged = clean.slice(4) + clean.slice(0, 4)

    // Convertir les lettres en chiffres (A=10, B=11, ..., Z=35)
    const numeric = rearranged
      .split('')
      .map((char) => {
        const code = char.charCodeAt(0)
        if (code >= 65 && code <= 90) {
          return (code - 55).toString()
        }
        return char
      })
      .join('')

    // Vérification MOD 97 (BigInt obligatoire)
    const remainder = BigInt(numeric) % BigInt(97)
    const isValid = remainder === BigInt(1)

    if (!isValid) {
      return {
        valid: false,
        error: 'IBAN checksum validation failed (MOD-97)'
      }
    }

    return {
      valid: true,
      lastFour,
      countryCode
    }
  } catch (error) {
    return {
      valid: false,
      error: `IBAN validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Valide le format BIC (SWIFT code) - format simplifié
 * Format: 4 lettres + 2 lettres (pays) + 2 caractères alphanumériques
 */
export function validateBIC(bic: string): boolean {
  const clean = bic.replace(/\s/g, '').toUpperCase()
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(clean)
}

/**
 * Extrait le code pays de l'IBAN
 */
export function getCountryFromIBAN(iban: string): string {
  const clean = iban.replace(/\s/g, '').toUpperCase()
  return clean.substring(0, 2)
}

/**
 * Masque l'IBAN pour l'affichage (garde seulement les 4 derniers caractères)
 */
export function maskIBAN(iban: string): string {
  const clean = iban.replace(/\s/g, '').toUpperCase()
  const lastFour = clean.substring(clean.length - 4)
  return `••••••••${lastFour}`
}
