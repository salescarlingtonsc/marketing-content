-- 0012_post_approval.sql
-- Approval workflow on posts: generate → pending_approval → approved/rejected → posted.
-- ADDITIVE ONLY (nullable columns + safe default). No data touched. RLS unchanged
-- (posts already has own-or-owner from 0010).
--
-- ⛔ NOT applied by the agent. Owner runs this in the Supabase SQL editor
--    (project cribsxrkpxdzfdjjqyru) per the production-write approval gate.

alter table public.posts
  add column if not exists status text default 'draft',
  -- 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'posted'
  add column if not exists caption text,
  add column if not exists script text,
  add column if not exists cta text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists media_url text,
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_reason text;

create index if not exists idx_posts_status on public.posts(status);

-- ===== ROLLBACK =====
-- alter table public.posts
--   drop column if exists status,
--   drop column if exists caption,
--   drop column if exists script,
--   drop column if exists cta,
--   drop column if exists scheduled_at,
--   drop column if exists media_url,
--   drop column if exists approved_by,
--   drop column if exists approved_at,
--   drop column if exists rejected_reason;
-- drop index if exists idx_posts_status;
