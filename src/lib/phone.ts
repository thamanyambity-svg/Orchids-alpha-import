/** E.164 : '+', indicatif sans zéro initial, 8 à 15 chiffres au total. */
const E164 = /^\+[1-9][0-9]{7,14}$/

export function isE164(value: string): boolean {
  return E164.test(value)
}

/**
 * Ramène une saisie humaine à la forme canonique, ou null si elle ne porte pas
 * d'indicatif international.
 *
 * On ne devine jamais l'indicatif : un numéro national sans pays est ambigu, et
 * un mauvais indicatif enverrait les messages du partenaire à un inconnu.
 */
export function normalizeE164(input: string): string | null {
  if (!input) return null

  let value = input.trim().replace(/[\s().\-]/g, "")
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
