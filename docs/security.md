# Alpha Import Exchange - Documentation Sécurité

## Vue d'ensemble

Ce document décrit les politiques de sécurité (RLS - Row Level Security) appliquées à Supabase pour protéger les données selon le rôle utilisateur (BUYER, PARTNER, ADMIN).

## Principe

- **Client Supabase (anon key)** : Utilisé côté navigateur. Les politiques RLS s'appliquent.
- **Service Role Key** : Utilisé uniquement dans les API routes server-side (Stripe webhook, workflow, etc.). Bypass RLS — **ne jamais l'exposer côté client**.

## Rôles et accès

| Table | BUYER | PARTNER | ADMIN |
|-------|-------|---------|-------|
| `profiles` | Lire/mettre à jour le sien | Idem | Lire tous |
| `buyer_profiles` | CRUD le sien | - | Lire tous |
| `partner_profiles` | - | Lire/mettre à jour le sien | CRUD tous |
| `import_requests` | CRUD les siennes | Lire/mettre à jour assignées | CRUD tous |
| `orders` | Lire (via request) | Lire/mettre à jour (via request) | CRUD tous |
| `request_documents` | CRUD (via request) | CRUD (via request assignée) | CRUD tous |
| `incidents` | Lire (via order) | CRUD (via order assigné) | CRUD tous |
| `messages` | CRUD (si participant) | Idem | Lire tous |
| `notifications` | CRUD le sien | Idem | - |
| `countries` | Lire (auth) | Lire | CRUD |
| `partner_applications` | - | - | Lire/mettre à jour |
| `contact_messages` | Insert | - | Lire |
| `transactions` | - | - | Lire |
| `payments` | Lire (via order) | - | CRUD |
| `audit_logs` | - | - | Lire |
| `suppliers` | - | CRUD les siens | CRUD tous |
| `tracking_events` | CRUD (via order) | CRUD (via order) | CRUD tous |

## Application des migrations

### Option 1 : Supabase CLI

```bash
npx supabase db push
```

### Option 2 : SQL Editor (Dashboard Supabase)

1. Ouvrir **Supabase Dashboard** → **SQL Editor**
2. Copier le contenu de `supabase/migrations/20250308000001_enable_rls_policies.sql`
3. Exécuter le script
4. En cas d'erreur sur une table inexistante, commenter la section concernée

## Fonction helper

La fonction `get_user_role()` retourne le rôle de l'utilisateur connecté (`auth.uid()`). Elle est utilisée dans les politiques pour restreindre l'accès par rôle.

## Tables sans RLS (Service Role uniquement)

Certaines opérations d'écriture sont effectuées uniquement via les API avec `SUPABASE_SERVICE_ROLE_KEY` :
- `transactions` (insert par webhook Stripe)
- `orders` (insert/update par workflow)
- `audit_logs` (insert par workflow)

Ces tables ont des politiques RLS pour la **lecture** côté client, mais l'écriture est réservée au backend.

## Recommandations

1. **Ne jamais** exposer `SUPABASE_SERVICE_ROLE_KEY` côté client
2. Vérifier que toutes les tables sensibles ont RLS activé : `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;`
3. Tester chaque parcours utilisateur (BUYER, PARTNER, ADMIN) après application des migrations
