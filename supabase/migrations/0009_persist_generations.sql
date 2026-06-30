-- Persist the full AI generation so the brain accumulates instead of forgetting.
create table if not exists generations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  intake jsonb,
  hooks jsonb,
  script jsonb,
  ad_copy jsonb,
  lead_magnet jsonb,
  follow_up jsonb,
  objections jsonb,
  created_at timestamptz default now()
);
alter table generations enable row level security;
drop policy if exists "approved full access" on generations;
create policy "approved full access" on generations for all to authenticated using (public.is_approved()) with check (public.is_approved());
create index if not exists idx_generations_company on generations(company_id, created_at desc);
