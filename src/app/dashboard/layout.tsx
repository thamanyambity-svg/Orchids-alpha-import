import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { RoleGuard } from "@/components/auth-role-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RoleGuard allowedRoles={['BUYER']}>
      <div className="min-h-screen bg-background">
        <DashboardSidebar />
        <main className="ms-64">
          {children}
        </main>
      </div>
    </RoleGuard>
  )
}
