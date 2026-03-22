"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { createExchangeRate } from "@/app/actions/exchange-rates"
import { RateForm, type RateFormValues } from "./rate-form"

const schema = z.object({
  rate: z
    .string()
    .min(1, "Taux requis")
    .refine((s) => {
      const n = Number(s)
      return !Number.isNaN(n) && n > 0
    }, "Taux > 0 requis"),
  notes: z.string().optional(),
})

export function RateFormClient() {
  const router = useRouter()
  const [currency, setCurrency] = useState("EUR")
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rate: "", notes: "" },
  })

  async function onSubmit(values: RateFormValues) {
    const res = await createExchangeRate({
      toCurrency: currency,
      rate: Number(values.rate),
      notes: values.notes || null,
    })
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success("Taux enregistré")
    reset()
    router.refresh()
  }

  return (
    <RateForm
      register={register}
      errors={errors}
      currencyValue={currency}
      onCurrencyChange={setCurrency}
      isPending={isSubmitting}
      onSubmit={handleSubmit(onSubmit)}
    />
  )
}
