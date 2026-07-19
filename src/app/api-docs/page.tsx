"use client"

import { useLanguage } from "@/lib/i18n-context"
import { motion } from "framer-motion"
import {
  Webhook,
  Key,
  Shield,
  Code,
  Copy,
  CheckCircle2,
} from "lucide-react"
import { useState } from "react"

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative group rounded-lg bg-muted/50 border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <span className="text-xs text-muted-foreground font-mono uppercase">{lang}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap">{code}</pre>
    </div>
  )
}

export default function ApiDocsPage() {
  const { t } = useLanguage()

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <Code className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Documentation API Webhooks</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Documentation technique pour l&apos;intégration des webhooks partenaires avec Alpha Import Exchange.
        </p>
      </motion.div>

      <div className="space-y-10">
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Authentification
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Chaque webhook est authentifié via un secret partagé transmis dans le header <code className="text-primary font-mono text-xs bg-primary/10 px-1.5 py-0.5 rounded">x-webhook-secret</code>.
          </p>
          <CodeBlock code={`POST /api/webhooks/n8n-events\nContent-Type: application/json\nx-webhook-secret: votre_secret_partagé`} />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Webhook className="w-5 h-5 text-primary" /> Événements n8n
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Les workflows n8n peuvent notifier la plateforme des événements suivants :
          </p>

          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-card border border-border">
              <h3 className="font-semibold text-sm mb-2">request_validated</h3>
              <p className="text-xs text-muted-foreground mb-3">Déclenché quand une demande est validée par l&apos;admin.</p>
              <CodeBlock lang="json" code={`{
  "event": "request_validated",
  "data": {
    "requestId": "uuid",
    "orderId": "uuid",
    "buyerEmail": "client@example.com"
  }
}`} />
            </div>

            <div className="p-4 rounded-xl bg-card border border-border">
              <h3 className="font-semibold text-sm mb-2">certified_report_requested</h3>
              <p className="text-xs text-muted-foreground mb-3">Demande de rapport certifié après validation.</p>
              <CodeBlock lang="json" code={`{
  "event": "certified_report_requested",
  "data": {
    "requestId": "uuid",
    "orderId": "uuid",
    "amount": 15000
  }
}`} />
            </div>

            <div className="p-4 rounded-xl bg-card border border-border">
              <h3 className="font-semibold text-sm mb-2">partner_assigned</h3>
              <p className="text-xs text-muted-foreground mb-3">Un partenaire est assigné à une demande.</p>
              <CodeBlock lang="json" code={`{
  "event": "partner_assigned",
  "data": {
    "requestId": "uuid",
    "partnerId": "uuid",
    "country": "TR"
  }
}`} />
            </div>

            <div className="p-4 rounded-xl bg-card border border-border">
              <h3 className="font-semibold text-sm mb-2">payment_received</h3>
              <p className="text-xs text-muted-foreground mb-3">Paiement Stripe confirmé (acompte ou solde).</p>
              <CodeBlock lang="json" code={`{
  "event": "payment_received",
  "data": {
    "orderId": "uuid",
    "amount": 9000,
    "type": "DEPOSIT_60",
    "stripePaymentIntentId": "pi_xxx"
  }
}`} />
            </div>

            <div className="p-4 rounded-xl bg-card border border-border">
              <h3 className="font-semibold text-sm mb-2">incident_created</h3>
              <p className="text-xs text-muted-foreground mb-3">Un incident/réclamation est ouvert sur une commande.</p>
              <CodeBlock lang="json" code={`{
  "event": "incident_created",
  "data": {
    "incidentId": "uuid",
    "orderId": "uuid",
    "type": "DELAY",
    "severity": "HIGH"
  }
}`} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" /> Configuration
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Pour configurer un webhook partenaire, définissez la variable d&apos;environnement :
          </p>
          <CodeBlock code={`N8N_WEBHOOK_SECRET=votre_secret_unique`} />
          <p className="text-xs text-muted-foreground mt-3">
            Ce secret doit être partagé avec votre workflow n8n et envoyé dans le header <code className="text-primary font-mono">x-webhook-secret</code> à chaque appel.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Webhooks Stripe</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Les événements Stripe (checkout.session.completed, charge.updated, etc.) sont reçus automatiquement. Aucune configuration partenaire n&apos;est nécessaire.
          </p>
          <CodeBlock lang="bash" code={`# Configuré dans le dashboard Stripe\nEndpoint : https://votre-domaine/api/webhooks/stripe\nEvents : checkout.session.completed, charge.updated, payment_intent.succeeded`} />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Bonnes pratiques</h2>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
            <li>Les webhooks sont idempotents : un même événement peut être reçu plusieurs fois sans effet de bord</li>
            <li>Les événements sont journalisés dans la table <code className="text-primary font-mono">audit_logs</code> avec le préfixe <code className="text-primary font-mono">N8N_</code></li>
            <li>En cas d&apos;erreur, le webhook répond avec un code 400 ou 500 et un message descriptif</li>
            <li>Utilisez un timeout de 30s maximum côté appelant</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
