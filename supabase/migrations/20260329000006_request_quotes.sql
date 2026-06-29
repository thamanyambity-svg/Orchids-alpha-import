-- Cotation soumise par le partenaire pour une demande, validée par l'admin.
create table if not exists public.request_quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.import_requests(id) on delete cascade,
  submitted_by uuid references public.profiles(id),
  status text not null default 'DRAFT' check (status in ('DRAFT','SUBMITTED','APPROVED','REJECTED')),
  -- cargo
  gross_weight_kg numeric,
  volume_cbm numeric,
  packages integer,
  dimensions text,
  -- expédition
  transport_mode text check (transport_mode in ('SEA_FCL','SEA_LCL','AIR','LAND')),
  incoterm text check (incoterm in ('FOB','CIF','EXW','DDP','DAP','CFR')),
  carrier text,
  etd date,
  eta date,
  validity_date date,
  -- prix (USD)
  goods_cost numeric default 0,
  freight_cost numeric default 0,
  insurance_cost numeric default 0,
  local_fees numeric default 0,
  total_amount numeric default 0,
  notes text,
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_request_quotes_request on public.request_quotes(request_id);

alter table public.request_quotes enable row level security;

-- Partenaire assigné : CRUD sur les cotations de ses demandes
drop policy if exists "rq_partner" on public.request_quotes;
create policy "rq_partner" on public.request_quotes for all using (
  request_id in (
    select id from public.import_requests
    where assigned_partner_id in (select id from public.partner_profiles where user_id = auth.uid())
  )
);
-- Acheteur : lecture des cotations de ses demandes
drop policy if exists "rq_buyer_read" on public.request_quotes;
create policy "rq_buyer_read" on public.request_quotes for select using (
  request_id in (select id from public.import_requests where buyer_id = auth.uid())
);
-- Admin : tout
drop policy if exists "rq_admin" on public.request_quotes;
create policy "rq_admin" on public.request_quotes for all using (public.get_user_role() = 'ADMIN');

drop trigger if exists trg_request_quotes_updated on public.request_quotes;
create trigger trg_request_quotes_updated before update on public.request_quotes
  for each row execute procedure public.update_modified_column();
