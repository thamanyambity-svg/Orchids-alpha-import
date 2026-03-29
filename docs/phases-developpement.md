# Phases de développement — Alpha Import Exchange

> **Version :** 1.1  
> **Date :** 2026-03-29  
> **Règle transversale :** ne jamais mélanger grosse migration + grosse UI + RLS dans une seule PR.

---

## Phase 0 — Reproductibilité

**Objectif :** tout est vert sur `main` avant de toucher au code.

| Étape | Commande | Attendu |
|-------|----------|---------|
| 1 | `npm ci` | Installation sans erreur |
| 2 | `npm run typecheck` | 0 erreur TypeScript (`tsc --noEmit`) |
| 3 | `npm run test` | Tous les tests passent (`vitest run`) |
| 4 | `npm run lint` | 0 erreur ESLint (warnings tolérés) |
| 5 | `npm run build` | Build Next.js réussi |

Pipeline CI aligné : `.github/workflows/ci.yml` exécute ces 5 étapes dans l'ordre sur chaque push / PR vers `master` ou `main`.

**Critère de sortie :** les 5 commandes passent localement et en CI.

---

## Phase 1 — Schéma DB

**Objectif :** toute modification de la base de données est isolée, testable et cohérente.

### Règles

1. **Migrations uniquement** dans `supabase/migrations/` — nommées par timestamp (`YYYYMMDDHHMMSS_description.sql`).
2. Appliquer via `npx supabase db push` ou SQL Editor (voir `docs/security.md`).
3. **RLS** cohérent avec `docs/security.md` — chaque nouvelle table doit avoir ses politiques.
4. **Seeds** (données de référence) après les migrations de structure — respecter l'ordre des timestamps (cf. `docs/manifeste-consolidation-feat-financial-foundations.md`).
5. `CREATE TABLE IF NOT EXISTS` est un no-op si la table existe déjà avec un schéma différent — utiliser `ALTER TABLE` pour les modifications.

### Migrations existantes (ordre)

| Timestamp | Description |
|-----------|-------------|
| `20250308000001` | RLS policies |
| `20250308100001` | Inbound emails |
| `20260320140000` | Financial foundations |
| `20260322120000` | Financial foundations triggers |
| `20260323130000` | Payment proofs (Bloc E) |
| `20260324140000` | Transactions frozen exchange rate |
| `20260325100000` | Customs foundations |
| `20260325110000` | Customs billing system |
| `20260326120000` | Customs fiscal sprint 3 |
| `20260326120100` | Seed reference data |
| `20260326130000` | Customs messaging system |
| `20260326140000` | Customs messages read tracking |
| `20260328090000` | Reporting audit transactions |

**Critère de sortie :** migration appliquée, RLS vérifiée, aucun changement UI/API dans la même PR.

---

## Phase 2 — App & API

**Objectif :** implémenter la logique métier côté serveur et les intégrations.

### Périmètre

- **Guards** (`src/lib/server-actions/`) : `admin-guard.ts`, `client-guard.ts`, `customs-guard.ts`, `partner-guard.ts`, `request-meta.ts`.
- **Workflow** (`src/lib/workflow.ts`) : machine à états des demandes et commandes + tests (`src/lib/workflow.test.ts`).
- **API routes** (`src/app/api/`) : endpoints REST.
- **Intégrations** : n8n (`n8n_alpha_import_workflow.json`), webhooks.

### Règles

1. Tout nouveau guard ou action serveur doit suivre le pattern existant (session + vérification de rôle).
2. Toute modification de `workflow.ts` doit être accompagnée de tests dans `workflow.test.ts`.
3. Les intégrations n8n sont documentées dans `docs/n8n-workflow.md`.

**Critère de sortie :** typecheck + tests + lint passent, guard/API testé manuellement.

---

## Phase 3 — Qualité

**Objectif :** réduire la dette technique de façon incrémentale.

### Actions

| Action | Méthode |
|--------|---------|
| ESLint warnings | Traiter par lots (un dossier par PR) |
| `@typescript-eslint/no-explicit-any` | Remplacer `any` par des types stricts |
| CodeQL | Optionnel — ajouter `.github/workflows/codeql.yml` quand prêt |
| Tests unitaires | Ajouter des tests pour chaque nouveau module |

### État actuel

- 0 erreur ESLint, ~301 warnings (`@typescript-eslint/no-explicit-any` principalement).
- 17 tests workflow existants.

**Critère de sortie :** nombre de warnings réduit, aucune régression.

---

## Phase 4 — Métier

**Objectif :** fonctionnalités utilisateur finales.

### Périmètre

- **PDF** : factures, documents (`src/lib/pdf/`).
- **Recettes** : bloc douanes (`docs/recette-bloc-j-customs-billing.md`), messagerie.
- **UI** : pages Next.js, composants Radix/Shadcn.

