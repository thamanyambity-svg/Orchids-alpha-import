-- =============================================================================
-- BASE SCHEMA (reconstruction Plan B) — Alpha Import Exchange
-- Crée les tables coeur absentes du repo (vivaient seulement en remote/scripts).
-- DOIT s'exécuter EN PREMIER (avant RLS, customs, financial_foundations, etc.).
-- TEXT + CHECK plutôt qu'ENUM pour souplesse ; gen_random_uuid() (pgcrypto).
-- =============================================================================

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- helper updated_at (référencé par scripts/triggers)
create or replace function public.update_modified_column()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ---------------------------------------------------------------- countries
create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  region text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'BUYER' check (role in ('BUYER','PARTNER','ADMIN')),
  status text not null default 'PENDING' check (status in ('PENDING','VERIFIED','SUSPENDED')),
  email text,
  phone text,
  full_name text,
  company_name text,
  country_id uuid references public.countries(id),
  city text,
  avatar_url text,
  mfa_enabled boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------- buyer_profiles
create table if not exists public.buyer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete cascade,
  activity_type text,
  kyc_status text default 'NOT_STARTED' check (kyc_status in ('NOT_STARTED','IN_PROGRESS','VERIFIED','REJECTED')),
  kyc_documents jsonb default '[]'::jsonb,
  total_orders integer default 0,
  total_spent numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------- partner_profiles
create table if not exists public.partner_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  country_id uuid references public.countries(id),
  assigned_cities text[] default '{}',
  contract_status text default 'PENDING' check (contract_status in ('PENDING','ACTIVE','SUSPENDED','TERMINATED')),
  deposit_amount numeric default 0,
  commission_rate numeric default 0.10,
  performance_score numeric default 0,
  total_orders_handled integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------- import_requests
create table if not exists public.import_requests (
  id uuid primary key default gen_random_uuid(),
  reference text unique,
  buyer_id uuid references public.profiles(id) on delete cascade,
  country_id uuid references public.countries(id),
  buyer_country text,
  category text,
  product_name text,
  transport_mode text,
  specifications jsonb default '{}'::jsonb,
  quantity numeric,
  unit text,
  budget_min numeric,
  budget_max numeric,
  deadline timestamptz,
  status text default 'PENDING',
  assigned_partner_id uuid references public.partner_profiles(id),
  admin_notes text,
  last_reminded_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------- orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text unique,
  request_id uuid references public.import_requests(id) on delete cascade,
  total_amount numeric default 0,
  alpha_commission numeric default 0,
  partner_payout numeric default 0,
  status text default 'PENDING',
  validated_by_admin boolean default false,
  execution_deadline timestamptz,
  notes text,
  deposit_amount numeric,
  balance_amount numeric,
  deposit_paid boolean default false,
  balance_paid boolean default false,
  is_frozen boolean default false,
  escrow_activated boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------- payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  type text check (type in ('DEPOSIT_60','BALANCE_40')),
  amount numeric,
  currency text default 'USD',
  status text default 'PENDING' check (status in ('PENDING','BLOCKED','RELEASED','REFUNDED')),
  payment_method text,
  transaction_ref text,
  paid_at timestamptz,
  released_at timestamptz,
  released_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------- request_documents
create table if not exists public.request_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.import_requests(id) on delete cascade,
  service text,
  type text,
  file_url text,
  file_name text,
  file_size bigint,
  uploaded_by uuid references public.profiles(id),
  status text default 'PENDING',
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------- messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.import_requests(id) on delete cascade,
  sender_id uuid references public.profiles(id),
  recipient_id uuid references public.profiles(id),
  content text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------- notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text,
  body text,
  type text,
  link text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------- audit_logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_type text,
  target_id text,
  details jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------- suppliers
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partner_profiles(id) on delete cascade,
  name text not null,
  contact_email text,
  contact_phone text,
  address text,
  legal_docs jsonb default '[]'::jsonb,
  capacity text,
  status text default 'ACTIVE' check (status in ('ACTIVE','RESTRICTED','SUSPENDED')),
  validated_by_admin boolean default false,
  admin_notes text,
  rating numeric default 0,
  sector text,
  territory text,
  application_status text default 'APPROVED' check (application_status in ('APPROVED','PENDING','REJECTED')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------- transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id),
  user_id uuid references public.profiles(id),
  amount numeric not null,
  currency varchar(3) default 'USD',
  type varchar(20) check (type in ('DEPOSIT','BALANCE','REFUND','ADJUSTMENT')),
  status varchar(20) default 'PENDING' check (status in ('PENDING','SUCCEEDED','FAILED')),
  stripe_payment_id text,
  provider varchar(20) default 'STRIPE',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------- incidents
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  type text not null check (type in ('LOSS','DELAY','NON_CONFORMITY','FRAUD')),
  description text not null,
  status text default 'OPEN' check (status in ('OPEN','UNDER_REVIEW','FROZEN','RESOLVED','CANCELLED')),
  reported_by uuid references public.profiles(id),
  decision text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  compensation_amount numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------- financial_ledger
create table if not exists public.financial_ledger (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id),
  actor uuid references public.profiles(id),
  entry_type text not null check (entry_type in ('DEPOSIT','RELEASE','COMMISSION','REFUND','FREEZE')),
  amount numeric not null,
  currency text default 'USD',
  status text default 'EXECUTED' check (status in ('BLOCKED','AUTHORIZED','EXECUTED')),
  description text,
  authorized_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------- partner_applications
create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  company_name text not null,
  phone text,
  company_details jsonb default '{}'::jsonb,
  documents jsonb default '[]'::jsonb,
  agreements jsonb default '{}'::jsonb,
  status text default 'PENDING' check (status in ('PENDING','APPROVED_KYC','DEPOSIT_PAID','ACTIVE','REJECTED')),
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------- contact_messages
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  type text not null check (type in ('INSTITUTIONAL','OTHER')),
  status text default 'PENDING' check (status in ('PENDING','READ','PROCESSED')),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------- tracking_events
create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.import_requests(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  status text not null,
  location text not null,
  description text,
  event_date timestamptz default now(),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['profiles','buyer_profiles','partner_profiles','import_requests','orders','suppliers','transactions','incidents','partner_applications']
  loop
    execute format('drop trigger if exists trg_%s_updated on public.%I', t, t);
    execute format('create trigger trg_%s_updated before update on public.%I for each row execute procedure public.update_modified_column()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------- seed countries (corridors)
insert into public.countries (code, name, region, is_active) values
  ('CD','République Démocratique du Congo','Africa',true),
  ('CN','Chine','Asia',true),
  ('AE','Émirats Arabes Unis','Middle East',true),
  ('TR','Turquie','Europe/Asia',true),
  ('TH','Thaïlande','Asia',true),
  ('JP','Japon','Asia',true)
on conflict (code) do nothing;
