# Migrations Supabase — état & ordre d'application

## ⚠️ Constat important

Le **schéma de base** (tables `profiles`, `import_requests`, `orders`, `transactions`,
`payments`, `suppliers`, `incidents`, `messages`, `notifications`, `countries`,
`audit_logs`, `partner_profiles`, `buyer_profiles`, etc.) n'est **pas** présent dans
ce dossier : il a été créé directement sur le projet Supabase distant.

Conséquence : on **ne peut pas** reconstruire une base identique à la production
uniquement depuis `migrations/`. Pour combler ce trou :

```bash
# Récupère le schéma réel de la prod sous forme de migration
npx supabase db pull
```

Cela génère une migration de base (le DDL des tables) à committer en tête de l'ordre
ci-dessous. C'est le prérequis pour que `supabase db reset` / `db push` reconstruise
un environnement fidèle.

## Ordre d'application

1. *(à générer via `supabase db pull`)* — DDL des tables de base
2. `20250308000001_enable_rls_policies.sql` — RLS par rôle (helper `get_user_role`)
3. `20250308100001_inbound_emails.sql` — table `inbound_emails` + RLS
4. `20250309000001_processed_stripe_events.sql` — idempotence webhooks Stripe
5. `20250309000002_system_actor.sql` — `audit_logs.actor_id` nullable (acteur « Système »)

## Scripts SQL hors-migrations (`/scripts/*.sql`)

Le dossier `scripts/` contient des correctifs/poses de policies appliqués
historiquement à la main (`fix_profiles_recursion.sql`, `create_transactions_table.sql`,
`create_tracking_events.sql`, `setup_storage_policies.sql`, etc.).

➡️ **À terme**, après `supabase db pull`, ces scripts doivent être soit intégrés au
DDL de base, soit convertis en migrations numérotées, puis retirés de `scripts/`
pour avoir une **source unique de vérité** du schéma.

## Application

```bash
# Via CLI (recommandé)
npx supabase db push

# Ou manuellement : copier chaque fichier dans Supabase Dashboard > SQL Editor
# en respectant l'ordre ci-dessus.
```
