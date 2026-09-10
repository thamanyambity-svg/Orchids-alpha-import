/**
 * Carte de contact d'un partenaire, telle qu'un acheteur peut la voir.
 *
 * Les règles d'accès interdisent à un acheteur de lire `partner_profiles` et le
 * profil d'un autre utilisateur — à juste titre : la fiche complète contient la
 * commission, la caution et l'adresse. Cette carte est le sous-ensemble destiné
 * au client, servi par une route serveur. Tout champ absent d'ici ne quitte pas
 * le serveur : c'est la liste blanche.
 */
export interface PartnerCard {
  /** Identifiant du COMPTE du partenaire (`profiles.id`) : destinataire des messages. */
  id: string
  /** Identifiant de la fiche `partner_profiles`. */
  partnerProfileId: string
  full_name: string
  company_name: string
  city: string | null
  country: { name: string; code: string } | null
  whatsapp: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
}

export const PARTNER_CARD_SELECT =
  "id, user_id, whatsapp_number, assigned_cities, country:countries(name, code), profile:profiles!user_id(full_name, company_name, email, phone, avatar_url, city)"

/** Une relation intégrée revient en objet ou en tableau selon le schéma. */
function premier<T>(valeur: T | T[] | null | undefined): T | null {
  if (Array.isArray(valeur)) return valeur[0] ?? null
  return valeur ?? null
}

export function toPartnerCard(row: any): PartnerCard | null {
  if (!row?.id || !row?.user_id) return null
  const profil: any = premier(row.profile) ?? {}
  const pays: any = premier(row.country)
  const villes: string[] = Array.isArray(row.assigned_cities) ? row.assigned_cities : []
  return {
    id: row.user_id,
    partnerProfileId: row.id,
    full_name: profil.full_name ?? "",
    company_name: profil.company_name ?? "",
    city: profil.city ?? villes[0] ?? null,
    country: pays?.code ? { name: pays.name ?? pays.code, code: pays.code } : null,
    whatsapp: row.whatsapp_number ?? null,
    email: profil.email ?? null,
    phone: profil.phone ?? null,
    avatar_url: profil.avatar_url ?? null,
  }
}

/** Lien WhatsApp à partir d'un numéro international. */
export function lienWhatsApp(numero: string | null | undefined): string | null {
  const chiffres = (numero ?? "").replace(/\D/g, "")
  return chiffres.length >= 8 ? `https://wa.me/${chiffres}` : null
}
