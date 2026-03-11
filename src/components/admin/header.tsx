"use client"

import { NotificationCenter } from "@/components/admin/notification-center"

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-end h-14 px-6 border-b border-white/5 bg-[#020609]/80 backdrop-blur-sm shrink-0">
      <NotificationCenter />
    </header>
  )
}
