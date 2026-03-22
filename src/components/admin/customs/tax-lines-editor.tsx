"use client"

import {
  useState,
  useEffect,
  useCallback,
  useTransition,
  type ReactNode,
} from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useServerAction } from "@/hooks/use-server-action"
import {
  addTaxLine,
  updateTaxLine,
  deleteTaxLine,
  getTaxTypes,
  type TaxType,
  type AddTaxLineInput,
  type UpdateTaxLineInput,
} from "@/app/actions/customs/manage-declaration"

export interface TaxLineDisplay {
  id: string
  tax_type_id: string
  tax_type_label: string
  tax_type_code: string
  base_amount_usd: number
  rate_percent: number | null
  final_amount_usd: number
  notes: string | null
}

interface TaxLinesEditorProps {
  declarationId: string
  initialLines: TaxLineDisplay[]
  totalTaxes: number
  isLocked: boolean
}

interface AddFormValues {
  tax_type_id: string
  base_amount_usd: string
  rate_percent: string
  final_amount_usd: string
  notes: string
}

function fmtUSD(amount: number): string {
  return (
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + " USD"
  )
}

function parseOptionalFloat(value: string): number | undefined {
  const n = parseFloat(value)
  return Number.isNaN(n) ? undefined : n
}

export function TaxLinesEditor({
  declarationId,
  initialLines,
  totalTaxes,
  isLocked,
}: TaxLinesEditorProps) {
  const router = useRouter()

  const [taxTypes, setTaxTypes] = useState<TaxType[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<TaxLineDisplay | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TaxLineDisplay | null>(null)

  const [isLoadingTypes, startLoadTypes] = useTransition()

  useEffect(() => {
    startLoadTypes(() => {
      void (async () => {
        const result = await getTaxTypes()
        if (result.success) {
          setTaxTypes(result.data)
        } else {
          setLoadError(result.error ?? "Impossible de charger les types de taxes.")
        }
      })()
    })
  }, [])

  const addAction = useServerAction(addTaxLine)
  const updateAction = useServerAction(updateTaxLine)
  const deleteAction = useServerAction(deleteTaxLine)

  const addForm = useForm<AddFormValues>({
    defaultValues: {
      tax_type_id: "",
      base_amount_usd: "",
      rate_percent: "",
      final_amount_usd: "",
      notes: "",
    },
  })

  useEffect(() => {
    if (addAction.isSuccess) {
      addAction.reset()
      addForm.reset({
        tax_type_id: "",
        base_amount_usd: "",
        rate_percent: "",
        final_amount_usd: "",
        notes: "",
      })
      router.refresh()
    }
  }, [addAction.isSuccess, addAction, addForm, router])

  useEffect(() => {
    if (updateAction.isSuccess) {
      updateAction.reset()
      setEditTarget(null)
      router.refresh()
    }
  }, [updateAction.isSuccess, updateAction, router])

  useEffect(() => {
    if (deleteAction.isSuccess) {
      deleteAction.reset()
      setDeleteTarget(null)
      router.refresh()
    }
  }, [deleteAction.isSuccess, deleteAction, router])

  const handleAddSubmit = useCallback(
    async (values: AddFormValues) => {
      const base = parseFloat(values.base_amount_usd)
      if (Number.isNaN(base) || base < 0 || !values.tax_type_id) return

      const input: AddTaxLineInput = {
        declaration_id: declarationId,
        tax_type_id: values.tax_type_id,
        base_amount_usd: base,
        rate_percent: parseOptionalFloat(values.rate_percent),
        final_amount_usd: parseOptionalFloat(values.final_amount_usd),
        notes: values.notes.trim() || undefined,
      }
      await addAction.execute(input)
    },
    [declarationId, addAction]
  )

  const editForm = useForm<AddFormValues>({
    defaultValues: {
      tax_type_id: "",
      base_amount_usd: "",
      rate_percent: "",
      final_amount_usd: "",
      notes: "",
    },
  })

  useEffect(() => {
    if (editTarget) {
      editForm.reset({
        tax_type_id: editTarget.tax_type_id,
        base_amount_usd: editTarget.base_amount_usd.toString(),
        rate_percent: editTarget.rate_percent?.toString() ?? "",
        final_amount_usd: editTarget.final_amount_usd.toString(),
        notes: editTarget.notes ?? "",
      })
    }
  }, [editTarget, editForm])

  const handleEditSubmit = useCallback(
    async (values: AddFormValues) => {
      if (!editTarget) return

      const input: UpdateTaxLineInput = {
        tax_line_id: editTarget.id,
        base_amount_usd: parseOptionalFloat(values.base_amount_usd),
        rate_percent: values.rate_percent.trim()
          ? parseOptionalFloat(values.rate_percent)
          : null,
        final_amount_usd: parseOptionalFloat(values.final_amount_usd),
        notes: values.notes.trim() || null,
      }
      await updateAction.execute(input)
    },
    [editTarget, updateAction]
  )

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    await deleteAction.execute(deleteTarget.id)
  }, [deleteTarget, deleteAction])

  if (loadError) {
    return (
      <p className="text-sm text-red-400" role="alert">
        {loadError}
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <CardSection title="Lignes fiscales">
        <Table aria-label="Lignes fiscales de la déclaration douanière">
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/80">Taxe</TableHead>
              <TableHead className="text-white/80">Base (USD)</TableHead>
              <TableHead className="text-white/80">Taux (%)</TableHead>
              <TableHead className="text-white/80">Montant final (USD)</TableHead>
              {!isLocked && (
                <TableHead className="text-white/80">
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {initialLines.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isLocked ? 4 : 5}
                  className="text-white/60"
                >
                  <p>Aucune ligne fiscale pour l&apos;instant.</p>
                </TableCell>
              </TableRow>
            ) : (
              initialLines.map((line) => (
                <TableRow key={line.id} className="border-white/10">
                  <TableCell className="text-white/90">
                    <div className="flex flex-col gap-1">
                      <span>{line.tax_type_label}</span>
                      <Badge variant="outline" className="w-fit">
                        {line.tax_type_code}
                      </Badge>
                    </div>
                    {line.notes && (
                      <p className="text-xs text-white/50 mt-1">{line.notes}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-white/90">
                    <span className="tabular-nums">{fmtUSD(line.base_amount_usd)}</span>
                  </TableCell>
                  <TableCell className="text-white/90">
                    {line.rate_percent != null ? `${line.rate_percent} %` : "—"}
                  </TableCell>
                  <TableCell className="text-white/90">
                    <span className="tabular-nums">{fmtUSD(line.final_amount_usd)}</span>
                  </TableCell>
                  {!isLocked && (
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-white"
                          onClick={() => setEditTarget(line)}
                          aria-label={`Modifier la ligne ${line.tax_type_code}`}
                        >
                          Modifier
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-400"
                          onClick={() => setDeleteTarget(line)}
                          aria-label={`Supprimer la ligne ${line.tax_type_code}`}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>

          <TableFooter>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableCell
                colSpan={isLocked ? 3 : 4}
                className="text-white font-medium"
              >
                Total taxes
              </TableCell>
              <TableCell className="text-white font-medium">
                <span className="tabular-nums">{fmtUSD(totalTaxes)}</span>
              </TableCell>
              {!isLocked && <TableCell />}
            </TableRow>
          </TableFooter>
        </Table>
      </CardSection>

      {!isLocked && (
        <>
          <Separator className="bg-white/10" />
          <section aria-label="Ajouter une ligne fiscale" className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Ajouter une ligne</h3>

            {isLoadingTypes && (
              <p className="text-sm text-white/50" role="status">
                Chargement des types de taxes…
              </p>
            )}

            <form
              onSubmit={addForm.handleSubmit(handleAddSubmit)}
              noValidate
              className="space-y-4 text-white/90"
            >
              <div>
                <Label htmlFor="add-tax-type" className="text-white/70">
                  Type de taxe
                </Label>
                <Select
                  value={addForm.watch("tax_type_id") || undefined}
                  onValueChange={(v) => addForm.setValue("tax_type_id", v)}
                  disabled={isLoadingTypes || addAction.isPending}
                >
                  <SelectTrigger
                    id="add-tax-type"
                    className="bg-white/5 border-white/20"
                  >
                    <SelectValue placeholder="Sélectionner…" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.code} — {t.label}
                        {t.default_rate_percent != null &&
                          ` (${t.default_rate_percent} %)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="add-base" className="text-white/70">
                  Base (USD)
                </Label>
                <Input
                  id="add-base"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex : 15000.00"
                  disabled={addAction.isPending}
                  className="bg-white/5 border-white/20"
                  {...addForm.register("base_amount_usd", {
                    required: "Obligatoire.",
                  })}
                />
              </div>

              <div>
                <Label htmlFor="add-rate" className="text-white/70">
                  Taux (%)
                </Label>
                <Input
                  id="add-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Ex : 5"
                  disabled={addAction.isPending}
                  className="bg-white/5 border-white/20"
                  {...addForm.register("rate_percent")}
                />
              </div>

              <div>
                <Label htmlFor="add-final" className="text-white/70">
                  Montant final (USD){" "}
                  <span className="text-white/50 font-normal">
                    — calculé auto si vide
                  </span>
                </Label>
                <Input
                  id="add-final"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Optionnel"
                  disabled={addAction.isPending}
                  className="bg-white/5 border-white/20"
                  {...addForm.register("final_amount_usd")}
                />
              </div>

              <div>
                <Label htmlFor="add-notes" className="text-white/70">
                  Notes
                </Label>
                <Input
                  id="add-notes"
                  placeholder="Optionnel"
                  disabled={addAction.isPending}
                  className="bg-white/5 border-white/20"
                  {...addForm.register("notes")}
                />
              </div>

              {addAction.error && (
                <p className="text-sm text-red-400" role="alert" aria-live="assertive">
                  {addAction.error}
                </p>
              )}

              <Button
                type="submit"
                disabled={addAction.isPending || isLoadingTypes}
                aria-busy={addAction.isPending}
              >
                {addAction.isPending ? "Ajout…" : "Ajouter la ligne"}
              </Button>
            </form>
          </section>
        </>
      )}

      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null)
            updateAction.reset()
          }
        }}
      >
        <DialogContent className="border-white/10 bg-[#0a1218] text-white">
          <DialogHeader>
            <DialogTitle>Modifier la ligne fiscale</DialogTitle>
            <DialogDescription className="text-white/60">
              {editTarget?.tax_type_label} — {editTarget?.tax_type_code}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={editForm.handleSubmit(handleEditSubmit)}
            noValidate
            className="space-y-4"
          >
            <div>
              <Label htmlFor="edit-base">Base (USD)</Label>
              <Input
                id="edit-base"
                type="number"
                min="0"
                step="0.01"
                disabled={updateAction.isPending}
                className="bg-white/5 border-white/20"
                {...editForm.register("base_amount_usd")}
              />
            </div>

            <div>
              <Label htmlFor="edit-rate">Taux (%)</Label>
              <Input
                id="edit-rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                disabled={updateAction.isPending}
                className="bg-white/5 border-white/20"
                {...editForm.register("rate_percent")}
              />
            </div>

            <div>
              <Label htmlFor="edit-final">Montant final (USD)</Label>
              <Input
                id="edit-final"
                type="number"
                min="0"
                step="0.01"
                disabled={updateAction.isPending}
                className="bg-white/5 border-white/20"
                {...editForm.register("final_amount_usd")}
              />
            </div>

            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                rows={2}
                disabled={updateAction.isPending}
                className="bg-white/5 border-white/20"
                {...editForm.register("notes")}
              />
            </div>

            {updateAction.error && (
              <p className="text-sm text-red-400" role="alert">
                {updateAction.error}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditTarget(null)
                  updateAction.reset()
                }}
                disabled={updateAction.isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={updateAction.isPending}
                aria-busy={updateAction.isPending}
              >
                {updateAction.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
            deleteAction.reset()
          }
        }}
      >
        <DialogContent className="border-white/10 bg-[#0a1218] text-white">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription className="text-white/60">
              Supprimer la ligne{" "}
              <strong>{deleteTarget?.tax_type_code}</strong>{" "}
              ({deleteTarget && fmtUSD(deleteTarget.final_amount_usd)}) ? Cette
              action est irréversible.
            </DialogDescription>
          </DialogHeader>

          {deleteAction.error && (
            <p className="text-sm text-red-400" role="alert">
              {deleteAction.error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteTarget(null)
                deleteAction.reset()
              }}
              disabled={deleteAction.isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDeleteConfirm()}
              disabled={deleteAction.isPending}
              aria-busy={deleteAction.isPending}
            >
              {deleteAction.isPending ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CardSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      {children}
    </div>
  )
}
