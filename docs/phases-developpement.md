# Phases de développement — schéma à respecter

Ce document fixe **l’ordre logique** des chantiers pour éviter les allers-retours (DB / CI / qualité / métier).  
Les détails techniques restent dans les fichiers pointés ci-dessous.

---

## Phase 0 — Reproductibilité (obligatoire avant tout nouveau gros lot)

| Étape | Action | Critère de sortie |
|-------|--------|-------------------|
| 0.1 | `npm ci` | Installation sans erreur |
| 0.2 | `npm run typecheck` | 0 erreur TypeScript |
| 0.3 | `npm run test` | Tous les tests Vitest verts |
| 0.4 | `npm run lint` | 0 erreur ESLint (warnings tolérés temporairement) |
| 0.5 | Build avec env factices (comme la CI) | `next build` OK |

**Référence CI :** `.github/workflows/ci.yml` (ordre : `typecheck` → `test` → `lint` → `build`).

---

## Phase 1 — Schéma base de données (source de vérité)

| Étape | Action | Critère de sortie |
|-------|--------|-------------------|
| 1.1 | Nouvelle évolution **uniquement** via `supabase/migrations/*.sql` | Fichier daté, idempotent si possible (`IF NOT EXISTS`, etc.) |
| 1.2 | `supabase db push` (ou pipeline équivalent) sur l’environnement cible | Pas d’erreur, historique `schema_migrations` cohérent |
| 1.3 | Vérifier la cohérence **RLS** avec `docs/security.md` | Politiques alignées avec les routes / service role |

**Rappels :** ordre des seeds et dépendances entre migrations — voir `docs/manifeste-consolidation-feat-financial-foundations.md`.

---

## Phase 2 — Logique applicative & API

| Étape | Action | Critère de sortie |
|-------|--------|-------------------|
| 2.1 | Guards serveur (`admin-guard`, `client-guard`, `customs-guard`, etc.) | Pas de contournement RLS côté client pour les données sensibles |
| 2.2 | Actions / routes qui touchent le workflow | S’appuyer sur `src/lib/workflow.ts` + tests dans `*.test.ts` |
| 2.3 | Intégrations (n8n, webhooks) | Documentées ; secrets uniquement en env / secrets hébergeur |

**Référence :** `docs/n8n-workflow.md`, `docs/security.md`.

---

## Phase 3 — Qualité progressive (après stabilité Phases 0–2)

| Étape | Action | Critère de sortie |
|-------|--------|-------------------|
| 3.1 | Réduire les warnings ESLint par domaine (ex. `no-explicit-any` sur un module) | PR ciblée, pas de régression typecheck/test |
| 3.2 | (Optionnel) Analyse CodeQL GitHub | Workflow dédié sous `.github/workflows/` |
| 3.3 | (Optionnel) Tests d’intégration ou E2E sur flux critiques | Stratégie documentée dans la PR |

---

## Phase 4 — Métier & contenu

| Étape | Action | Critère de sortie |
|-------|--------|-------------------|
| 4.1 | Contenus légaux / PDF (ex. ID Nat, IBAN dans `invoice-pdf-types`) | Placeholders remplacés par les valeurs validées métier |
| 4.2 | Recette utilisateur par bloc | Ex. `docs/recette-bloc-j-customs-billing.md` |

---

## Règle transversale

**Ne pas** mélanger dans une même PR : une grosse migration DB **et** une refonte UI **et** un changement de politique RLS sans recette. Découper selon les phases ci-dessus.

---

## Suite immédiate recommandée (ordre)

1. S’assurer que la **Phase 0** est verte sur la branche principale après dernier push.  
2. Toute nouvelle fonctionnalité commence par **Phase 1** si elle touche aux données.  
3. Ensuite **Phase 2**, puis **Phase 3** en petites itérations, puis **Phase 4** selon les livrables métier.
