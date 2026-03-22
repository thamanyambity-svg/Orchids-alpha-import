# Manifeste de consolidation — `feat/financial-foundations`

## 1. Migration de données de référence

| Fichier | Rôle |
|--------|------|
| `supabase/migrations/20260326120100_seed_reference_data.sql` | 7 types de taxes douanières (UPSERT sur `code`) + taux USD→CDF 2800 si aucun taux actif |

**Ordre d’application :** après `20260326120000_customs_fiscal_sprint3.sql` (colonnes `description`, `default_rate_percent`, `is_active` sur `customs_tax_types`).

> **Note :** un fichier nommé `20260325120000_seed_reference_data.sql` s’exécuterait *avant* le sprint 3 fiscal et ferait échouer l’INSERT. Le timestamp `20260326120100` garantit l’ordre correct.

**Taux :** mise à jour ultérieure via l’action `createExchangeRate()` (supersession automatique des lignes précédentes).

---

## 2. Résumé des guards — `src/lib/server-actions/`

### Fichiers existants

**`admin-guard.ts`**

- `requireAdmin()` → session + `profiles.role === 'ADMIN'`
- Retour : `{ success, data: { supabase, userId, role } }` (pas d’objet `user` dans `data`)
- Usage : blocs admin, facturation douanière, etc.

**`client-guard.ts`**

- `requireAuthenticatedUser()` — utilisateur connecté (tout rôle)
- `verifyOrderOwnership(orderId, userId)` — `orders` → `import_requests.buyer_id`
- `getActiveTransactionForOrder(orderId)` — transaction `PENDING` (selon implémentation actuelle)

**`customs-guard.ts`**

- `requireCustomsRole()` — `ADMIN`, `PARTNER`, `PARTNER_COUNTRY`, `FISCAL_CONSULTANT`, `ACCOUNTANT`
- `verifyCustomsFileAccess(fileId, userId, role)`
- `verifyTransitionAllowed(from, to, role)` — délègue à `src/lib/customs/transition-matrix.ts`
- `normalizeCustomsActorRole(role)` — ex. `PARTNER` → `PARTNER_COUNTRY` pour la matrice

**`request-meta.ts`** (utilitaire)

- `getRequestMeta()` — IP + `User-Agent` (headers Next.js)

### `partner-guard.ts` (Sprint K-1)

- `requirePartner()` → `{ userId, partnerProfileId, role, supabase }`
- `verifyPartnerFileAccess(fileId, partnerProfileId, supabase)` → booléen

À réutiliser progressivement dans les pages `/partner/*` pour remplacer le pattern inline.

---

## 3. Messagerie douanière — avis architecture

- **Messagerie générale :** table `messages` (RLS participants), Realtime existant.
- **Recommandation :** table dédiée **`customs_file_messages`** (ou `customs_file_messages`) liée à `customs_files`, RLS alignée sur les participants du dossier, Realtime sur le même modèle que `messages`.
- **À éviter :** colonne nullable `customs_file_id` sur `messages` (mélange de contextes, RLS plus difficile pour rôles type `FISCAL_CONSULTANT`).

---

## 4. Checklist avant merge `master`

1. Appliquer toutes les migrations dans l’ordre des timestamps (dont seed `20260326120100`).
2. Recette Bloc J : `docs/recette-bloc-j-customs-billing.md` (R-01 à R-05) sur staging.
3. Ensuite : branche type `feat/bloc-k-messaging` — premier livrable suggéré : `partner-guard.ts` + migration `customs_file_messages`.
