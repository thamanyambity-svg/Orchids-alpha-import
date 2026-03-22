import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  getPendingProofs,
  getRecentlyReviewedProofs,
} from "@/app/actions/payment-proofs"
import { PaymentProofsClient } from "@/components/admin/payment-proofs/payment-proofs-client"
import { FileCheck } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminPaymentProofsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "ADMIN") redirect("/dashboard")

  const [pend, rev] = await Promise.all([
    getPendingProofs(),
    getRecentlyReviewedProofs(15),
  ])

  if (!pend.success || !rev.success) {
    return (
      <div className="p-8 text-red-400 text-sm font-mono">
        {!pend.success ? pend.error : rev.success ? "" : rev.error}
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-[#ffd700]/10 border border-[#ffd700]/20">
          <FileCheck className="w-8 h-8 text-[#ffd700]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Preuves de paiement</h1>
          <p className="text-sm text-white/50">
            Validation manuelle — URLs signées journalisées (audit documents).
          </p>
        </div>
      </div>
      <PaymentProofsClient
        initialPending={pend.data}
        initialReviewed={rev.data}
      />
    </div>
  )
}
