"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PaymentCancelPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("order_id")

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-lg">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <XCircle className="w-10 h-10 text-amber-500" />
          </motion.div>

          <h1 className="text-2xl font-bold mb-2">Paiement annulé</h1>
          <p className="text-muted-foreground mb-6">
            Votre paiement a été annulé. Aucun montant n&apos;a été débité de votre compte.
          </p>

          <div className="bg-muted/50 rounded-xl p-4 mb-6">
            <p className="text-sm text-muted-foreground">
              Si vous avez rencontré un problème, n&apos;hésitez pas à nous contacter ou à réessayer.
            </p>
          </div>

          <div className="space-y-3">
            {orderId && (
              <Button asChild className="w-full">
                <Link href={`/dashboard/requests/${orderId}`} className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Réessayer le paiement
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild className="w-full">
              <Link href="/dashboard/requests" className="flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Retour aux demandes
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
