import { NextRequest, NextResponse } from 'next/server'
import { sendToN8N } from '@/lib/webhooks'
import { logAudit } from '@/lib/audit'
import { requireRole, handleApiError } from '@/lib/auth-guard'
import { logAdminAccess, getAdminAuditMetadata } from '@/lib/admin-audit'
import { checkRateLimit } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Statuts à partir desquels une (ré)assignation remet le dossier « en analyse ».
// Au-delà — devis accepté, paiement, exécution — le statut n'est pas touché.
const STATUTS_AVANT_ANALYSE = new Set(['PENDING', 'DRAFT', 'VALIDATED', 'ANALYSIS'])

export async function POST(request: NextRequest) {
  try {
    // Réservé aux ADMIN. Le client SSR (RLS) sert pour les écritures de données ;
    // les politiques admin (FOR ALL) autorisent ces opérations.
    const { supabase, user } = await requireRole(['ADMIN'])

    // Rate limit
    const rateCheck = checkRateLimit(`admin:${user.id}`, { maxRequests: 120, windowMs: 60000 })
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const body = await request.json()
    const { action, requestId, data: actionData } = body

    // Log admin access
    const meta = getAdminAuditMetadata(request)
    logAdminAccess({
      adminId: user.id,
      action: `ADMIN_${action}`,
      resource: 'import_requests',
      resourceId: requestId,
      details: { action, ...meta },
      ip: meta.ip,
      userAgent: meta.userAgent,
    }).catch(console.error)

    if (!requestId || !action) {
      return NextResponse.json({ error: 'Missing requestId or action' }, { status: 400 })
    }

    let result: any = null
    let n8nEvent = ''

    switch (action) {
      case 'ASSIGN_PARTNER': {
        // Écriture par la clé de service, après le contrôle ADMIN ci-dessus :
        // une écriture de session peut toucher zéro ligne sans erreur selon
        // les règles d'accès appliquées en base.
        const partnerId = actionData?.partnerId
        if (typeof partnerId !== 'string' || !UUID.test(partnerId)) {
          return NextResponse.json({ error: 'Partenaire invalide' }, { status: 400 })
        }
        const service = createAdminClient()

        const { data: fiche } = await service
          .from('partner_profiles')
          .select('id, user_id, contract_status')
          .eq('id', partnerId)
          .maybeSingle()
        if (!fiche) return NextResponse.json({ error: 'Partenaire introuvable' }, { status: 404 })
        if (fiche.contract_status !== 'ACTIVE') {
          return NextResponse.json({ error: 'Le contrat de ce partenaire n\'est pas actif' }, { status: 400 })
        }

        const { data: actuelle } = await service
          .from('import_requests')
          .select('id, status')
          .eq('id', requestId)
          .maybeSingle()
        if (!actuelle) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

        const { data, error } = await service
          .from('import_requests')
          .update({
            assigned_partner_id: partnerId,
            status: STATUTS_AVANT_ANALYSE.has(actuelle.status) ? 'ANALYSIS' : actuelle.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId)
          .select()
          .maybeSingle()

        if (error) throw error
        if (!data) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
        result = data
        n8nEvent = 'partner_assigned'

        // Le partenaire est prévenu dans son espace. Sans effet sur l'assignation en cas d'échec.
        await service
          .from('notifications')
          .insert({
            user_id: fiche.user_id,
            channel: 'status_change',
            type: 'info',
            title: 'Nouveau dossier confié',
            message: `La demande ${data.reference ?? ''} vous est confiée. Échangez avec le client dans la discussion du dossier.`,
            link: `/partner/requests/${requestId}`,
          })
          .then(() => undefined, () => undefined)

        await logAudit({
          actorId: user.id,
          action: 'ASSIGN_PARTNER',
          targetType: 'import_requests',
          targetId: requestId,
          details: { partnerId }
        })
        break
      }

      case 'VALIDATE': {
        // Désactivé : cette action créait une commande sur le seul budget
        // déclaré par le client, sans pro forma, et pouvait déclencher un
        // prélèvement SEPA de 60 %. Or aucun paiement ne doit précéder la
        // facture finale détaillée. La commande naît désormais de la pro forma
        // validée par Alpha Import puis acceptée par le client.
        return NextResponse.json(
          { error: 'Action remplacée : validez la pro forma du partenaire dans la fiche de la demande.' },
          { status: 409 }
        )
      }

      case 'REJECT': {
        const { data, error } = await supabase
          .from('import_requests')
          .update({
            status: 'REJECTED',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId)
          .select()
          .single()

        if (error) throw error
        result = data
        n8nEvent = 'request_rejected'

        await logAudit({
          actorId: user.id,
          action: 'REJECT_REQUEST',
          targetType: 'import_requests',
          targetId: requestId,
          details: { reason: actionData?.reason || 'No reason provided' }
        })
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Trigger n8n webhook
    if (n8nEvent) {
      await sendToN8N(n8nEvent, {
        requestId,
        action,
        timestamp: new Date().toISOString(),
        details: result
      })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
