# Migrations Supabase

## État au 2026-08-01

Le dossier décrit désormais l'intégralité du schéma : les 32 tables attendues par
l'application existent sur le projet `edhijqtotsrefminalsp` et ont toutes leur DDL
versionné ici. L'avertissement précédent — « le schéma de base n'est pas dans ce
dossier » — n'est plus d'actualité.

Il subsiste une divergence de forme, pas de fond : les migrations ont été
appliquées au distant par petits lots, sous des noms propres à chaque lot
(`initial_schema_missing_tables`, `rls_policies_new_tables`, …), alors que le repo
les regroupe dans les fichiers d'origine. Le schéma est équivalent, l'historique
ne l'est pas.

Sur une base neuve, l'ordre des noms de fichiers suffit et produit le schéma
complet. Sur `edhijqtotsrefminalsp`, marquer les migrations comme appliquées
plutôt que les rejouer :

```bash
supabase link --project-ref edhijqtotsrefminalsp
supabase migration repair --status applied \
  20250309000001 20250309000002 20260714000001 \
  20260717000000 20260717000001 20260720000001 20260720100000 \
  20260801000000 20260801103629 20260801111630 20260801120000 \
  20260801130000 20260801140000
```

## Ordre

| Fichier | Rôle |
|---|---|
| `20250308000001_enable_rls_policies` | RLS par rôle, helper `get_user_role()` |
| `20250308100001_inbound_emails` | table `inbound_emails` |
| `20250309000001_processed_stripe_events` | idempotence des webhooks Stripe |
| `20250309000002_system_actor` | `audit_logs.actor_id` nullable (acteur « Système ») |
| `20260714000001_add_automatic_payment_system` | prélèvement SEPA automatique |
| `20260717000000_initial_schema` | 24 tables de base, enums, index, déclencheurs |
| `20260717000001_rls_policies` | 48 policies |
| `20260720000001_buyer_flow_restructure` | devis, bons de commande, spécifications |
| `20260720100000_sourcing_agent` | sessions et matches de sourcing IA |
| `20260801000000_customs_and_finance_capture` | 12 tables douanes/finance qui n'existaient qu'en base |
| `20260801103629_lock_legacy_documents_table` | RLS sur la table héritée `documents` |
| `20260801111630_align_legacy_tables` | colonnes manquantes sur les tables antérieures |
| `20260801120000_buyer_flow_prerequisites` | `log_audit()`, `handle_updated_at()`, statut `QUOTE_ACCEPTED` |
| `20260801130000_fix_assigned_partner_fk` | `assigned_partner_id` → `partner_profiles` |
| `20260801140000_restrict_security_definer_rpc` | fermeture des RPC `SECURITY DEFINER` ouverts à `anon` |

## Points ouverts

Quatre divergences repo ↔ base restent non tranchées, détaillées en tête de
`20260801111630_align_legacy_tables.sql`. Elles changent toutes le comportement
des autorisations :

- `user_role` : 3 valeurs dans le repo, 6 en base ;
- `profiles.role` : TEXT + CHECK en base, enum dans le repo — conséquence
  concrète, les rôles `FISCAL_CONSULTANT` et `ACCOUNTANT` sont aujourd'hui
  inatteignables, donc le module douanes est de fait réservé aux admins ;
- `invoice_status` : `OVERDUE` seulement dans le repo ;
- `customs_files.assigned_partner_id` : référence `profiles` alors que ses
  policies le lisent tantôt comme `auth.uid()`, tantôt comme un
  `partner_profiles.id`. Même défaut que celui corrigé sur `import_requests`
  par `20260801130000`, mais côté douanes il n'est pas corrigé.

Deux tables portent RLS sans aucune policy, volontairement : `documents`
(vestige neutralisé) et `processed_stripe_events` (écrite uniquement par le
`service_role`).

## Scripts SQL hors migrations

`scripts/*.sql` contient des correctifs appliqués à la main par le passé
(`fix_profiles_recursion.sql`, `create_transactions_table.sql`, …). Leur contenu
est aujourd'hui couvert par les migrations ci-dessus ; ils peuvent être retirés
après vérification, pour ne garder qu'une seule source de vérité.
