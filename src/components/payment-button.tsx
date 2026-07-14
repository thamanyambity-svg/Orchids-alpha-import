"use client"

import { useState } from "react"
import { CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PaymentButtonProps {
  orderId: string
  paymentType: "DEPOSIT_60" | "BALANCE_40"
  amount: number
  disabled?: boolean
  className?: string
}

export function PaymentButton({ 
  orderId, 
  paymentType, 
  amount, 
  disabled = false,
  className 
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePayment = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          paymentType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to initiate payment")
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setError("Failed to initiate payment")
    } finally {
      setLoading(false)
    }
  }

  const label = paymentType === "DEPOSIT_60" 
    ? `Payer l'acompte (60%) - $${amount.toFixed(2)}` 
    : `Payer le solde (40%) - $${amount.toFixed(2)}`

  return (
    <div className="space-y-2">
      <Button
        onClick={handlePayment}
        disabled={disabled || loading}
        className={className}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Chargement...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            {label}
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
