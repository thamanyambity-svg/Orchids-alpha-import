# Guide de recette — Bloc J (passage douane → facture)

Environnement : Supabase local ou staging, données de test réelles.

## R-01 — Préconditions bloquantes

Vérifier que `generateInvoiceFromCustoms` échoue proprement sur chaque précondition.

| Cas | Données | Résultat attendu |
|-----|---------|------------------|
| Dossier DRAFT | `customs_files.status = 'DRAFT'` | Message « Impossible de facturer un dossier en brouillon » |
| Pas de déclaration | Dossier sans déclaration | Message « Aucune déclaration douanière trouvée… » |
| Déclaration non validée | `is_fiscal_validated = false` | Message « La déclaration doit être validée fiscalement… » |
| Facture active existante | Facture non `CANCELLED` déjà présente | Message « Une facture active existe déjà… » |
| Zéro ligne fiscale | Déclaration validée sans lignes | Message « Aucune ligne fiscale saisie… » |

**SQL après chaque tentative d’échec :**

```sql
SELECT COUNT(*) FROM customs_invoices
WHERE customs_file_id = '<test_file_id>'
  AND status <> 'CANCELLED';
-- Attendu : 0
```

## R-02 — Cohérence des arrondis

```sql
SELECT
  ci.invoice_number,
  ci.subtotal_disbursements_usd,
  ci.subtotal_fees_usd,
  ci.total_usd,
  SUM(CASE WHEN ii.item_type = 'DISBURSEMENT'
           THEN ii.line_total_usd ELSE 0 END) AS recalc_disb,
  SUM(CASE WHEN ii.item_type <> 'DISBURSEMENT'
           THEN ii.line_total_usd ELSE 0 END) AS recalc_fees,
  SUM(ii.line_total_usd) AS recalc_total
FROM customs_invoices ci
JOIN invoice_items ii ON ii.invoice_id = ci.id
WHERE ci.customs_file_id = '<test_file_id>'
GROUP BY ci.id;
```

Assertions : `recalc_disb = subtotal_disbursements_usd`, `recalc_fees = subtotal_fees_usd`, `recalc_total = total_usd`.

```sql
SELECT
  cd.total_taxes_usd AS declared_total,
  ci.subtotal_disbursements_usd AS invoiced_disb,
  ABS(cd.total_taxes_usd - ci.subtotal_disbursements_usd) AS gap
FROM customs_declarations cd
JOIN customs_files cf ON cf.id = cd.customs_file_id
JOIN customs_invoices ci ON ci.customs_file_id = cf.id
WHERE cf.id = '<test_file_id>'
  AND ci.status <> 'CANCELLED';
```

Assertion : `gap < 0.005` (tolérance côté action).

## R-03 — Grille tarifaire (honoraires)

| Valeur déclarée | Commission attendue |
|-----------------|---------------------|
| 5 000 USD | 200 USD (plancher) |
| 15 000 USD | 300 USD |
| 120 000 USD | 2 000 USD (plafond) |

```sql
SELECT label, unit_price_usd, line_total_usd
FROM invoice_items
WHERE invoice_id = '<invoice_id>'
  AND item_type = 'SERVICE_FEE';

SELECT label, unit_price_usd
FROM invoice_items
WHERE invoice_id = '<invoice_id>'
  AND item_type = 'FILE_FEE';
-- FILE_FEE : 150 USD
```

## R-04 — Immuabilité PAID

```sql
UPDATE customs_invoices SET status = 'PAID' WHERE id = '<invoice_id>';

UPDATE customs_invoices SET notes = 'test' WHERE id = '<invoice_id>';
-- Attendu : erreur P0001

UPDATE invoice_items SET line_total_usd = 0 WHERE invoice_id = '<invoice_id>';
-- Attendu : erreur P0001 (recalc)

UPDATE customs_invoices SET status = 'CANCELLED' WHERE id = '<invoice_id>';
-- Attendu : succès, `cancelled_at` renseigné
```

## R-05 — Idempotence

1. Premier appel `generateInvoiceFromCustoms({ customsFileId })` → `success === true`.
2. Deuxième appel → `success === false`, message contenant « Une facture active existe déjà ».

```sql
SELECT COUNT(*) FROM customs_invoices
WHERE customs_file_id = '<test_file_id>'
  AND status <> 'CANCELLED';
-- Attendu : 1
```

Tentative d’INSERT directe en doublon (même dossier, statut actif) → erreur sur la contrainte `uq_one_active_invoice_per_file`.
