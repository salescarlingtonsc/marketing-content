-- Learning loop spine: lead capture → scoring → outcomes → CPQL/sales rollup.
-- Extends existing leads + ad_campaigns; adds import/score/outcome/appt/sale/rec tables.
-- All new tables gated behind is_approved() (mirrors 0004/0005). No CAPI here.

-- 1) Extend leads: attribution + quality + lifecycle
alter table leads add column if not exists name text;
alter table leads add column if not exists phone text;
alter table leads add column if not exists email text;
alter table leads add column if not exists age int;
alter table leads add column if not exists birth_year int;
alter table leads add column if not exists gender text;
alter table leads add column if not exists monthly_savings numeric;
alter table leads add column if not exists savings_band text;       -- '1k+' | '500-1k' | '<500' | 'unknown'
alter table leads add column if not exists occupation text;
alter table leads add column if not exists investing_experience text;
alter table leads add column if not exists risk_appetite text;
alter table leads add column if not exists platform text;
alter table leads add column if not exists prize text;
alter table leads add column if not exists ad_name text;
alter table leads add column if not exists ad_set_name text;
alter table leads add column if not exists creative_angle text;
alter table leads add column if not exists hook_id uuid;
alter table leads add column if not exists form_name text;
alter table leads add column if not exists import_id uuid;
alter table leads add column if not exists status text default 'new';
alter table leads add column if not exists remarks text;
alter table leads add column if not exists consent_source text;
alter table leads add column if not exists response_time_min int;

-- 2) Reuse ad_campaigns as the campaign entity; add name + manual spend
alter table ad_campaigns add column if not exists name text;
alter table ad_campaigns add column if not exists spent numeric default 0;

-- 3) Import batches
create table if not exists lead_imports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete set null,
  campaign_id uuid references ad_campaigns(id) on delete set null,
  filename text,
  source text default 'csv_meta',         -- 'manual' | 'csv_meta' | 'api'
  row_count int default 0,
  mapping jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 4) Configurable scoring (per vertical / per company). NOT hardcoded.
create table if not exists scoring_configs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,  -- null = global default
  vertical text default 'investment',
  name text,
  weights jsonb not null default '{}'::jsonb,
  bands jsonb not null default '{}'::jsonb,
  tier_cutoffs jsonb not null default '{}'::jsonb,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- 5) Score snapshots (final score also denormalised on leads.score/tier)
create table if not exists lead_scores (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  config_id uuid references scoring_configs(id) on delete set null,
  score int,
  tier text,
  breakdown jsonb default '{}'::jsonb,
  scored_at timestamptz default now()
);

-- 6) Outcome event log (1-tap appends; current status denormalised on leads.status)
create table if not exists lead_outcomes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  status text not null,
  notes text,
  at timestamptz default now()
);

-- 7) Appointments
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  booked_at timestamptz default now(),
  appt_date timestamptz,
  channel text,
  showed_up boolean
);

-- 8) Sales outcomes (fresh; legacy sales_results left untouched/unused)
create table if not exists sales_outcomes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  product text,
  sold boolean default false,
  amount numeric,
  revenue numeric,
  reason_bought text,
  reason_not_buy text,
  objections jsonb default '[]'::jsonb,
  next_action_date date,
  created_at timestamptz default now()
);

-- 9) Weekly recommendations (MVP computes live too; table for persistence later)
create table if not exists learning_recommendations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  week text,
  type text,
  target_ref text,
  rationale text,
  evidence jsonb default '{}'::jsonb,
  confidence text,
  sample_n int,
  status text default 'open',
  created_at timestamptz default now()
);

-- RLS for new tables
do $$
declare t text;
begin
  for t in select unnest(array[
    'lead_imports','scoring_configs','lead_scores','lead_outcomes',
    'appointments','sales_outcomes','learning_recommendations'
  ]) loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "approved full access" on public.%I;', t);
    execute format('create policy "approved full access" on public.%I for all to authenticated using (public.is_approved()) with check (public.is_approved());', t);
  end loop;
end $$;

-- Seed the default investment/insurance scoring config (savings-weighted)
insert into scoring_configs (company_id, vertical, name, weights, bands, tier_cutoffs, is_default)
select null, 'investment', 'Default - Investment/Insurance (SG)',
  '{"monthly_savings":30,"age_fit":15,"occupation":12,"investing_experience":8,"response_speed":10,"appt_willingness":10,"giveaway_only_penalty":15}'::jsonb,
  '{"savings":{"high":1000,"mid":500},"age":{"primeMin":25,"primeMax":45,"youngMax":24,"oldMin":55}}'::jsonb,
  '{"hot":80,"warm":60,"nurture":40}'::jsonb,
  true
where not exists (select 1 from scoring_configs where is_default = true);
