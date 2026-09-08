"use client"

import { useEffect } from "react"

/**
 * Dernier filet : la frontière d'erreur de la racine.
 *
 * error.tsx ne couvre pas les exceptions levées dans le layout racine lui-même.
 * Sans ce fichier, une telle erreur laisse une page blanche, sans message ni
 * moyen de repartir — le pire des états pour un utilisateur.
 *
 * Il remplace tout le document, y compris <html> et <body>, et ne peut donc
 * s'appuyer sur aucun style de l'application : la mise en forme est écrite en
 * ligne, avec les couleurs de la marque en dur, puisque la feuille de styles
 * peut être précisément ce qui a échoué.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Erreur racine :", error)
  }, [error])

  const enDeveloppement = process.env.NODE_ENV === "development"

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          background: "#080e16",
          color: "#f0f2f4",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ maxWidth: 640, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 72, fontWeight: 700, color: "#321111" }}>500</p>
          <h1 style={{ margin: "8px 0 0", fontSize: 24, letterSpacing: ".02em" }}>
            L&apos;application n&apos;a pas pu démarrer
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 14, color: "#73808c", lineHeight: 1.6 }}>
            Une erreur est survenue avant le chargement de l&apos;interface. Réessayez ;
            si le problème persiste, communiquez l&apos;identifiant ci-dessous au support.
          </p>

          {enDeveloppement && (
            <pre
              style={{
                marginTop: 24,
                padding: 16,
                textAlign: "left",
                fontSize: 12,
                lineHeight: 1.6,
                color: "#f15f5f",
                background: "#321111",
                border: "1px solid #6b2424",
                borderRadius: 12,
                overflow: "auto",
                maxHeight: 260,
                whiteSpace: "pre-wrap",
              }}
            >
              {error.message}
              {error.stack ? "\n\n" + error.stack : ""}
            </pre>
          )}

          {error.digest && (
            <p style={{ marginTop: 16, fontSize: 12, color: "#73808c", fontFamily: "monospace" }}>
              Identifiant de l&apos;incident : {error.digest}
            </p>
          )}

          <button
            onClick={reset}
            style={{
              marginTop: 28,
              padding: "14px 28px",
              border: "none",
              borderRadius: 12,
              background: "#eeb32b",
              color: "#080e16",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
