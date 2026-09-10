/**
 * Pièces KYC telles que les pages les affichent.
 *
 * Elles sont stockées dans `buyer_profiles.kyc_documents` (JSON) par
 * /api/kyc/documents. Le fichier lui-même est privé : le lien passe par
 * /api/files, qui vérifie le droit de l'appelant à chaque ouverture. Les
 * entrées malformées sont ignorées plutôt que d'afficher un lien mort.
 */
export interface PieceKyc {
  id: string
  path: string
  type: string
  name: string
  created_at: string | null
  status: string
  file_url: string
}

export function lienFichier(bucket: string, chemin: string): string {
  return `/api/files/${bucket}?path=${encodeURIComponent(chemin)}`
}

export function piecesKyc(brut: unknown, statut?: string | null): PieceKyc[] {
  if (!Array.isArray(brut)) return []
  return brut
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object' && typeof (p as any).path === 'string' && (p as any).path.length > 0)
    .map((p) => ({
      id: p.path as string,
      path: p.path as string,
      type: typeof p.type === 'string' ? p.type : 'DOCUMENT',
      name: typeof p.name === 'string' && p.name ? p.name : 'Document',
      created_at: typeof p.uploaded_at === 'string' ? p.uploaded_at : null,
      status: statut || 'IN_PROGRESS',
      file_url: lienFichier('documents', p.path as string),
    }))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
}
