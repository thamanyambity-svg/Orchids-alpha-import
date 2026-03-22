"use client"

import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
import type { PaymentProofAdminRow } from "@/app/actions/payment-proofs"
import { ProofReviewCard } from "./proof-review-card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

type Props = {
  initialPending: PaymentProofAdminRow[]
  initialReviewed: PaymentProofAdminRow[]
}

export function PaymentProofsClient({
  initialPending,
  initialReviewed,
}: Props) {
  const router = useRouter()
  const [pendingIds, setPendingIds] = useState<Set<string>>(
    () => new Set(initialPending.map((p) => p.id))
  )

  const pending = useMemo(
    () => initialPending.filter((p) => pendingIds.has(p.id)),
    [initialPending, pendingIds]
  )

  const onProcessed = useCallback(
    (id: string) => {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      router.refresh()
    },
    [router]
  )

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          À traiter
          {pending.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {pending.length}
            </Badge>
          )}
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-white/40 font-mono">Aucune preuve en attente.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pending.map((p) => (
              <ProofReviewCard
                key={p.id}
                proof={p}
                onProcessed={() => onProcessed(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">
          Dernières décisions
        </h2>
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[#ffd700]/80 text-xs uppercase">
                <th className="p-3">Date</th>
                <th className="p-3">Commande</th>
                <th className="p-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {initialReviewed.map((r) => (
                <tr key={r.id} className="border-b border-white/5 text-white/70">
                  <td className="p-3 font-mono text-xs">
                    {r.reviewed_at
                      ? format(new Date(r.reviewed_at), "dd/MM/yy HH:mm", { locale: fr })
                      : "—"}
                  </td>
                  <td className="p-3 font-mono">
                    {r.order_reference ?? r.order_id.slice(0, 8)}
                  </td>
                  <td className="p-3">
                    <Badge
                      className={
                        r.status === "ACCEPTED"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-red-500/20 text-red-300"
                      }
                    >
                      {r.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {initialReviewed.length === 0 && (
            <p className="p-6 text-center text-white/40 text-sm">Aucun historique.</p>
          )}
        </div>
      </section>
    </div>
  )
}
