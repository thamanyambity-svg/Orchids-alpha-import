/**
 * Téléchargement du rapport douanier PDF (admin).
 */

'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'

interface DownloadReportButtonProps {
  fileId: string
  variant?: 'default' | 'outline' | 'secondary'
}

export function DownloadReportButton({
  fileId,
  variant = 'outline',
}: DownloadReportButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch(`/api/customs/report/${fileId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError((body as { error?: string }).error ?? 'Erreur génération PDF.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `rapport-douanier-${fileId.slice(0, 8).toUpperCase()}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setIsLoading(false)
    }
  }, [fileId])

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={variant}
        onClick={handleDownload}
        disabled={isLoading}
        aria-busy={isLoading}
        aria-label="Télécharger le rapport douanier PDF"
      >
        {isLoading ? 'Génération…' : 'Télécharger le rapport douanier PDF'}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert" aria-live="assertive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
