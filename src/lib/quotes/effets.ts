/**
 * Effets de bord d'une étape de pro forma : notifications dans l'espace de
 * chacun et message dans la discussion du dossier. Aucun ne doit faire
 * échouer l'étape elle-même : chaque écriture absorbe son erreur.
 */

export type Espace = 'ADMIN' | 'PARTNER' | 'BUYER'

export function lienDossier(espace: Espace, demandeId: string): string {
  if (espace === 'ADMIN') return `/admin/requests/${demandeId}`
  if (espace === 'PARTNER') return `/partner/requests/${demandeId}`
  return `/dashboard/requests/${demandeId}`
}

export async function idsAdmins(admin: any): Promise<string[]> {
  const { data } = await admin.from('profiles').select('id').eq('role', 'ADMIN')
  return (data ?? []).map((p: { id: string }) => p.id)
}

export interface Destinataire {
  id: string | null | undefined
  espace: Espace
}

export async function notifier(
  admin: any,
  demandeId: string,
  destinataires: Destinataire[],
  contenu: { title: string; message: string; type?: 'info' | 'success' | 'warning' },
  exclure?: string
): Promise<void> {
  const vus = new Set<string>()
  const lignes = destinataires
    .filter((d): d is { id: string; espace: Espace } => !!d.id && d.id !== exclure)
    .filter((d) => (vus.has(d.id) ? false : (vus.add(d.id), true)))
    .map((d) => ({
      user_id: d.id,
      channel: 'status_change',
      type: contenu.type ?? 'info',
      title: contenu.title,
      message: contenu.message.slice(0, 500),
      link: lienDossier(d.espace, demandeId),
    }))
  if (lignes.length === 0) return
  await admin.from('notifications').insert(lignes).then(() => undefined, () => undefined)
}

/** Message dans la discussion du dossier, visible du client, du partenaire et de l'administration. */
export async function messageDossier(admin: any, demandeId: string, auteur: string, texte: string): Promise<void> {
  await admin
    .from('messages')
    .insert({ request_id: demandeId, sender_id: auteur, recipient_id: null, content: texte, attachments: [] })
    .then(() => undefined, () => undefined)
}
