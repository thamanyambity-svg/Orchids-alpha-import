/**
 * Bulle de message — fil douanier (public / interne).
 */

import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { CustomsMessage } from '@/app/actions/customs/messaging'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: CustomsMessage
  currentUserId: string
  /** Classes pour thème sombre (ex. admin douanes) */
  inverse?: boolean
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administration',
  PARTNER: 'Partenaire',
  PARTNER_COUNTRY: 'Partenaire',
  FISCAL_CONSULTANT: 'Consultant fiscal',
  ACCOUNTANT: 'Comptable',
  BUYER: 'Client',
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function MessageBubble({
  message,
  currentUserId,
  inverse = false,
}: MessageBubbleProps) {
  const isOwnMessage = message.author_id === currentUserId
  const roleLabel = ROLE_LABELS[message.author_role] ?? message.author_role

  return (
    <article
      className={cn(
        'rounded-lg border p-3 mb-3',
        message.is_internal
          ? inverse
            ? 'border-amber-500/40 bg-amber-500/10'
            : 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30'
          : inverse
            ? 'border-white/10 bg-white/5'
            : 'border-border bg-muted/30'
      )}
      aria-label={
        `Message de ${message.author_name ?? roleLabel} — ` +
        `${message.is_internal ? 'note interne' : 'message public'}`
      }
      data-internal={message.is_internal}
      data-own={isOwnMessage}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('text-sm font-medium', inverse && 'text-white')}>
            {message.author_name ?? '—'}
          </span>
          <Badge variant="outline">{roleLabel}</Badge>
          {message.is_internal ? (
            <Badge
              variant="secondary"
              aria-label="Note interne — non visible par le client"
            >
              Interne
            </Badge>
          ) : (
            <Badge variant="outline" aria-label="Message visible par le client">
              Public
            </Badge>
          )}
          {(message.is_unread ?? false) && message.author_id !== currentUserId && (
            <Badge variant="default" aria-label="Non lu">
              Nouveau
            </Badge>
          )}
        </div>
        <time
          className={cn('text-xs tabular-nums', inverse ? 'text-white/60' : 'text-muted-foreground')}
          dateTime={message.created_at}
          title={formatDateTime(message.created_at)}
        >
          {formatDateTime(message.created_at)}
        </time>
      </header>

      <Separator className={cn('my-2', inverse && 'bg-white/10')} />

      <p className={cn('text-sm whitespace-pre-wrap', inverse ? 'text-white/90' : 'text-foreground')}>
        {message.content}
      </p>
    </article>
  )
}
