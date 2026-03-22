'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useTransition,
  useMemo,
  type KeyboardEvent,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { MessageBubble } from '@/components/customs/message-bubble'
import {
  sendCustomsMessage,
  getCustomsMessages,
  markCustomsMessagesAsRead,
  type CustomsMessage,
} from '@/app/actions/customs/messaging'
import { cn } from '@/lib/utils'

interface CustomsChatProps {
  fileId: string
  currentUserId: string
  currentUserRole: string
  initialMessages?: CustomsMessage[]
  /** Classes pour la carte (ex. admin douanes sombre) */
  cardClassName?: string
  /** Style description (thème sombre) */
  descriptionClassName?: string
  /** Bulles en mode contraste élevé (admin) */
  inverseBubbles?: boolean
}

export function CustomsChat({
  fileId,
  currentUserId,
  currentUserRole,
  initialMessages = [],
  cardClassName,
  descriptionClassName,
  inverseBubbles = false,
}: CustomsChatProps) {
  const [messages, setMessages] = useState<CustomsMessage[]>(initialMessages)
  const [content, setContent] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [isSending, startSending] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const canWrite = ['ADMIN', 'PARTNER', 'PARTNER_COUNTRY'].includes(currentUserRole)
  const canWriteInternal = currentUserRole === 'ADMIN'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /** Ouverture / changement de dossier : marquer lu puis recharger le fil. */
  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    void (async () => {
      await markCustomsMessagesAsRead(fileId).catch(() => {})
      const result = await getCustomsMessages(fileId)
      if (cancelled) return
      if (result.success) {
        setMessages(result.data ?? [])
      } else {
        setLoadError(result.error ?? 'Impossible de charger les messages.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fileId])

  useEffect(() => {
    const channel = supabase
      .channel(`customs_messages_${fileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'customs_file_messages',
          filter: `file_id=eq.${fileId}`,
        },
        async () => {
          const r = await getCustomsMessages(fileId)
          if (r.success) setMessages(r.data ?? [])
          await markCustomsMessagesAsRead(fileId).catch(() => {})
          const r2 = await getCustomsMessages(fileId)
          if (r2.success) setMessages(r2.data ?? [])
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [fileId, supabase])

  const reloadMessages = useCallback(async () => {
    const result = await getCustomsMessages(fileId)
    if (result.success) setMessages(result.data ?? [])
  }, [fileId])

  const handleSend = useCallback(() => {
    if (!content.trim()) return

    setSendError(null)
    startSending(async () => {
      const result = await sendCustomsMessage({
        fileId,
        content: content.trim(),
        isInternal: canWriteInternal ? isInternal : false,
      })

      if (result.success) {
        setContent('')
        setIsInternal(false)
        await reloadMessages()
      } else {
        setSendError(result.error ?? "Échec de l'envoi.")
      }
    })
  }, [fileId, content, isInternal, canWriteInternal, reloadMessages])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const internalCount = messages.filter((m) => m.is_internal).length
  const publicCount = messages.filter((m) => !m.is_internal).length
  const unreadCount = messages.filter(
    (m) => m.is_unread && m.author_id !== currentUserId
  ).length

  return (
    <Card className={cn(cardClassName)}>
      <CardHeader>
        <CardTitle className={inverseBubbles ? 'text-white' : undefined}>
          Messagerie du dossier
        </CardTitle>
        <CardDescription className={descriptionClassName}>
          <span>
            {publicCount} message{publicCount !== 1 ? 's' : ''} public
            {canWriteInternal && internalCount > 0
              ? ` — ${internalCount} note${internalCount !== 1 ? 's' : ''} interne${internalCount !== 1 ? 's' : ''}`
              : ''}
          </span>
          {unreadCount > 0 && (
            <span
              className={cn('ml-2 font-medium', inverseBubbles ? 'text-amber-300' : 'text-primary')}
              aria-label={`${unreadCount} message(s) non lu(s)`}
            >
              · {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loadError && <p role="alert">{loadError}</p>}

        {messages.length === 0 && !loadError && (
          <p className={cn('text-sm mb-3', inverseBubbles ? 'text-white/60' : 'text-muted-foreground')}>
            Aucun message pour l&apos;instant.
            {canWrite && ' Soyez le premier à écrire.'}
          </p>
        )}

        <div
          role="log"
          aria-label="Fil de messagerie du dossier douanier"
          aria-live="polite"
          className="max-h-[min(420px,50vh)] overflow-y-auto pr-1"
        >
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              currentUserId={currentUserId}
              inverse={inverseBubbles}
            />
          ))}
          <div ref={bottomRef} aria-hidden="true" />
        </div>
      </CardContent>

      {canWrite && (
        <>
          <Separator className={inverseBubbles ? 'bg-white/10' : undefined} />
          <CardFooter>
            <form
              className="w-full space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="chat-content" className={inverseBubbles ? 'text-white' : undefined}>
                  {isInternal ? 'Note interne' : 'Message'}
                </Label>
                <Textarea
                  id="chat-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isInternal
                      ? 'Note interne (non visible par le client)…'
                      : 'Message visible par le client et l’équipe…'
                  }
                  rows={3}
                  disabled={isSending}
                  maxLength={4000}
                  aria-describedby="chat-hint"
                  className={inverseBubbles ? 'bg-white/10 border-white/20 text-white placeholder:text-white/40' : undefined}
                />
                <p
                  id="chat-hint"
                  className={cn('text-xs', inverseBubbles ? 'text-white/50' : 'text-muted-foreground')}
                >
                  {content.length} / 4 000 caractères — Ctrl+Entrée pour envoyer
                </p>
              </div>

              {canWriteInternal && (
                <div className="flex flex-wrap items-center gap-3">
                  <Switch
                    id="internal-toggle"
                    checked={isInternal}
                    onCheckedChange={setIsInternal}
                    disabled={isSending}
                    aria-label="Envoyer comme note interne"
                  />
                  <Label htmlFor="internal-toggle" className={inverseBubbles ? 'text-white' : undefined}>
                    Note interne
                  </Label>
                  {isInternal && (
                    <p className={cn('text-xs w-full', inverseBubbles ? 'text-amber-200/90' : 'text-muted-foreground')}>
                      Ce message ne sera pas visible par le client.
                    </p>
                  )}
                </div>
              )}

              {sendError && (
                <p role="alert" aria-live="assertive" className="text-sm text-destructive">
                  {sendError}
                </p>
              )}

              <Button type="submit" disabled={isSending || !content.trim()} aria-busy={isSending}>
                {isSending ? 'Envoi…' : 'Envoyer'}
              </Button>
            </form>
          </CardFooter>
        </>
      )}
    </Card>
  )
}
