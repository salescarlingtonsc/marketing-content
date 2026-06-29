-- Super Marketing Brain — initial schema (multi-tenant via company_id).
-- Money as numeric. Flexible fields as jsonb. RLS enabled deny-by-default
-- (no anon policies) — wire super-admin auth policies before exposing.

-- Core tenant + offer
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  country text,
  compliance_profile jsonb default '{}'::jsonb,
  brand_voice jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text,
  price numeric,
  margin_pct numeric,
  clv numeric,
  sales_cycle_days int,
  revenue_model text
);

-- Audience intelligence
create table if not exists audiences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  persona text,
  age_min int,
  age_max int,
  gender text,
  income_proxy text,
  job text,
  location text,
  platforms jsonb default '[]'::jsonb,
  pains jsonb default '[]'::jsonb,
  desires jsonb default '[]'::jsonb,
  fears jsonb default '[]'::jsonb,
  buying_triggers jsonb default '[]'::jsonb
);

create table if not exists avatars (
  id uuid primary key default gen_random_uuid(),
  audience_id uuid references audiences(id) on delete cascade,
  narrative text
);

create table if not exists pain_points (
  id uuid primary key default gen_random_uuid(),
  audience_id uuid references audiences(id) on delete cascade,
  label text,
  intensity int,
  frequency int
);

create table if not exists desires (
  id uuid primary key default gen_random_uuid(),
  audience_id uuid references audiences(id) on delete cascade,
  label text,
  identity_tag text,
  intensity int
);

-- Competitor + creator intelligence (swipe file)
create table if not exists competitors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  handle text,
  platform text,
  niche text,
  hooks jsonb default '[]'::jsonb,
  pillars jsonb default '[]'::jsonb,
  cadence text,
  strengths jsonb default '[]'::jsonb,
  weaknesses jsonb default '[]'::jsonb
);

create table if not exists creator_profiles (
  id uuid primary key default gen_random_uuid(),
  handle text,
  platform text,
  niche text,
  pillars jsonb default '[]'::jsonb,
  score int,
  notes text
);

create table if not exists viral_examples (
  id uuid primary key default gen_random_uuid(),
  url text,
  platform text,
  hook text,
  format text,
  why_worked text,
  metrics jsonb default '{}'::jsonb
);

create table if not exists hook_formulas (
  id uuid primary key default gen_random_uuid(),
  category text,
  formula text,
  why text
);

-- Content generation + performance
create table if not exists content_ideas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  angle text,
  pain_ref uuid,
  desire_ref uuid,
  format text,
  pillar text,
  viral_score int,
  score_breakdown jsonb default '{}'::jsonb,
  status text default 'draft'
);

create table if not exists video_scripts (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references content_ideas(id) on delete cascade,
  length_sec int,
  hook text,
  rehook text,
  body jsonb default '[]'::jsonb,
  proof text,
  cta text,
  onscreen_text jsonb default '[]'::jsonb,
  broll jsonb default '[]'::jsonb,
  caption text,
  viral_score int
);

create table if not exists ad_creatives (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  angle text,
  format text,
  asset_url text,
  copy text
);

create table if not exists ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  platform text,
  objective text,
  budget numeric,
  prize text,
  audience_id uuid references audiences(id),
  creative_id uuid references ad_creatives(id),
  started_at date
);

create table if not exists lead_forms (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references ad_campaigns(id) on delete cascade,
  fields jsonb default '[]'::jsonb,
  qualifying_qs jsonb default '[]'::jsonb,
  conditional_logic jsonb default '[]'::jsonb,
  higher_intent boolean default true,
  consent_text text  -- PDPA: explicit contact+marketing consent enables legal <5-min call
);

-- Leads + scoring + lifecycle
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  campaign_id uuid references ad_campaigns(id),
  source text,
  contact jsonb default '{}'::jsonb,
  answers jsonb default '{}'::jsonb,
  consent boolean default false,
  score int,
  tier text,
  first_response_at timestamptz,
  appt_booked boolean default false,
  appt_attended boolean default false,
  sold boolean default false,
  revenue numeric,
  created_at timestamptz default now()
);

create table if not exists lead_scoring (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  factor text,
  value text,
  weight numeric,
  points numeric
);

create table if not exists follow_up_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  channel text,
  sent_at timestamptz,
  message text,
  response text
);

create table if not exists sales_results (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  revenue numeric,
  reason_won text,
  reason_lost text,
  objections jsonb default '[]'::jsonb
);

-- Performance + learning loop
create table if not exists content_performance (
  id uuid primary key default gen_random_uuid(),
  script_id uuid references video_scripts(id) on delete cascade,
  platform text,
  views int,
  watch_time numeric,
  saves int,
  shares int,
  comments int,
  leads int,
  captured_at date
);

create table if not exists ad_performance (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references ad_campaigns(id) on delete cascade,
  date date,
  cpm numeric,
  ctr numeric,
  cpl numeric,
  cpql numeric,
  form_completion numeric,
  appt_rate numeric,
  show_up_rate numeric,
  close_rate numeric,
  roas numeric
);

create table if not exists experiments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  hypothesis text,
  variant_a text,
  variant_b text,
  metric text,
  winner text,
  learning text,
  created_at timestamptz default now()
);

create table if not exists compliance_rules (
  id uuid primary key default gen_random_uuid(),
  industry text,
  banned_phrases jsonb default '[]'::jsonb,
  required_disclaimers jsonb default '[]'::jsonb,
  approval_required boolean default false
);

-- Enable RLS on every table (deny-by-default; add super-admin policies when auth is wired).
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;
