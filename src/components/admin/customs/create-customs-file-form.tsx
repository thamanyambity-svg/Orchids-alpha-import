"use client"

import { useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useServerAction } from "@/hooks/use-server-action"
import { createCustomsFile } from "@/app/actions/customs/create-customs-file"
import type { CreateCustomsFileInput } from "@/app/actions/customs/create-customs-file"

interface CreateCustomsFileFormValues {
  order_id: string
  request_id: string
  transport_mode: "AIR" | "SEA" | "LAND"
  transport_ref: string
  vessel_flight_name: string
  container_number: string
  country_code: string
}

interface CreateCustomsFileFormProps {
  defaultOrderId?: string
  defaultRequestId?: string
  onSuccess?: (customsFileId: string) => void
  /** Base pour la redirection après création (défaut : admin) */
  detailBasePath?: string
}

export function CreateCustomsFileForm({
  defaultOrderId,
  defaultRequestId,
  onSuccess,
  detailBasePath = "/admin/customs",
}: CreateCustomsFileFormProps) {
  const router = useRouter()

  const { execute, isPending, error, isSuccess, data, reset } =
    useServerAction(createCustomsFile)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset: resetForm,
    formState: { errors },
  } = useForm<CreateCustomsFileFormValues>({
    defaultValues: {
      order_id: defaultOrderId ?? "",
      request_id: defaultRequestId ?? "",
      transport_mode: "SEA",
      transport_ref: "",
      vessel_flight_name: "",
      container_number: "",
      country_code: "CD",
    },
  })

  const transportMode = watch("transport_mode")

  useEffect(() => {
    if (isSuccess && data) {
      if (onSuccess) {
        onSuccess(data.customsFileId)
      } else {
        router.push(`${detailBasePath}/${data.customsFileId}`)
      }
      resetForm()
      reset()
    }
  }, [isSuccess, data, onSuccess, router, resetForm, reset, detailBasePath])

  const onSubmit = useCallback(
    async (values: CreateCustomsFileFormValues) => {
      const input: CreateCustomsFileInput = {
        order_id: values.order_id.trim(),
        request_id: values.request_id.trim(),
        transport_mode: values.transport_mode,
        transport_ref: values.transport_ref.trim() || undefined,
        vessel_flight_name: values.vessel_flight_name.trim() || undefined,
        container_number: values.container_number.trim() || undefined,
        country_code: values.country_code.trim() || "CD",
      }
      await execute(input)
    },
    [execute]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer un dossier douanier</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <Label htmlFor="cf-order-id">ID de commande</Label>
            <Input
              id="cf-order-id"
              placeholder="UUID de la commande"
              disabled={!!defaultOrderId || isPending}
              {...register("order_id", { required: "Obligatoire." })}
              aria-invalid={!!errors.order_id}
            />
            {errors.order_id && (
              <p className="text-sm text-destructive mt-1" role="alert">
                {errors.order_id.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="cf-request-id">ID de demande d&apos;import</Label>
            <Input
              id="cf-request-id"
              placeholder="UUID de la demande d'import"
              disabled={!!defaultRequestId || isPending}
              {...register("request_id", { required: "Obligatoire." })}
              aria-invalid={!!errors.request_id}
            />
            {errors.request_id && (
              <p className="text-sm text-destructive mt-1" role="alert">
                {errors.request_id.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="cf-transport-mode">Mode de transport</Label>
            <Select
              value={transportMode}
              onValueChange={(v) =>
                setValue("transport_mode", v as "AIR" | "SEA" | "LAND", {
                  shouldValidate: true,
                })
              }
              disabled={isPending}
            >
              <SelectTrigger id="cf-transport-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SEA">🚢 Maritime</SelectItem>
                <SelectItem value="AIR">✈ Aérien</SelectItem>
                <SelectItem value="LAND">🚛 Terrestre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="cf-transport-ref">
              {transportMode === "AIR"
                ? "Numéro de LTA (Lettre de Transport Aérien)"
                : transportMode === "SEA"
                  ? "Numéro de B/L (Bill of Lading)"
                  : "Référence transport"}
            </Label>
            <Input
              id="cf-transport-ref"
              placeholder={
                transportMode === "AIR"
                  ? "Ex : 074-12345678"
                  : transportMode === "SEA"
                    ? "Ex : HLCU1234567"
                    : "Référence"
              }
              disabled={isPending}
              {...register("transport_ref")}
            />
          </div>

          {transportMode !== "LAND" && (
            <div>
              <Label htmlFor="cf-vessel">
                {transportMode === "AIR" ? "Numéro de vol" : "Nom du navire"}
              </Label>
              <Input
                id="cf-vessel"
                placeholder={
                  transportMode === "AIR" ? "Ex : ET 312" : "Ex : MSC GÜLSÜN"
                }
                disabled={isPending}
                {...register("vessel_flight_name")}
              />
            </div>
          )}

          {transportMode === "SEA" && (
            <div>
              <Label htmlFor="cf-container">Numéro de conteneur</Label>
              <Input
                id="cf-container"
                placeholder="Ex : HLCU1234567"
                disabled={isPending}
                {...register("container_number")}
              />
            </div>
          )}

          <div>
            <Label htmlFor="cf-country">Pays de destination</Label>
            <Input
              id="cf-country"
              maxLength={5}
              disabled={isPending}
              {...register("country_code")}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert" aria-live="assertive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={isPending} aria-busy={isPending}>
            {isPending ? "Création…" : "Créer le dossier douanier"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
