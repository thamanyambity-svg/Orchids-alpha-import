-- =============================================================================
-- Données de référence — Environnement prêt à l’emploi
-- Fichier : 20260326120100 (après customs_fiscal_sprint3 : colonnes tax_types)
-- Dépend aussi de : customs_billing_system, financial_foundations (+ triggers taux)
-- =============================================================================
-- Idempotent : UPSERT sur customs_tax_types (code) ; taux USD→CDF si aucun actif.
-- =============================================================================

-- ─── Référentiel taxes douanières RDC (indicatif métier) ─────────────────────

INSERT INTO public.customs_tax_types
  (code, label, description, default_rate_percent, is_active)
VALUES
  (
    'DROIT_ENT',
    'Droits d''entrée',
    'Droits de douane à l''importation — taux variable selon nomenclature SH',
    10.0,
    true
  ),
  (
    'TVA_IMP',
    'TVA à l''importation',
    'Taxe sur la valeur ajoutée — 16 % sur valeur CIF + droits d''entrée',
    16.0,
    true
  ),
  (
    'OCC',
    'Office Congolais de Contrôle',
    'Redevance d''inspection et de certification des marchandises',
    2.0,
    true
  ),
  (
    'OGEFREM',
    'Office de Gestion du Fret Maritime',
    'Redevance sur le fret maritime entrant',
    0.59,
    true
  ),
  (
    'RAV',
    'Redevance Administrative',
    'Redevance administrative générale à l''importation',
    0.5,
    true
  ),
  (
    'RLS',
    'Redevance de Liquidation Spéciale',
    'Taxe complémentaire applicable à certaines catégories de produits',
    1.0,
    true
  ),
  (
    'FPI',
    'Fonds de Promotion de l''Industrie',
    'Contribution au Fonds de Promotion de l''Industrie Congolaise',
    2.0,
    true
  )
ON CONFLICT (code) DO UPDATE
  SET
    label                = EXCLUDED.label,
    description          = EXCLUDED.description,
    default_rate_percent = EXCLUDED.default_rate_percent,
    is_active            = EXCLUDED.is_active;

-- ─── Réconciliation schéma exchange_rates ──────────────────────────────────────
-- La table peut préexister avec un schéma différent (ex. set_by NOT NULL,
-- pas de effective_at).  On aligne les colonnes attendues avant l'INSERT.

ALTER TABLE public.exchange_rates
  ADD COLUMN IF NOT EXISTS effective_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.exchange_rates
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

ALTER TABLE public.exchange_rates
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Si set_by existe avec NOT NULL, le rendre nullable (le seed n'a pas d'acteur).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'exchange_rates'
       AND column_name  = 'set_by'
       AND is_nullable  = 'NO'
  ) THEN
    ALTER TABLE public.exchange_rates ALTER COLUMN set_by DROP NOT NULL;
  END IF;
END $$;

-- ─── Taux initial USD → CDF (indicatif mars 2026) ────────────────────────────
-- Pas de contrainte UNIQUE sur (from_currency, to_currency) : insertion
-- conditionnelle si aucune ligne « active » (superseded_at IS NULL) pour cette paire.

INSERT INTO public.exchange_rates
  (from_currency, to_currency, rate, effective_at, created_at)
SELECT
  'USD',
  'CDF',
  2800.00,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
    FROM public.exchange_rates er
   WHERE er.from_currency = 'USD'
     AND er.to_currency = 'CDF'
     AND er.superseded_at IS NULL
);

-- ─── Vérification post-insertion ─────────────────────────────────────────────

DO $$
DECLARE
  v_tax_count  INT;
  v_rate_count INT;
BEGIN
  SELECT COUNT(*) INTO v_tax_count
    FROM public.customs_tax_types
   WHERE is_active = true;

  SELECT COUNT(*) INTO v_rate_count
    FROM public.exchange_rates
   WHERE superseded_at IS NULL;

  IF v_tax_count < 7 THEN
    RAISE WARNING 'customs_tax_types : % lignes actives (attendu : 7)', v_tax_count;
  ELSE
    RAISE NOTICE 'OK — customs_tax_types : % types actifs', v_tax_count;
  END IF;

  IF v_rate_count = 0 THEN
    RAISE WARNING 'exchange_rates : aucun taux actif trouvé';
  ELSE
    RAISE NOTICE 'OK — exchange_rates : % taux avec superseded_at NULL', v_rate_count;
  END IF;
END $$;
