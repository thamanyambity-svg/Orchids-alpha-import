import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { reportError } from '@/lib/monitoring/report'

/**
 * Remontée d'une erreur survenue dans le navigateur.
 *
 * Sans elle, la supervision ne voit que le serveur — et manque toute une
 * classe de pannes. Le défaut corrigé juste avant en est l'illustration : une
 * politique de sécurité de contenu bloquait le script Stripe, le formulaire de
 * mandat SEPA échouait, et rien côté serveur n'en portait la trace.
 *
 * La route est nécessairement ouverte : une erreur arrive souvent avant toute
 * authentification, et c'est celle-là qu'on veut voir. Trois précautions en
 * découlent.
 *
 * 1. Le corps est borné et validé. Ce que le navigateur envoie n'est pas
 *    digne de confiance : c'est une entrée publique comme une autre.
 * 2. Le contenu repasse par la rédaction côté serveur. Un client compromis, ou
 *    simplement une page qui recopie l'URL courante, enverrait sinon un jeton
 *    dans le message.
 * 3. Le débit est limité en amont par le middleware (20 par minute), pour
 *    qu'une page en boucle d'erreur ne puisse pas écrire sans fin.
 *
 * La réponse est toujours 202 quand la charge est recevable : le navigateur
 * n'a rien à faire de ce résultat, et lui répondre une erreur ajouterait une
 * erreur à l'erreur.
 */

const MESSAGE_MAX = 2000
const PILE_MAX = 8000

const incidentSchema = z.object({
  name: z.string().min(1).max(120).default('Error'),
  message: z.string().min(1).max(MESSAGE_MAX),
  stack: z.string().max(PILE_MAX).optional(),
  // Identifiant affiché à l'utilisateur sur la page 500 : c'est lui qui relie
  // son signalement à la ligne enregistrée.
  digest: z.string().max(120).optional(),
  route: z.string().max(200).optional(),
  fatal: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  let charge: unknown
  try {
    charge = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const parsed = incidentSchema.safeParse(charge)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Charge invalide' }, { status: 400 })
  }

  const { name, message, stack, digest, route, fatal } = parsed.data

  // Reconstruire une Error donne au rapport la même forme que côté serveur, et
  // fait passer message et pile par la même rédaction.
  const erreur = new Error(message)
  erreur.name = name
  erreur.stack = stack

  await reportError(erreur, {
    source: 'client',
    level: fatal ? 'fatal' : 'error',
    route,
    digest,
    extra: {
      // Utile pour reproduire : un défaut de rendu dépend souvent du moteur.
      userAgent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
    },
  })

  return NextResponse.json({ received: true }, { status: 202 })
}
