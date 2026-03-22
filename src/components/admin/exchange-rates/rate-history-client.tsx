"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { RateHistoryTable } from "./rate-history-table"
import type { ExchangeRateRow } from "@/app/actions/exchange-rates"
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"

type Props = {
  initialRows: ExchangeRateRow[]
  initialTotal: number
  pageSize: number
  initialPage: number
}

export function RateHistoryClient({
  initialRows,
  initialTotal,
  pageSize,
  initialPage,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const totalPages = Math.max(1, Math.ceil(initialTotal / pageSize))

  function goPage(p: number) {
    const next = Math.min(Math.max(1, p), totalPages)
    startTransition(() => {
      router.push(`/admin/exchange-rates?page=${next}`)
    })
  }

  function refresh() {
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={pending}
          className="border-white/10 text-white/70 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${pending ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>
      <RateHistoryTable rows={initialRows} />
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={initialPage <= 1 || pending}
            onClick={() => goPage(initialPage - 1)}
            className="text-white/70"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-mono text-white/50">
            {initialPage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={initialPage >= totalPages || pending}
            onClick={() => goPage(initialPage + 1)}
            className="text-white/70"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
