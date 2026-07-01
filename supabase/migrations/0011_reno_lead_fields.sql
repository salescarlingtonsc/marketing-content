-- 0011_reno_lead_fields.sql
-- Added 2026-07-01. ADDITIVE ONLY — all columns nullable, no data touched.
-- Purpose: reno-vertical lead-capture fields (the leads table was finance-shaped).
-- Applied to Supabase project cribsxrkpxdzfdjjqyru via Management API query endpoint.
-- At apply time public.leads held 0 rows (verified before & after).

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS property_type           text,  -- BTO / resale / condo / landed
  ADD COLUMN IF NOT EXISTS flat_type               text,  -- 3-room / 4-room / 5-room / exec / condo unit
  ADD COLUMN IF NOT EXISTS key_or_mop_date         date,  -- key collection or MOP date
  ADD COLUMN IF NOT EXISTS reno_timeline           text,  -- <3mo / 3-6mo / 6-12mo / >12mo
  ADD COLUMN IF NOT EXISTS budget_band             text,  -- <30k / 30-50k / 50-80k / 80k+
  ADD COLUMN IF NOT EXISTS floorplan_url           text,  -- set later; private storage only
  ADD COLUMN IF NOT EXISTS preferred_contact_time  text,
  ADD COLUMN IF NOT EXISTS template                text,  -- content template that produced the lead
  ADD COLUMN IF NOT EXISTS posted_url              text;  -- source post URL

-- ===== ROLLBACK (if ever needed) =====
-- ALTER TABLE public.leads
--   DROP COLUMN IF EXISTS property_type,
--   DROP COLUMN IF EXISTS flat_type,
--   DROP COLUMN IF EXISTS key_or_mop_date,
--   DROP COLUMN IF EXISTS reno_timeline,
--   DROP COLUMN IF EXISTS budget_band,
--   DROP COLUMN IF EXISTS floorplan_url,
--   DROP COLUMN IF EXISTS preferred_contact_time,
--   DROP COLUMN IF EXISTS template,
--   DROP COLUMN IF EXISTS posted_url;
