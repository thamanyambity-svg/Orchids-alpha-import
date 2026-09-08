/**
 * Remontée d'une erreur depuis le navigateur.
 *
 * Appelé depuis les frontières d'erreur. Comme son homologue serveur, il ne
 * lève jamais : il s'exécute alors que l'application est déjà en train
 * d'échouer, et une exception ici masquerait l'erreur d'origine derrière la
 * sienne.
 */

export interface IncidentClient {
  name?: string
  message: string
  stack?: string
  digest?: string
  fatal?: boolean
}

export function signalerIncidentClient(incident: IncidentClient): void {
  try {
    if (typeof window === "undefined") return

    const charge = JSON.stringify({
      name: incident.name ?? "Error",
      message: incident.message.slice(0, 2000),
      stack: incident.stack?.slice(0, 8000),
      digest: incident.digest,
      // Le chemin seul, sans la chaîne de requête : elle transporte parfois un
      // jeton, et il n'a rien à faire dans un rapport d'incident.
      route: window.location.pathname.slice(0, 200),
      fatal: incident.fatal ?? false,
    })

    // `keepalive` laisse la requête partir même si la page est en train d'être
    // remplacée — c'est le cas fréquent d'une erreur fatale.
    void fetch("/api/monitoring/error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: charge,
      keepalive: true,
    }).catch(() => {
      // Silence volontaire : l'utilisateur voit déjà une page d'erreur, lui en
      // ajouter une seconde n'apporte rien.
    })
  } catch {
    // Idem.
  }
}
