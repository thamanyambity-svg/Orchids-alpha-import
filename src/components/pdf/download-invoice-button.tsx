/**
 * Bouton téléchargement PDF — GET /api/customs/invoice/[id]
 */

'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'

interface DownloadInvoiceButtonProps {
  invoiceId: string
  variant?: 'default' | 'outline' | 'secondary'
}

export function DownloadInvoiceButton({
  invoiceId,
  variant = 'outline',
}: DownloadInvoiceButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = useCallback(async () => {
    setError(null)
    setIsLoading(true)

    try {
      const url = `/api/customs/invoice/${invoiceId}`
      const res = await fetch(url, { method: 'GET' })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(
          (body as { error?: string }).error ?? 'Impossible de générer le PDF.'
        )
        return
      }

      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = `facture-${invoiceId.slice(0, 8).toUpperCase()}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(blobUrl)
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion et réessayez.')
    } finally {
      setIsLoading(false)
    }
  }, [invoiceId])

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={variant}
        onClick={handleDownload}
        disabled={isLoading}
        aria-busy={isLoading}
        aria-label="Télécharger la facture au format PDF"
      >
        {isLoading ? 'Génération en cours…' : 'Télécharger la facture PDF'}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert" aria-live="assertive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
