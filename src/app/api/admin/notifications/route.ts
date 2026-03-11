import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  try {
    // 1. Incidents ouverts
    const { count: openIncidents } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'OPEN')

    // 2. Messages non lus (depuis la table messages si elle existe)
    let unreadMessages = 0
    try {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
      unreadMessages = count ?? 0
    } catch {
      // Table messages peut ne pas avoir is_read
    }

    // 3. Contact messages non lus / PENDING
    let pendingContacts = 0
    try {
      const { count } = await supabase
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING')
      pendingContacts = count ?? 0
    } catch {
      // Ignorer si table absente
    }

    // 4. Entrées Journal d'Audit dernières 24h
    const since = new Date()
    since.setHours(since.getHours() - 24)
    const { count: recentAuditCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since.toISOString())

    const total = (openIncidents ?? 0) + unreadMessages + (pendingContacts ?? 0) + (recentAuditCount ?? 0)

    return NextResponse.json({
      openIncidents: openIncidents ?? 0,
      unreadMessages,
      pendingContacts: pendingContacts ?? 0,
      recentAuditCount: recentAuditCount ?? 0,
      total,
      items: [
        { type: 'incident', count: openIncidents ?? 0, label: 'Incidents ouverts', href: '/admin/support' },
        { type: 'message', count: unreadMessages, label: 'Messages non lus', href: '/admin/support' },
        { type: 'contact', count: pendingContacts ?? 0, label: 'Contacts en attente', href: '/admin/support' },
        { type: 'audit', count: recentAuditCount ?? 0, label: 'Audits (24h)', href: '/admin/reporting' },
      ].filter((i) => i.count > 0),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
