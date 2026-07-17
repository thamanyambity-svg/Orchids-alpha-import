"use client"

import { useState, useEffect } from "react"
import { CreditCard, Landmark, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"

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
  const [hasMandate, setHasMandate] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkMandate() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("mandate_activated")
          .eq("id", user.id)
          .single()
        setHasMandate(data?.mandate_activated || false)
      }
      setChecking(false)
    }
    checkMandate()
  }, [])

  const handleCard = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentType }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Erreur de paiement")
        return
      }
      if (data.url) window.location.href = data.url
    } catch {
      setError("Erreur de paiement")
    } finally {
      setLoading(false)
    }
  }

  const handleSepa = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/payments/process-sepa-debit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          paymentType,
          amount,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erreur de prélèvement")
        return
      }

      if (data.success) {
        window.location.reload()
      }
    } catch {
      setError("Erreur de prélèvement")
    } finally {
      setLoading(false)
    }
  }

  const pct = paymentType === "DEPOSIT_60" ? "60%" : "40%"

  return (
    <div className="space-y-3">
      {checking ? null : hasMandate ? (
        <div className="space-y-2">
          <Button
            onClick={handleSepa}
            disabled={disabled || loading}
            className={className + " w-full"}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Prélèvement en cours...
              </>
            ) : (
              <>
                <Landmark className="w-4 h-4 mr-2" />
                Payer par prélèvement SEPA ({pct}) — ${amount.toFixed(2)}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCard}
            disabled={disabled || loading}
            className="w-full text-xs"
          >
            <CreditCard className="w-3 h-3 mr-1" />
            Payer par carte à la place
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            onClick={handleCard}
            disabled={disabled || loading}
            className={className + " w-full"}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Redirection...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Payer par carte ({pct}) — ${amount.toFixed(2)}
              </>
            )}
          </Button>
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
