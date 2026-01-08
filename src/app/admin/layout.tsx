import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminHeader } from "@/components/admin/header"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0A0B0D] text-foreground selection:bg-primary/30">
      <div className="fixed inset-0 pattern-dots opacity-[0.03] pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <AdminSidebar />
      
      <div className="ml-64 flex flex-col min-h-screen relative z-10">
        <AdminHeader />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
