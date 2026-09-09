import { NextResponse } from 'next/server'
import { requireRole, handleApiError } from '@/lib/auth-guard'
import { redactString } from '@/lib/monitoring/redact'

/**
 * Contrôle d'état des services externes.
 *
 * Répond à une question qu'on ne pouvait pas trancher autrement : la clé
 * configurée en production est-elle encore valide ? Les valeurs sensibles sont
 * masquées par l'hébergeur — c'est voulu — donc on ne peut pas les comparer.
 * La seule preuve possible est de s'en servir.
 *
 * Chaque contrôle est en lecture seule et sans effet de bord. Aucune valeur de
 * secret n'est renvoyée : seulement « configuré », « valide » ou « invalide »,
 * et le motif quand il y en a un.
 *
 * Réservé aux administrateurs. La liste des services configurés dit à elle
 * seule beaucoup de l'infrastructure, et un message d'erreur de fournisseur
 * peut contenir un identifiant de compte.
 */

/** Au-delà, un service est considéré comme indisponible plutôt que lent. */
const DELAI_MAX_MS = 5000

type Etat = 'ok' | 'invalide' | 'absent' | 'injoignable'

interface Controle {
  service: string
  etat: Etat
  detail?: string
  /** Vrai si l'absence empêche une fonction essentielle de marcher. */
  critique: boolean
}

function avecDelai<T>(promesse: Promise<T>, ms = DELAI_MAX_MS): Promise<T> {
  return Promise.race([
    promesse,
    new Promise<T>((_, rejeter) =>
      setTimeout(() => rejeter(new Error(`délai dépassé (${ms} ms)`)), ms)
    ),
  ])
}

/**
 * Ne conserve d'un message d'erreur que sa première ligne, bornée et rédigée.
 *
 * La rédaction n'est pas une précaution de principe : Stripe recopie la clé
 * reçue dans son message d'authentification (« Invalid API Key provided:
 * sk_live_… »). Sans elle, le contrôle d'état publierait le secret qu'il est
 * censé vérifier — à un administrateur, certes, mais aussi dans les journaux
 * et dans la supervision.
 */
function motif(erreur: unknown): string {
  const brut = erreur instanceof Error ? erreur.message : String(erreur)
  return redactString(brut.split('\n')[0], 200)
}

async function controlerStripe(): Promise<Controle> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { service: 'stripe', etat: 'absent', critique: true }
  }
  try {
    const { stripe } = await import('@/lib/stripe')
    // Lecture du solde : sans effet, et refusée en 401 si la clé est révoquée.
    await avecDelai(stripe.balance.retrieve())
    return { service: 'stripe', etat: 'ok', critique: true }
  } catch (erreur) {
    const m = motif(erreur)
    // Une clé révoquée ou erronée se distingue d'une panne réseau : la première
    // demande une rotation, la seconde d'attendre.
    const cleRefusee = /invalid api key|expired|authentication|401/i.test(m)
    return {
      service: 'stripe',
      etat: cleRefusee ? 'invalide' : 'injoignable',
      detail: m,
      critique: true,
    }
  }
}

async function controlerSupabase(): Promise<Controle> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { service: 'supabase', etat: 'absent', critique: true }
  }
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    const { error } = await avecDelai(
      Promise.resolve(admin.from('profiles').select('id', { count: 'exact', head: true }))
    )
    if (error) {
      return { service: 'supabase', etat: 'invalide', detail: motif(error.message), critique: true }
    }
    return { service: 'supabase', etat: 'ok', critique: true }
  } catch (erreur) {
    return { service: 'supabase', etat: 'injoignable', detail: motif(erreur), critique: true }
  }
}

async function controlerResend(): Promise<Controle> {
  if (!process.env.RESEND_API_KEY) {
    return { service: 'resend', etat: 'absent', critique: false }
  }
  try {
    const res = await avecDelai(
      fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      })
    )
    if (res.status === 401 || res.status === 403) {
      return { service: 'resend', etat: 'invalide', detail: `HTTP ${res.status}`, critique: false }
    }
    return { service: 'resend', etat: 'ok', critique: false }
  } catch (erreur) {
    return { service: 'resend', etat: 'injoignable', detail: motif(erreur), critique: false }
  }
}

/**
 * Services dont on ne contrôle que la configuration : les interroger coûterait
 * de l'argent (OpenAI) ou n'a pas de point de lecture gratuit.
 */
function controlerPresence(): Controle[] {
  const declares: [string, string | undefined, boolean][] = [
    ['stripe_webhook', process.env.STRIPE_WEBHOOK_SECRET, true],
    ['openai', process.env.OPENAI_API_KEY, false],
    ['resend_webhook', process.env.RESEND_WEBHOOK_SECRET, false],
    ['n8n', process.env.N8N_WEBHOOK_SECRET, false],
    ['turnstile', process.env.TURNSTILE_SECRET_KEY, false],
    ['mapbox', process.env.NEXT_PUBLIC_MAPBOX_TOKEN, false],
  ]
  return declares.map(([service, valeur, critique]) => ({
    service,
    etat: valeur ? ('ok' as Etat) : ('absent' as Etat),
    critique,
  }))
}

export async function GET() {
  try {
    await requireRole(['ADMIN'])

    // En parallèle : un service lent ne doit pas retarder le diagnostic des
    // autres, c'est justement quand ça va mal qu'on consulte cette page.
    const [stripe, supabase, resend] = await Promise.all([
      controlerStripe(),
      controlerSupabase(),
      controlerResend(),
    ])

    const controles = [stripe, supabase, resend, ...controlerPresence()]
    const enPanne = controles.filter((c) => c.critique && c.etat !== 'ok')

    return NextResponse.json(
      {
        etat: enPanne.length === 0 ? 'ok' : 'degrade',
        version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
        environnement: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'inconnu',
        controles,
      },
      // 503 quand un service essentiel est en panne : un contrôle d'état qui
      // répond toujours 200 ne sert à rien pour une surveillance automatique.
      { status: enPanne.length === 0 ? 200 : 503 }
    )
  } catch (error) {
    return handleApiError(error, { route: '/api/admin/health', method: 'GET' })
  }
}
