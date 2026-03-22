"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ExchangeRateRow } from "@/app/actions/exchange-rates"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

type Props = {
  rows: ExchangeRateRow[]
}

export function RateHistoryTable({ rows }: Props) {
  if (!rows.length) {
    return (
      <p className="text-sm text-white/40 py-8 text-center font-mono">
        Aucun taux en base — saisissez un premier enregistrement.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-white/10 hover:bg-transparent">
          <TableHead className="text-[#ffd700]/90">Date</TableHead>
          <TableHead className="text-[#ffd700]/90">Paire</TableHead>
          <TableHead className="text-[#ffd700]/90">Taux</TableHead>
          <TableHead className="text-[#ffd700]/90">Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id} className="border-white/5 text-white/80">
            <TableCell className="font-mono text-xs">
              {format(new Date(r.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
            </TableCell>
            <TableCell>
              {r.from_currency} → {r.to_currency}
            </TableCell>
            <TableCell className="font-mono">{Number(r.rate).toLocaleString("fr-FR")}</TableCell>
            <TableCell className="text-white/50 text-xs max-w-[200px] truncate">
              {r.notes ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
