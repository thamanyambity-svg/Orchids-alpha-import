"use client"

import { CheckCircle2, Circle } from "lucide-react"
import {
  DOCUMENT_TYPE_LABELS,
  expectedDocumentsForCountry,
  type ChecklistDocType,
} from "@/lib/status-labels"

interface DocRow {
  type: string
}

interface RequestDocumentChecklistProps {
  countryCode: string | null | undefined
  documents: DocRow[]
  title?: string
}

export function RequestDocumentChecklist({
  countryCode,
  documents,
  title = 'Documents recommandés (selon pays d’achat)',
}: RequestDocumentChecklistProps) {
  const expected = expectedDocumentsForCountry(countryCode)
  const present = new Set(
    documents.map((d) => String(d.type).toUpperCase())
  )

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <p className="text-sm font-semibold mb-3">{title}</p>
      <ul className="space-y-2">
        {expected.map((t: ChecklistDocType) => {
          const ok = present.has(t)
          return (
            <li key={t} className="flex items-center gap-2 text-sm">
              {ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span className={ok ? 'text-foreground' : 'text-muted-foreground'}>
                {DOCUMENT_TYPE_LABELS[t] ?? t}
              </span>
            </li>
          )
        })}
      </ul>
      {countryCode && (
        <p className="text-[10px] text-muted-foreground mt-3">
          Pays : {countryCode.toUpperCase()} — liste indicative, ajustable dans{' '}
          <code className="text-xs">src/lib/status-labels.ts</code>
        </p>
      )}
    </div>
  )
}
