import { NextRequest, NextResponse } from 'next/server'
import { requireUser, handleApiError, ApiError } from '@/lib/auth-guard'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Accès aux fichiers des espaces de stockage privés.
 *
 * Les pièces d'identité, justificatifs de paiement, documents de commande,
 * factures et pièces légales des candidatures étaient enregistrés sous forme
 * de lien public : quiconque obtenait l'adresse pouvait les ouvrir, sans
 * compte. Ils sont désormais dans des espaces privés, et la base enregistre
 * une adresse de cette route — `/api/files/<espace>?path=<chemin>`.
 *
 * Chaque ouverture vérifie le droit de l'appelant, puis redirige vers un lien
 * signé de courte durée. Les pages existantes, qui ouvrent `file_url` dans un
 * nouvel onglet, fonctionnent sans modification.
 *
 * Qui voit quoi :
 * - administrateur : tout ;
 * - `documents/kyc/<compte>/…` : ce compte ;
 * - `documents/requests/<demande>/…` : l'acheteur de la demande et le
 *   partenaire qui lui est affecté ;
 * - `documents/payment-proofs/<commande>/…` et `invoices/<commande>/…` :
 *   l'acheteur de la commande ;
 * - `compliance-documents/…` : administrateur seulement.
 *
 * Les vérifications lisent avec la clé de service : un partenaire ne peut pas
 * lire la demande d'un acheteur via RLS, mais la décision, elle, est prise ici.
 */

const DUREE_LIEN_SECONDES = 120
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ESPACES = new Set(['documents', 'invoices', 'compliance-documents'])

/** Chemin relatif simple : pas de remontée, pas de chemin absolu, pas de caractère exotique. */
function cheminValide(chemin: string): boolean {
  return (
    chemin.length > 0 &&
    chemin.length <= 300 &&
    /^[A-Za-z0-9/_.-]+$/.test(chemin) &&
    !chemin.startsWith('/') &&
    !chemin.split('/').some((s) => s === '..' || s === '.' || s === '')
  )
}

function premier<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null
}

type Admin = ReturnType<typeof createAdminClient>

async function acheteurDeCommande(admin: Admin, commandeId: string): Promise<string | null> {
  const { data } = await admin
    .from('orders')
    .select('id, request:import_requests(buyer_id)')
    .eq('id', commandeId)
    .maybeSingle()
  return (premier((data as any)?.request) as any)?.buyer_id ?? null
}

async function peutVoirDemande(admin: Admin, demandeId: string, compte: string): Promise<boolean> {
  const { data: demande } = await admin
    .from('import_requests')
    .select('buyer_id, assigned_partner_id')
    .eq('id', demandeId)
    .maybeSingle()
  if (!demande) return false
  if (demande.buyer_id === compte) return true
  if (!demande.assigned_partner_id) return false
  const { data: fiche } = await admin
    .from('partner_profiles')
    .select('id')
    .eq('id', demande.assigned_partner_id)
    .eq('user_id', compte)
    .maybeSingle()
  return Boolean(fiche)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  try {
    const { user, role } = await requireUser()
    const { bucket } = await params
    if (!ESPACES.has(bucket)) throw new ApiError(404, 'Espace inconnu')

    const chemin = new URL(request.url).searchParams.get('path') ?? ''
    if (!cheminValide(chemin)) throw new ApiError(400, 'Chemin invalide')

    const admin = createAdminClient()
    const [racine, identifiant] = chemin.split('/')
    let autorise = role === 'ADMIN'

    if (!autorise && bucket === 'documents') {
      if (racine === 'kyc') {
        autorise = identifiant === user.id
      } else if (racine === 'requests' && UUID.test(identifiant ?? '')) {
        autorise = await peutVoirDemande(admin, identifiant, user.id)
      } else if (racine === 'payment-proofs' && UUID.test(identifiant ?? '')) {
        autorise = (await acheteurDeCommande(admin, identifiant)) === user.id
      }
    } else if (!autorise && bucket === 'invoices' && UUID.test(racine ?? '')) {
      autorise = (await acheteurDeCommande(admin, racine)) === user.id
    }
    // compliance-documents : administrateur seulement, rien à ajouter.

    // 404 et non 403 : la réponse ne doit pas confirmer qu'un fichier existe
    // à ce chemin pour quelqu'un qui n'a pas le droit de le voir.
    if (!autorise) throw new ApiError(404, 'Fichier introuvable')

    const { data, error } = await admin.storage.from(bucket).createSignedUrl(chemin, DUREE_LIEN_SECONDES)
    if (error || !data?.signedUrl) throw new ApiError(404, 'Fichier introuvable')

    return NextResponse.redirect(data.signedUrl, 302)
  } catch (error) {
    return handleApiError(error, { route: '/api/files/[bucket]', method: 'GET' })
  }
}
