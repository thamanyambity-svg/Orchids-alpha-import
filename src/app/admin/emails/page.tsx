"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Mail, Bot, Sparkles, ExternalLink, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

const CATEGORY_LABELS: Record<string, string> = {
  PARTENARIAT: "Partenariat",
  INFO: "Information",
  RÉCLAMATION: "Réclamation",
  PRESSE: "Presse",
  AUTRE: "Autre",
}

const PRIORITY_COLORS: Record<string, string> = {
  HAUTE: "bg-destructive/20 text-destructive border-destructive/30",
  MOYENNE: "bg-amber-500/20 text-amber-500 border-amber-500/30",
  BASSE: "bg-muted text-muted-foreground",
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Non lu",
  READ: "Lu",
  REPLIED: "Répondu",
  ARCHIVED: "Archivé",
}

export default function AdminEmailsPage() {
  const [emails, setEmails] = useState<
    Array<{
      id: string
      from_email: string
      from_name: string | null
      subject: string | null
      body_text: string | null
      ai_category: string | null
      ai_priority: string | null
      ai_summary: string | null
      ai_suggested_reply: string | null
      status: string
      received_at: string
    }>
  >([])
  const [loading, setLoading] = useState(true)
  const [selectedEmail, setSelectedEmail] = useState<typeof emails[0] | null>(null)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchEmails()
  }, [])

  async function fetchEmails() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("inbound_emails")
        .select("id, from_email, from_name, subject, body_text, ai_category, ai_priority, ai_summary, ai_suggested_reply, status, received_at")
        .order("received_at", { ascending: false })
        .limit(50)

      if (error) throw error
      setEmails(data || [])
    } catch (error) {
      console.error(error)
      toast.error("Erreur lors du chargement des emails")
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(id: string) {
    await supabase.from("inbound_emails").update({ status: "READ", updated_at: new Date().toISOString() }).eq("id", id)
    fetchEmails()
  }

  async function copyReply(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("Réponse copiée dans le presse-papier")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Mail className="w-8 h-8 text-primary" />
            Boîte Mail contact@aonosekehouseinvestmentdrc.site
          </h1>
          <p className="text-muted-foreground mt-1">
            Emails reçus avec analyse IA — catégorisation, priorité et suggestion de réponse
          </p>
        </div>
      </div>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="w-5 h-5 text-primary" />
            Assistant IA
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Chaque email reçu est analysé automatiquement : catégorie, priorité, résumé et proposition de réponse.
            Configurez le webhook Resend <code className="text-xs bg-white/10 px-1 rounded">email.received</code> vers{" "}
            <code className="text-xs bg-white/10 px-1 rounded">/api/webhooks/resend/inbound</code>
          </p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emails reçus</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Chargement...</div>
          ) : emails.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Aucun email reçu pour le moment.</p>
              <p className="text-xs mt-2">Les emails envoyés à contact@aonosekehouseinvestmentdrc.site apparaîtront ici.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>De</TableHead>
                  <TableHead>Sujet</TableHead>
                  <TableHead>IA Catégorie</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Reçu le</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((email) => (
                  <TableRow
                    key={email.id}
                    className={email.status === "PENDING" ? "bg-primary/5" : ""}
                  >
                    <TableCell>
                      <div className="font-medium">{email.from_name || email.from_email}</div>
                      <div className="text-xs text-muted-foreground">{email.from_email}</div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{email.subject || "(sans sujet)"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[email.ai_category || ""] || email.ai_category || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={PRIORITY_COLORS[email.ai_priority || ""] || ""}
                      >
                        {email.ai_priority || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell>{STATUS_LABELS[email.status] || email.status}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(email.received_at), "dd MMM yyyy HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedEmail(email)
                          if (email.status === "PENDING") markAsRead(email.id)
                        }}
                      >
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmail?.subject || "Email"}</DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{CATEGORY_LABELS[selectedEmail.ai_category || ""] || selectedEmail.ai_category}</Badge>
                <Badge variant="outline" className={PRIORITY_COLORS[selectedEmail.ai_priority || ""]}>
                  {selectedEmail.ai_priority}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                De : {selectedEmail.from_name || ""} &lt;{selectedEmail.from_email}&gt;
              </p>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap border rounded-lg p-4 bg-muted/30">
                {selectedEmail.body_text || "(pas de contenu texte)"}
              </div>

              {selectedEmail.ai_summary && (
                <div className="border rounded-lg p-4 bg-primary/5">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Résumé IA
                  </h4>
                  <p className="text-sm">{selectedEmail.ai_summary}</p>
                </div>
              )}

              {selectedEmail.ai_suggested_reply && (
                <div className="border rounded-lg p-4 bg-primary/5">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />
                    Suggestion de réponse
                  </h4>
                  <Textarea
                    readOnly
                    value={selectedEmail.ai_suggested_reply}
                    className="min-h-[120px] resize-none font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    className="mt-2"
                    variant="outline"
                    onClick={() => copyReply(selectedEmail.ai_suggested_reply!)}
                  >
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? "Copié !" : "Copier la réponse"}
                  </Button>
                </div>
              )}

              <Button asChild variant="outline" size="sm">
                <a href={`mailto:${selectedEmail.from_email}?subject=Re: ${encodeURIComponent(selectedEmail.subject || "")}`}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Répondre par email
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
