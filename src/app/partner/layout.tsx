import { PartnerSidebar } from "@/components/partner/sidebar"
import { RoleGuard } from "@/components/auth-role-guard"

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RoleGuard allowedRoles={['PARTNER']}>
      <div className="min-h-screen bg-background">
        <PartnerSidebar />
        <main className="ml-64">
          {children}
        </main>
      </div>
    </RoleGuard>
  )
}
