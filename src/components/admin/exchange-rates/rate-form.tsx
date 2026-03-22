"use client"

import { UseFormRegister, FieldErrors } from "react-hook-form"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type RateFormValues = {
  rate: string
  notes?: string
}

type Props = {
  register: UseFormRegister<RateFormValues>
  errors: FieldErrors<RateFormValues>
  currencyValue: string
  onCurrencyChange: (v: string) => void
  isPending: boolean
  onSubmit: (e: React.FormEvent) => void
}

const QUOTE_OPTIONS = [
  "EUR",
  "CNY",
  "GBP",
  "CDF",
  "XAF",
  "XOF",
  "AED",
  "TRY",
  "THB",
  "JPY",
]

export function RateForm({
  register,
  errors,
  currencyValue,
  onCurrencyChange,
  isPending,
  onSubmit,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      <p className="text-xs text-white/50 font-mono uppercase tracking-wider">
        Base fixe : <span className="text-[#ffd700]">USD</span> → devise cible
      </p>
      <div className="space-y-2">
        <Label className="text-white/80">Devise cible</Label>
        <Select value={currencyValue} onValueChange={onCurrencyChange}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Choisir" />
          </SelectTrigger>
          <SelectContent>
            {QUOTE_OPTIONS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-white/80">Taux (1 USD = ?)</Label>
        <Input
          {...register("rate")}
          type="number"
          step="any"
          min="0"
          className="bg-white/5 border-white/10 text-white"
          placeholder="ex. 2800"
        />
        {errors.rate && (
          <p className="text-xs text-red-400">{errors.rate.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label className="text-white/80">Notes (optionnel)</Label>
        <Input
          {...register("notes")}
          className="bg-white/5 border-white/10 text-white"
        />
      </div>
      <Button
        type="submit"
        disabled={isPending}
        className="bg-[#ffd700] text-black hover:bg-[#e6c200]"
      >
        {isPending ? "Enregistrement…" : "Enregistrer le taux"}
      </Button>
    </form>
  )
}
