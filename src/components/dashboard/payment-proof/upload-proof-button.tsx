"use client"

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
} from "react"
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useServerAction } from "@/hooks/use-server-action"
import { uploadPaymentProof } from "@/app/actions/client/upload-payment-proof"
import type { UploadPaymentProofResult } from "@/app/actions/client/upload-payment-proof"

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

const ACCEPTED_FILE_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.pdf"

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD — Dollar américain" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "CDF", label: "CDF — Franc congolais" },
] as const

interface UploadProofButtonProps {
  orderId: string
  onSuccess: (result: UploadPaymentProofResult) => void
}

export function UploadProofButton({ orderId, onSuccess }: UploadProofButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [declaredAmount, setDeclaredAmount] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [amountError, setAmountError] = useState<string | null>(null)

  const { execute, isPending, error, data, reset, isSuccess } =
    useServerAction(uploadPaymentProof)

  useEffect(() => {
    if (isSuccess && data) {
      onSuccess(data)
      reset()
    }
  }, [isSuccess, data, onSuccess, reset])

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setFileError(null)
    setSelectedFile(null)
    if (!file) return
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFileError("Format non accepté. Formats autorisés : JPEG, PNG, WEBP, PDF.")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMo = (file.size / (1024 * 1024)).toFixed(1)
      setFileError(`Fichier trop volumineux (${sizeMo} Mo). Maximum : 10 Mo.`)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }
    setSelectedFile(file)
  }, [])

  const handleSubmit = useCallback(async () => {
    const amount = parseFloat(declaredAmount.replace(",", "."))
    if (!declaredAmount || Number.isNaN(amount) || amount <= 0) {
      setAmountError("Le montant déclaré est obligatoire et doit être positif.")
      return
    }
    setAmountError(null)
    if (!selectedFile) {
      setFileError("Veuillez sélectionner un fichier.")
      return
    }
    await execute({
      orderId,
      file: selectedFile,
      declaredAmount: amount,
      declaredCurrency: currency,
    })
  }, [orderId, selectedFile, declaredAmount, currency, execute])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Joindre une preuve de paiement</CardTitle>
        <CardDescription>
          Téléversez un justificatif (virement, réception, etc.) au format image ou PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_EXTENSIONS}
          onChange={handleFileChange}
          aria-hidden="true"
          tabIndex={-1}
          className="hidden"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
          >
            {selectedFile ? "Changer de fichier" : "Sélectionner un fichier"}
          </Button>
          {selectedFile && (
            <span className="text-sm text-muted-foreground" role="status" aria-live="polite">
              {selectedFile.name}
            </span>
          )}
        </div>
        {fileError && (
          <p className="text-sm text-destructive" role="alert" aria-live="assertive">
            {fileError}
          </p>
        )}
        <Separator />
        <div className="space-y-2">
          <Label htmlFor={`upload-amount-${orderId}`}>Montant figurant sur le justificatif</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id={`upload-amount-${orderId}`}
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Ex. 3000.00"
              value={declaredAmount}
              onChange={(e) => {
                setDeclaredAmount(e.target.value)
                if (amountError) setAmountError(null)
              }}
              disabled={isPending}
              aria-required
              aria-invalid={!!amountError}
              className="sm:max-w-xs"
            />
            <Select value={currency} onValueChange={setCurrency} disabled={isPending}>
              <SelectTrigger className="sm:w-[220px]" aria-label="Devise">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {amountError && (
            <p className="text-sm text-destructive" role="alert">
              {amountError}
            </p>
          )}
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert" aria-live="assertive">
            {error}
          </p>
        )}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !selectedFile}
          aria-busy={isPending}
        >
          {isPending ? "Envoi en cours…" : "Envoyer la preuve"}
        </Button>
      </CardContent>
    </Card>
  )
}
