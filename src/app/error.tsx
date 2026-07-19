"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="text-8xl font-bold text-destructive/20">500</div>
        <h1 className="text-2xl font-bold">Erreur serveur</h1>
        <p className="text-muted-foreground text-sm">
          Une erreur inattendue s&apos;est produite. Veuillez réessayer.
        </p>
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
