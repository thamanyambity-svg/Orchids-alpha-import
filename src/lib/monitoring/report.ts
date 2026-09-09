import crypto from "crypto"
import { redactError, redactValue } from "./redact"

/**
 * Enregistrement d'un incident.
 *
 * Trois règles gouvernent ce module, dans cet ordre.
 *
 * 1. Il ne lève jamais. Une supervision qui échoue doit rester invisible pour
 *    la requête qu'elle observe : sinon elle transforme une erreur récupérable
 *    en panne, et l'incident qu'elle devait signaler disparaît sous le sien.
 *
 * 2. Il ne se rapporte jamais lui-même. Un échec d'écriture qui déclencherait
 *    un nouveau rapport bouclerait indéfiniment. En dernier recours, il n'y a
 *    que la console.
 *
 * 3. Rien n'est écrit sans être passé par la rédaction. Voir ./redact.ts.
 */

export type NiveauIncident = "warning" | "error" | "fatal"
export type SourceIncident = "server" | "api" | "client" | "edge" | "job"

export interface ContexteIncident {
  source?: SourceIncident
  level?: NiveauIncident
  route?: string
  method?: string
  status?: number
  digest?: string
  actorId?: string | null
  extra?: Record<string, unknown>
}

/**
 * Réduit un message à sa forme stable pour le regroupement.
 *
 * Sans cette normalisation, « commande 3f2a… introuvable » et « commande
 * 91bc… introuvable » comptent pour deux incidents distincts : le même défaut
 * apparaît autant de fois qu'il y a d'identifiants, et le tableau de bord
 * devient illisible au lieu de montrer un problème unique et fréquent.
 */
export function normaliserMessage(message: string): string {
  return (
    message
      // Les fragments laissés par la rédaction — quatre derniers chiffres d'un
      // IBAN, domaine d'un courriel — servent à identifier une occurrence, pas
      // à distinguer un défaut. Les laisser dans l'empreinte scinderait un
      // incident unique en autant de clients touchés : constaté en production,
      // « FR76[IBAN_MASQUE]0189 » et « DE89[IBAN_MASQUE]3000 » comptaient pour
      // deux incidents distincts.
      .replace(/\b[A-Z]{2}\d{2}\[IBAN_MASQUE\][A-Z0-9]{4}/g, "<iban>")
      .replace(/\[CARTE_MASQUEE\]\d{0,4}/g, "<carte>")
      .replace(/\[COURRIEL_MASQUE\]@[^\s,;)\]]*/g, "<courriel>")
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
      .replace(/\b0x[0-9a-f]+\b/gi, "<hex>")
      // Sans frontière de mot : un nombre collé à son unité (« 3000ms ») doit
      // être normalisé comme un nombre isolé, sinon deux délais d'attente
      // différents comptent pour deux incidents distincts.
      .replace(/\d+/g, "<n>")
      .replace(/'[^']*'|"[^"]*"/g, "<str>")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300)
  )
}

/**
 * Empreinte de regroupement : type d'erreur, message normalisé, origine.
 *
 * La route est incluse parce qu'un même `TypeError` sur deux routes est
 * presque toujours deux défauts différents ; la pile ne l'est pas, parce
 * qu'elle change à chaque déploiement et scinderait un incident continu en
 * une série d'incidents neufs.
 */
export function empreinte(
  name: string,
  message: string,
  source: SourceIncident,
  route?: string
): string {
  const graine = [name, normaliserMessage(message), source, route ?? ""].join("|")
  return crypto.createHash("sha256").update(graine).digest("hex").slice(0, 32)
}

function versionDeployee(): string | undefined {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 12)
  )
}

function environnement(): string {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development"
}

/** Journalisation structurée : la seule sortie qui existe toujours. */
function versConsole(charge: Record<string, unknown>) {
  // Une ligne JSON par incident : exploitable par les journaux de l'hébergeur
  // sans dépendre d'aucun service.
  console.error(`[incident] ${JSON.stringify(charge)}`)
}

export interface ResultatRapport {
  enregistre: boolean
  fingerprint: string
  raison?: string
}

/**
 * Rapporte une erreur. Ne lève jamais, quel que soit l'état du système.
 */
export async function reportError(
  erreur: unknown,
  contexte: ContexteIncident = {}
): Promise<ResultatRapport> {
  let fingerprint = "inconnu"
  try {
    const redigee = redactError(erreur)
    const source = contexte.source ?? "server"
    const route = contexte.route ? contexte.route.slice(0, 200) : undefined
    fingerprint = empreinte(redigee.name, redigee.message, source, route)

    const charge = {
      fingerprint,
      level: contexte.level ?? "error",
      source,
      name: redigee.name.slice(0, 120),
      message: redigee.message,
      stack: redigee.stack ?? null,
      route: route ?? null,
      method: contexte.method?.slice(0, 10) ?? null,
      status: typeof contexte.status === "number" ? contexte.status : null,
      digest: contexte.digest?.slice(0, 120) ?? null,
      actorId: contexte.actorId ?? null,
      release: versionDeployee() ?? null,
      environment: environnement(),
      context: (redactValue({
        ...(contexte.extra ?? {}),
        ...(redigee.cause === undefined ? {} : { cause: redigee.cause }),
      }) ?? {}) as Record<string, unknown>,
    }

    versConsole(charge)

    // En développement, on s'arrête à la console : polluer la base de
    // production avec les erreurs d'un poste de travail rendrait le tableau
    // de bord inutilisable.
    if (charge.environment === "development") {
      return { enregistre: false, fingerprint, raison: "développement" }
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { enregistre: false, fingerprint, raison: "supabase non configuré" }
    }

    // Import différé : ce module est chargé par l'instrumentation, très tôt,
    // et ne doit pas tirer le client Supabase quand il n'y a rien à écrire.
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const admin = createAdminClient()

    const { error } = await admin.rpc("record_error_event", {
      p_fingerprint: charge.fingerprint,
      p_level: charge.level,
      p_source: charge.source,
      p_name: charge.name,
      p_message: charge.message,
      p_stack: charge.stack,
      p_route: charge.route,
      p_method: charge.method,
      p_status: charge.status,
      p_digest: charge.digest,
      p_actor_id: charge.actorId,
      p_release: charge.release,
      p_environment: charge.environment,
      p_context: charge.context,
    })

    if (error) {
      // Volontairement pas de reportError ici : ce serait une boucle.
      console.error(`[incident] écriture impossible : ${error.message}`)
      return { enregistre: false, fingerprint, raison: "écriture refusée" }
    }

    return { enregistre: true, fingerprint }
  } catch (echec) {
    // Dernier filet. Rien ne remonte à l'appelant.
    console.error("[incident] la supervision a elle-même échoué :", echec)
    return { enregistre: false, fingerprint, raison: "supervision en échec" }
  }
}
