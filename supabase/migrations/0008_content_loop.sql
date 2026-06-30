-- P0: close the content <-> lead loop. Track posted content performance (Outlier
-- Score) and tie it to leads by hook/angle, so we can answer "which hook/video
-- produced leads and sales" — the #1 objective. Plus perf indexes.

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete set null,
  campaign_id uuid references ad_campaigns(id) on delete set null,
  content_idea_id uuid,              -- optional link to a generated hook (content_ideas.id)
  hook text,                         -- the hook/angle used; matches leads.creative_angle
  platform text default 'TikTok',
  url text,
  posted_at date,
  views_48h int,
  account_avg_48h int,
  saves int,
  shares int,
  comments int,
  leads int default 0,
  outlier_score numeric,
  verdict text,
  created_at timestamptz default now()
);
alter table posts enable row level security;
drop policy if exists "approved full access" on posts;
create policy "approved full access" on posts for all to authenticated using (public.is_approved()) with check (public.is_approved());

-- perf indexes (P1 quick win — leads table is the hot path)
create index if not exists idx_leads_campaign on leads(campaign_id);
create index if not exists idx_leads_created on leads(created_at desc);
create index if not exists idx_leads_creative on leads(creative_angle);
create index if not exists idx_leads_score on leads(score);
create index if not exists idx_posts_company on posts(company_id);
create index if not exists idx_posts_outlier on posts(outlier_score desc);
