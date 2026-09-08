"use client"

import { useEffect } from "react"
import { signalerIncidentClient } from "@/lib/monitoring/client"

/**
 * Frontière d'erreur de l'application.
 *
 * Elle n'affichait qu'un « 500 — une erreur inattendue s'est produite », ce qui
 * masque entièrement la cause : ni le message, ni la pile, ni la trace serveur.
 * Diagnostiquer une panne revenait à deviner page par page.
 *
 * En développement, le message et la pile sont désormais affichés à l'écran.
 * En production, ils restent masqués — ils peuvent contenir des détails
 * internes — mais l'identifiant technique (digest) est montré, car c'est lui
 * qui permet de retrouver l'incident dans les journaux du serveur.
 *
 * Dans les deux cas l'erreur part dans la console et remonte à la supervision :
 * une erreur de rendu ne laisse aucune trace côté serveur, et c'est justement
 * cette classe de pannes — un script bloqué, une réponse inattendue — qui
 * passait entièrement inaperçue.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const enDeveloppement = process.env.NODE_ENV === "development"

  useEffect(() => {
    console.error("Frontière d'erreur :", error)
    signalerIncidentClient({
      name: error.name,
      message: error.message || String(error),
      stack: error.stack,
      digest: error.digest,
    })
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl space-y-6 text-center">
        <div className="text-8xl font-bold text-destructive/20">500</div>
        <h1 className="text-2xl font-bold">Erreur serveur</h1>
        <p className="text-muted-foreground text-sm">
          Une erreur inattendue s&apos;est produite. Veuillez réessayer.
        </p>

        {enDeveloppement && (
          <div className="text-start rounded-xl border border-destructive-border bg-destructive-subtle p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
              Détail — visible en développement uniquement
            </p>
            <p className="font-mono text-sm text-foreground break-words">
              {error.message || String(error)}
            </p>
            {error.stack && (
              <pre className="max-h-64 overflow-auto rounded-lg bg-background/60 p-3 text-start font-mono text-[11px] leading-relaxed text-muted-foreground">
                {error.stack}
              </pre>
            )}
          </div>
        )}

        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground">
            Identifiant de l&apos;incident : {error.digest}
          </p>
        )}

        <button
          onClick={reset}
          className="inline-flex items-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
