# Alpha Import Exchange B2B

**Plateforme de facilitation d'importation sécurisée pour la RDC**

Une filiale du Groupe A.Onoseke House Investment RDC — Infrastructure de confiance pour vos importations depuis la Chine, les Émirats, la Turquie, la Thaïlande et le Japon.

---

## Fonctionnalités principales

- **Modèle de paiement 60/40** : 60% à la validation du devis, 40% à la livraison
- **Partenaires certifiés** : Un partenaire exclusif par pays
- **Traçabilité totale** : Workflow documenté de la demande à la livraison
- **Intégration Stripe** : Paiements sécurisés
- **Notifications** : Emails (Resend) et webhooks n8n

---

## Prérequis

- **Node.js** 20.x
- Comptes : Supabase, Stripe, Resend
- (Optionnel) n8n pour l'automatisation des notifications

---

## Installation

```bash
# Cloner le dépôt
git clone <repo-url>
cd alpha-import-exchange-b2b

# Installer les dépendances
npm install
# ou
bun install
```

---

## Variables d'environnement

Créer un fichier `.env.local` à la racine :

```env
# Supabase (obligatoire)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Uniquement pour les API routes, jamais exposé côté client

# Stripe (paiements)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000   # Pour les URLs de redirection Stripe

# Resend (emails)
RESEND_API_KEY=re_...

# n8n (optionnel - notifications/automatisation)
N8N_WEBHOOK_URL=https://xxx.app.n8n.cloud/webhook-test/xxx

# OpenAI (optionnel - assistant IA pour les emails reçus)
OPENAI_API_KEY=sk_...
```

---

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement avec Turbopack |
| `npm run build` | Build de production |
| `npm run start` | Démarrer le serveur de production |
| `npm run lint` | Vérifier le code avec ESLint |
| `npm run typecheck` | Vérifier les types TypeScript |

---

## Scripts utilitaires (scripts/)

| Script | Usage | Description |
|--------|-------|-------------|
| `verify_admin.ts` | `npx tsx scripts/verify_admin.ts` | Vérifier les comptes admin |
| `reset_admin_password.ts` | `npx tsx scripts/reset_admin_password.ts` | Réinitialiser le mot de passe admin |
| `apply_partner_schema.ts` | `npx tsx scripts/apply_partner_schema.ts` | Schéma candidatures partenaires |
| `apply_notifications_migration.ts` | `npx tsx scripts/apply_notifications_migration.ts` | Migration table notifications |
| `diagnose_partners.ts` | `npx tsx scripts/diagnose_partners.ts` | Diagnostic partenaires |

---

## Rôles utilisateurs

| Rôle | Espace | Accès |
|------|--------|-------|
| **BUYER** | `/dashboard` | Demandes, commandes, documents, paiements |
| **PARTNER** | `/partner` | Demandes assignées, fournisseurs, statuts |
| **ADMIN** | `/admin` | Gestion complète (requests, partners, finances, reporting) |

---

## Structure du projet

```
src/
├── app/                 # Next.js App Router
│   ├── admin/           # Dashboard administrateur
│   ├── partner/         # Dashboard partenaire
│   ├── dashboard/       # Dashboard acheteur
│   ├── api/             # Routes API
│   ├── login, register  # Authentification
│   └── payment/         # Pages Stripe success/cancel
├── components/          # Composants React
│   ├── ui/              # Composants shadcn/ui
│   ├── dashboard/       # Composants métier acheteur
│   ├── admin/           # Composants métier admin
│   └── partner/         # Composants métier partenaire
├── lib/                 # Logique métier
│   ├── types.ts         # Types TypeScript
│   ├── workflow.ts      # Moteur de workflow (demandes/commandes)
│   ├── supabase/        # Client Supabase
│   ├── stripe.ts        # Configuration Stripe
│   ├── webhooks.ts      # Intégration n8n
│   └── notifications.ts # Emails Resend
docs/
└── security.md          # Documentation RLS Supabase
supabase/
└── migrations/          # Migrations SQL (RLS)
```

---

## Sécurité (RLS Supabase)

Les politiques Row Level Security sont définies dans `supabase/migrations/`. Voir `docs/security.md` pour la documentation détaillée.

**Important** : Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` côté client.

---

## Workflow n8n

Le projet inclut un workflow n8n (`n8n_alpha_import_workflow.json`) pour les notifications (Slack) et le logging des événements. Voir `docs/n8n-workflow.md` pour la configuration.

---

## Workflow métier

### Demandes d'import
```
DRAFT → PENDING → ANALYSIS → VALIDATED | REJECTED → AWAITING_DEPOSIT
```

### Commandes (modèle 60/40)
```
PENDING → AWAITING_DEPOSIT → FUNDED → SOURCING → PURCHASED → SHIPPED → DELIVERED → AWAITING_BALANCE → CLOSED
```

---

## Déploiement (Vercel)

Compatible avec Vercel, Netlify ou tout hébergeur supportant Next.js.

**Variables obligatoires dans Vercel** (Settings → Environment Variables) :

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon Supabase (auth + middleware) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (API routes uniquement) |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe |
| `STRIPE_WEBHOOK_SECRET` | Signing secret du webhook Stripe (prod) |
| `NEXT_PUBLIC_APP_URL` | URL du site en prod (ex. `https://votre-projet.vercel.app`) |
| `RESEND_API_KEY` | Clé API Resend (emails) |

Sans `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`, le middleware renvoie une erreur 500 (`MIDDLEWARE_INVOCATION_FAILED`). Voir `.env.example` pour la liste complète.

---

## Licence

Propriétaire — Groupe A.Onoseke House Investment RDC
