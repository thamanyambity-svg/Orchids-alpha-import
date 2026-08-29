"use client"

import { NotificationCenter } from "@/components/admin/notification-center"
import { ThemeToggle } from "@/components/theme-toggle"

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-end h-14 px-6 border-b border-foreground/5 bg-background/80 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationCenter />
      </div>
    </header>
  )
}