### Règles

1. Les informations société (RCCM, adresse, etc.) sont centralisées dans `src/lib/pdf/invoice-pdf-types.ts`.
2. Chaque bloc métier a sa recette de test dans `docs/`.
3. ID Nat et IBAN restent en placeholder jusqu'à réception des documents officiels.

**Critère de sortie :** recette passée, PDF conforme, UI testée.

---

## Ordre de priorité pour les prochaines PR

```
Phase 0 (vérifier vert) → Phase 1 (si DB touchée) → Phase 2 (API/logique) → Phase 3 (qualité) → Phase 4 (métier)
```

Tout nouveau travail qui touche la base passe par la **Phase 1** avant le reste.

---

## Références

- CI : `.github/workflows/ci.yml`
- Sécurité / RLS : `docs/security.md`
- Manifeste financier : `docs/manifeste-consolidation-feat-financial-foundations.md`
- Recette douanes : `docs/recette-bloc-j-customs-billing.md`
- Workflow n8n : `docs/n8n-workflow.md`
- Email assistant : `docs/email-assistant.md`

---

## Instructions Cursor / Agent IA

> **Ce bloc est la directive obligatoire** à suivre après chaque implémentation.
> Copie-colle ce document comme contexte de conversation si nécessaire.

### Avant de commencer un travail

1. **Lis** `docs/phases-developpement.md` (ce fichier) en entier.
2. **Identifie la phase** concernée par la tâche demandée (0–4).
3. **Vérifie Phase 0** — exécute dans l'ordre :
   ```bash
   npm ci && npm run typecheck && npm run test && npm run lint && npm run build
   ```
   Si une commande échoue, **corrige d'abord** avant de passer à la tâche.

### Pendant l'implémentation

4. **Respecte la séparation des phases** — une PR = une seule phase.
   - ❌ Ne mélange jamais : migration SQL + composant UI + politique RLS dans la même PR.
   - ✅ Une PR de migration seule (Phase 1), puis une PR d'API/guard (Phase 2), etc.
5. **Phase 1 d'abord** — si la tâche touche la base de données, crée la migration *avant* tout code applicatif.
6. **Nomme les migrations** par timestamp : `YYYYMMDDHHMMSS_description.sql` dans `supabase/migrations/`.
7. **RLS obligatoire** — chaque nouvelle table doit avoir ses politiques, cohérentes avec `docs/security.md`.
8. **Tests obligatoires** — toute modification de `src/lib/workflow.ts` doit être accompagnée de tests dans `src/lib/workflow.test.ts`.

### Après l'implémentation

9. **Revalide Phase 0** — relance les 5 commandes :
   ```bash
   npm run typecheck && npm run test && npm run lint && npm run build
   ```
10. **Si lint échoue** → corrige les erreurs (0 erreur requis ; warnings tolérés).
11. **Si typecheck échoue** → corrige les types avant de committer.
12. **Si test échoue** → corrige ou mets à jour les tests.
13. **Résume ce qui a été fait** dans le message de commit et le corps de la PR :
    - Phase concernée (ex. `Phase 1 — migration buyer_profiles`)
    - Fichiers créés/modifiés
    - Critère de sortie atteint (ex. « migration appliquée, RLS vérifiée, CI vert »)

### Prochaine étape à indiquer

14. **Termine toujours** par un bloc « Prochaine étape suggérée » qui indique :
    - La phase suivante à enchaîner
    - Le fichier ou la fonctionnalité à traiter
    - Les pré-requis éventuels

**Exemple de bloc de fin :**

```
✅ Terminé : Phase 1 — migration buyer_profiles
   - Fichier : supabase/migrations/20260329100000_buyer_profiles.sql
   - RLS : politique ajoutée, cohérente avec docs/security.md
   - CI : typecheck ✓ test ✓ lint ✓ build ✓

➡️ Prochaine étape : Phase 2 — créer le guard `buyer-guard.ts`
   dans src/lib/server-actions/ suivant le pattern de admin-guard.ts.
   Pré-requis : la migration buyer_profiles doit être appliquée (db push).
```

### Règles absolues (ne jamais enfreindre)

| # | Règle |
|---|-------|
| R1 | Toujours valider Phase 0 avant ET après chaque implémentation |
| R2 | Une PR = une seule phase (pas de mélange migration + UI + RLS) |
| R3 | Phase 1 passe avant Phase 2 si la base est touchée |
| R4 | Chaque nouvelle table a sa RLS (cf. `docs/security.md`) |
| R5 | Chaque modification workflow a ses tests |
| R6 | Toujours terminer par le bloc « Prochaine étape suggérée » |
| R7 | Ne jamais supprimer ou ignorer des tests existants |
| R8 | Seeds après migrations de structure (respecter les timestamps) |
