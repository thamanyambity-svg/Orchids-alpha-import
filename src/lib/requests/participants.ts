/**
 * Participants d'une demande : l'acheteur et le compte du partenaire affecté.
 * L'administration voit tout ; ce contrôle ne la concerne pas.
 *
 * Lu avec la clé de service : un partenaire ne peut pas lire la demande d'un
 * acheteur via les règles d'accès, mais la décision est prise ici.
 */
export interface Participants {
  buyerId: string
  partnerProfileId: string | null
  partnerUserId: string | null
}

export async function participantsDemande(admin: any, demandeId: string): Promise<Participants | null> {
  const { data: demande } = await admin
    .from('import_requests')
    .select('buyer_id, assigned_partner_id')
    .eq('id', demandeId)
    .maybeSingle()
  if (!demande) return null

  let partnerUserId: string | null = null
  if (demande.assigned_partner_id) {
    const { data: fiche } = await admin
      .from('partner_profiles')
      .select('user_id')
      .eq('id', demande.assigned_partner_id)
      .maybeSingle()
    partnerUserId = fiche?.user_id ?? null
  }

  return {
    buyerId: demande.buyer_id,
    partnerProfileId: demande.assigned_partner_id ?? null,
    partnerUserId,
  }
}

export function estParticipant(p: Participants | null, compte: string): boolean {
  if (!p) return false
  return p.buyerId === compte || (p.partnerUserId !== null && p.partnerUserId === compte)
}
