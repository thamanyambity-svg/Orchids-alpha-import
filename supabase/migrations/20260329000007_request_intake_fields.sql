-- Champs standard international pour l'intake de demande (douane, valeur, incoterm,
-- assurance, acceptation CGV). Tous nullables (compat données existantes).
alter table public.import_requests
  add column if not exists hs_code text,
  add column if not exists declared_value numeric,
  add column if not exists declared_currency text default 'USD',
  add column if not exists gross_weight_kg numeric,
  add column if not exists volume_cbm numeric,
  add column if not exists packages integer,
  add column if not exists incoterm text,
  add column if not exists insurance_requested boolean default false,
  add column if not exists cgv_accepted_at timestamptz;
