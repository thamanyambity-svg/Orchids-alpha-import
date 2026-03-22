"use client"

import { useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { useServerAction } from "@/hooks/use-server-action"
import {
  upsertDeclaration,
  type UpsertDeclarationInput,
} from "@/app/actions/customs/manage-declaration"

interface DeclarationFormValues {
  declared_value_usd: string
  declaration_number: string
  notes: string
}

interface DeclarationFormProps {
  customsFileId: string
  existingDeclaration: {
    id: string
    declared_value_usd: number
    declaration_number: string | null
    notes: string | null
    is_fiscal_validated: boolean
  } | null
}

export function DeclarationForm({
  customsFileId,
  existingDeclaration,
}: DeclarationFormProps) {
  const router = useRouter()
  const isLocked = existingDeclaration?.is_fiscal_validated ?? false

  const { execute, isPending, error, isSuccess, reset } =
    useServerAction(upsertDeclaration)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<DeclarationFormValues>({
    defaultValues: {
      declared_value_usd:
        existingDeclaration?.declared_value_usd.toString() ?? "",
      declaration_number: existingDeclaration?.declaration_number ?? "",
      notes: existingDeclaration?.notes ?? "",
    },
  })

  useEffect(() => {
    if (isSuccess) {
      reset()
      router.refresh()
    }
  }, [isSuccess, reset, router])

  const onSubmit = useCallback(
    async (values: DeclarationFormValues) => {
      const parsed = parseFloat(values.declared_value_usd)
      if (Number.isNaN(parsed) || parsed < 0) return

      const input: UpsertDeclarationInput = {
        customs_file_id: customsFileId,
        declared_value_usd: parsed,
        declaration_number: values.declaration_number.trim() || undefined,
        notes: values.notes.trim() || undefined,
      }
      await execute(input)
    },
    [customsFileId, execute]
  )

  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="text-white">
          {existingDeclaration ? "Déclaration DGDA" : "Créer la déclaration"}
        </CardTitle>
        {isLocked && (
          <CardDescription className="text-white/50">
            Verrouillée — validation fiscale effectuée.
          </CardDescription>
        )}
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4 text-white/90"
        >
          <div>
            <Label htmlFor="decl-value" className="text-white/70">
              Valeur déclarée (USD)
              <span aria-hidden="true"> *</span>
            </Label>
            <Input
              id="decl-value"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex : 15000.00"
              disabled={isLocked || isPending}
              className="bg-white/5 border-white/20"
              {...register("declared_value_usd", {
                required: "Obligatoire.",
                min: { value: 0, message: "Valeur négative interdite." },
              })}
              aria-invalid={!!errors.declared_value_usd}
              aria-describedby={
                errors.declared_value_usd ? "decl-value-error" : undefined
              }
            />
            {errors.declared_value_usd && (
              <p id="decl-value-error" className="text-sm text-red-400 mt-1" role="alert">
                {errors.declared_value_usd.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="decl-number" className="text-white/70">
              Numéro de déclaration DGDA
            </Label>
            <Input
              id="decl-number"
              placeholder="Ex : DKS-2026-00123"
              disabled={isLocked || isPending}
              className="bg-white/5 border-white/20"
              {...register("declaration_number")}
            />
          </div>

          <div>
            <Label htmlFor="decl-notes" className="text-white/70">
              Notes internes
            </Label>
            <Textarea
              id="decl-notes"
              placeholder="Observations, conditions particulières…"
              rows={3}
              disabled={isLocked || isPending}
              className="bg-white/5 border-white/20"
              {...register("notes")}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert" aria-live="assertive">
              {error}
            </p>
          )}

          {!isLocked && (
            <Button
              type="submit"
              disabled={isPending || !isDirty}
              aria-busy={isPending}
            >
              {isPending
                ? "Enregistrement…"
                : existingDeclaration
                  ? "Mettre à jour"
                  : "Créer la déclaration"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
