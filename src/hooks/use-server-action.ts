'use client'

import { useCallback, useState, useTransition } from 'react'
import type { ServerActionResult } from '@/lib/server-actions/result'

type AsyncServerAction<TArgs extends unknown[], TData> = (
  ...args: TArgs
) => Promise<ServerActionResult<TData>>

/**
 * Centralise pending / erreur / succès pour les Server Actions (DRY).
 * Utilise useTransition pour des mises à jour UI non bloquantes.
 */
export function useServerAction<TArgs extends unknown[], TData>(
  action: AsyncServerAction<TArgs, TData>
) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TData | null>(null)

  const execute = useCallback(
    (...args: TArgs) => {
      setError(null)
      setData(null)
      startTransition(() => {
        void (async () => {
          const result = await action(...args)
          if (result.success) {
            setData(result.data)
          } else {
            setError(result.error)
          }
        })()
      })
    },
    [action]
  )

  const reset = useCallback(() => {
    setError(null)
    setData(null)
  }, [])

  const isSuccess = data !== null && error === null

  return {
    execute,
    isPending,
    error,
    data,
    reset,
    isSuccess,
  }
}
