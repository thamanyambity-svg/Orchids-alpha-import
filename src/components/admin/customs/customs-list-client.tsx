"use client"

import { useState, useCallback, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  getCustomsFiles,
  type CustomsFileListItem,
  type GetCustomsFilesFilters,
} from "@/app/actions/customs/get-customs-file"
import { getCustomsUnreadCountsForFiles } from "@/app/actions/customs/messaging"
import type { CustomsFileStatus } from "@/lib/customs/types"
import { getStatusBadgeVariant, getStatusLabel } from "@/lib/customs/status-display"

const PAGE_SIZE = 20

const STATUS_OPTIONS: Array<{ value: CustomsFileStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Tous les statuts" },
  { value: "DRAFT", label: "Brouillon" },
  { value: "PRE_ADVICE", label: "Pré-alerte" },
  { value: "IN_CUSTOMS", label: "En douane" },
  { value: "LIQUIDATED", label: "Liquidé" },
  { value: "PAID", label: "Payé" },
  { value: "RELEASED", label: "Libéré" },
  { value: "BLOCKED", label: "Bloqué" },
]

const TRANSPORT_OPTIONS = [
  { value: "ALL", label: "Tous les modes" },
  { value: "AIR", label: "Aérien" },
  { value: "SEA", label: "Maritime" },
  { value: "LAND", label: "Terrestre" },
]

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso))
}

function getTransportLabel(mode: string | null): string {
  const map: Record<string, string> = {
    AIR: "✈ Aérien",
    SEA: "🚢 Maritime",
    LAND: "🚛 Terrestre",
  }
  return mode ? (map[mode] ?? mode) : "—"
}

interface CustomsListClientProps {
  initialFiles: CustomsFileListItem[]
  initialTotal: number
  initialTotalPages: number
  /** Base URL pour le détail (ex. /admin/customs ou /partner/customs) */
  detailBasePath?: string
}

export function CustomsListClient({
  initialFiles,
  initialTotal,
  initialTotalPages,
  detailBasePath = "/admin/customs",
}: CustomsListClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [files, setFiles] = useState(initialFiles)
  const [total, setTotal] = useState(initialTotal)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [currentPage, setCurrentPage] = useState(1)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [filters, setFilters] = useState<GetCustomsFilesFilters>({
    status: "ALL",
    transport_mode: "ALL",
  })
  const [unreadByFile, setUnreadByFile] = useState<Record<string, number>>({})

  useEffect(() => {
    const ids = files.map((f) => f.id)
    if (ids.length === 0) {
      setUnreadByFile({})
      return
    }
    let cancelled = false
    void getCustomsUnreadCountsForFiles(ids).then((res) => {
      if (cancelled) return
      if (res.success) setUnreadByFile(res.data ?? {})
    })
    return () => {
      cancelled = true
    }
  }, [files])

  const fetchFiles = useCallback(
    (newFilters: GetCustomsFilesFilters, page: number) => {
      setFetchError(null)
      startTransition(() => {
        void (async () => {
          const result = await getCustomsFiles(newFilters, page, PAGE_SIZE)
          if (result.success) {
            setFiles(result.data.files)
            setTotal(result.data.total)
            setTotalPages(result.data.totalPages)
            setCurrentPage(page)
          } else {
            setFetchError(result.error ?? "Impossible de charger les dossiers.")
          }
        })()
      })
    },
    []
  )

  const handleFilterChange = useCallback(
    (key: keyof GetCustomsFilesFilters, value: string) => {
      const newFilters = { ...filters, [key]: value }
      setFilters(newFilters)
      fetchFiles(newFilters, 1)
    },
    [filters, fetchFiles]
  )

  const hasPrevious = currentPage > 1
  const hasNext = currentPage < totalPages
  const startItem = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const endItem = Math.min(currentPage * PAGE_SIZE, total)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-wrap gap-4">
          <Select
            value={filters.status ?? "ALL"}
            onValueChange={(v) => handleFilterChange("status", v)}
          >
            <SelectTrigger className="w-[200px]" aria-label="Filtrer par statut">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.transport_mode ?? "ALL"}
            onValueChange={(v) => handleFilterChange("transport_mode", v)}
          >
            <SelectTrigger className="w-[200px]" aria-label="Filtrer par mode de transport">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSPORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const reset = {
              status: "ALL" as const,
              transport_mode: "ALL" as const,
            }
            setFilters(reset)
            fetchFiles(reset, 1)
          }}
          disabled={isPending}
        >
          Réinitialiser
        </Button>
      </div>

      <Separator />

      <p className="text-sm text-muted-foreground" aria-live="polite" role="status">
        {isPending
          ? "Chargement…"
          : total === 0
            ? "Aucun dossier correspondant."
            : `${startItem}–${endItem} sur ${total} dossiers`}
      </p>

      {fetchError && (
        <p className="text-sm text-destructive" role="alert" aria-live="assertive">
          {fetchError}
        </p>
      )}

      <div aria-busy={isPending}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Transport</TableHead>
              <TableHead>Réf. transport</TableHead>
              <TableHead>Partenaire</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Mis à jour</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.length === 0 && !isPending ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  <p role="status">Aucun dossier à afficher.</p>
                </TableCell>
              </TableRow>
            ) : (
              files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <code className="text-xs font-mono" title={file.order_id}>
                      {file.order_id.slice(0, 8).toUpperCase()}
                    </code>
                  </TableCell>
                  <TableCell>{getTransportLabel(file.transport_mode)}</TableCell>
                  <TableCell>{file.transport_ref ?? "—"}</TableCell>
                  <TableCell>{file.assigned_partner_name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(file.status)}>
                      {getStatusLabel(file.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white/80">
                    <time dateTime={file.updated_at}>{formatDate(file.updated_at)}</time>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-white/20 text-white hover:bg-white/10"
                        onClick={() => router.push(`${detailBasePath}/${file.id}`)}
                      >
                        Voir le dossier
                      </Button>
                      {(unreadByFile[file.id] ?? 0) > 0 && (
                        <Badge
                          variant="destructive"
                          className="tabular-nums"
                          aria-label={`${unreadByFile[file.id]} message(s) non lu(s)`}
                        >
                          {unreadByFile[file.id]}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <nav
          className="flex items-center gap-4"
          aria-label="Pagination des dossiers douaniers"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchFiles(filters, currentPage - 1)}
            disabled={!hasPrevious || isPending}
            aria-label="Page précédente"
          >
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground" aria-current="page" aria-live="polite">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchFiles(filters, currentPage + 1)}
            disabled={!hasNext || isPending}
            aria-label="Page suivante"
          >
            Suivant
          </Button>
        </nav>
      )}
    </div>
  )
}
