import { PartnerSidebar } from "@/components/partner/sidebar"

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <PartnerSidebar />
      <main className="ml-64">
        {children}
      </main>
    </div>
  )
}
