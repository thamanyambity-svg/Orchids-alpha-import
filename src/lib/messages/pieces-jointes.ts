/**
 * Pièces jointes de la discussion d'une demande.
 *
 * Partagé entre le navigateur (qui dépose le fichier directement dans
 * l'espace privé `documents`, les fonctions serveur étant limitées à quelques
 * mégaoctets par requête) et la route qui enregistre le message (qui vérifie
 * chaque pièce avant de l'accepter).
 */

export type GenrePiece = 'image' | 'video' | 'audio' | 'document'

export interface PieceJointe {
  path: string
  name: string
  mime: string
  size: number
}

/** Limite de l'hébergement de fichiers (offre gratuite Supabase : 50 Mo). */
export const TAILLE_MAX_PIECE = 50 * 1024 * 1024
export const PIECES_MAX_PAR_MESSAGE = 10
export const LONGUEUR_MAX_MESSAGE = 4000

const TYPES: Record<string, { genre: GenrePiece; extension: string }> = {
  'image/jpeg': { genre: 'image', extension: 'jpg' },
  'image/png': { genre: 'image', extension: 'png' },
  'image/webp': { genre: 'image', extension: 'webp' },
  'image/gif': { genre: 'image', extension: 'gif' },
  'video/mp4': { genre: 'video', extension: 'mp4' },
  'video/quicktime': { genre: 'video', extension: 'mov' },
  'video/webm': { genre: 'video', extension: 'webm' },
  'audio/mpeg': { genre: 'audio', extension: 'mp3' },
  'audio/mp4': { genre: 'audio', extension: 'm4a' },
  'audio/x-m4a': { genre: 'audio', extension: 'm4a' },
  'audio/aac': { genre: 'audio', extension: 'aac' },
  'audio/webm': { genre: 'audio', extension: 'weba' },
  'audio/ogg': { genre: 'audio', extension: 'ogg' },
  'audio/wav': { genre: 'audio', extension: 'wav' },
  'application/pdf': { genre: 'document', extension: 'pdf' },
}

/** Valeur de l'attribut `accept` du sélecteur de fichiers. */
export const ACCEPT_PIECES = Object.keys(TYPES).join(',')

export function typeAccepte(mime: string): boolean {
  return Object.prototype.hasOwnProperty.call(TYPES, mime)
}

export function genrePiece(mime: string): GenrePiece {
  return TYPES[mime]?.genre ?? 'document'
}

export function extensionPour(mime: string): string {
  return TYPES[mime]?.extension ?? 'bin'
}

/** Dossier des pièces de la discussion : lisible par les seuls participants (/api/files). */
export function dossierDiscussion(demandeId: string): string {
  return `requests/${demandeId}/chat/`
}

const CHEMIN = /^[A-Za-z0-9/_.-]+$/

/**
 * Vérifie une pièce annoncée par le navigateur. Renvoie le motif du refus, ou
 * null si elle est acceptable. Le chemin doit être dans le dossier de
 * discussion de CETTE demande : sinon un fichier d'un autre dossier pourrait
 * être rattaché — et rendu lisible — ici.
 */
export function motifRefusPiece(piece: unknown, demandeId: string): string | null {
  if (!piece || typeof piece !== 'object') return 'Pièce invalide'
  const p = piece as Record<string, unknown>
  if (typeof p.path !== 'string' || typeof p.name !== 'string' || typeof p.mime !== 'string' || typeof p.size !== 'number') {
    return 'Pièce incomplète'
  }
  const segments = p.path.split('/')
  if (
    p.path.length > 300 ||
    !CHEMIN.test(p.path) ||
    !p.path.startsWith(dossierDiscussion(demandeId)) ||
    segments.some((s) => s === '' || s === '.' || s === '..')
  ) {
    return 'Chemin hors du dossier de la discussion'
  }
  if (!typeAccepte(p.mime)) return 'Format non accepté'
  if (!Number.isFinite(p.size) || p.size <= 0 || p.size > TAILLE_MAX_PIECE) return 'Fichier vide ou supérieur à 50 Mo'
  if (p.name.length === 0 || p.name.length > 200) return 'Nom de fichier invalide'
  return null
}
