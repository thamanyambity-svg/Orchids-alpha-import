import type { Instrumentation } from "next"

/**
 * Point d'entrée d'instrumentation de Next.
 *
 * `onRequestError` est appelé par le framework pour toute erreur non rattrapée
 * survenue côté serveur : rendu d'une page, exécution d'une route d'API,
 * action de serveur. C'est le seul endroit qui les voit toutes, y compris
 * celles levées avant qu'un `try` applicatif ait pu s'exécuter.
 *
 * Le rapport est délibérément passif : il n'altère ni la réponse, ni le
 * comportement de Next. Il observe.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  erreur,
  requete,
  contexte
) => {
  const { reportError } = await import("@/lib/monitoring/report")

  await reportError(erreur, {
    // `routerKind` distingue le rendu d'une page d'un appel d'API : les deux
    // ne se diagnostiquent pas de la même façon.
    source: contexte.routeType === "route" ? "api" : "server",
    level: "error",
    route: requete.path,
    method: requete.method,
    extra: {
      routerKind: contexte.routerKind,
      routePath: contexte.routePath,
      routeType: contexte.routeType,
      renderSource: contexte.renderSource,
      // `revalidateReason` dit si l'erreur vient d'une requête réelle ou d'une
      // régénération en arrière-plan — la seconde n'a aucun utilisateur devant.
      revalidateReason: contexte.revalidateReason,
    },
  })
}

export async function register() {
  // Rien à initialiser : la supervision est sans état et n'écrit qu'au moment
  // d'un incident. Le point d'entrée est conservé car Next l'appelle au
  // démarrage de chaque runtime, et c'est ici que se brancherait un service
  // externe (Sentry ou équivalent) le jour où il y en aura un.
}
