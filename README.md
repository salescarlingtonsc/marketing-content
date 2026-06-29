# Super Marketing Brain (`marketing-content`)

Reusable cross-industry marketing intelligence — **same backend logic, different ingredients, same soup.** A super-admin tool that turns any business into a leads-and-sales engine via one fixed pipeline with swappable inputs (audience, offer, pain, prize, platform, country, compliance, goal).

> **Separation:** this is a standalone product. It shares **no code and no database** with the renovation app (Cubbly), the BaZi app (Fated/Nestly), the advisor CRM (Sproutly), or the XAUUSD backtester. Its Supabase project is its own.

## Stack
- Vite + React + TypeScript
- Supabase (Postgres) — project `Marketing content` (ref `cribsxrkpxdzfdjjqyru`, ap-northeast-2), a dedicated standalone account

## Setup
```bash
npm install
cp .env.example .env.local   # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```
The home screen has a **Test database connection** button to confirm the schema is reachable.

## What's here
- `src/` — app scaffold (Supabase client + the 20-module list + a DB connectivity check).
- `supabase/migrations/0001_init.sql` — the 23-table schema (multi-tenant via `company_id`; RLS enabled deny-by-default).
- `docs/` — the strategy: framework, scoring models, content engine, finance compliance, intake + AI prompts.

## The system in one loop
**INGREDIENTS** (intake) → **LOGIC** (20 modules: audience → angles → hooks → scripts → calendar → ads → lead form → follow-up → conversion) → **SCORING** (Viral 0–100 before posting · Lead 0–100 before calling · CPQL before scaling) → **MEASURE** (content + ad + sales data) → **ITERATE** (re-weight, feed next cycle).

## Two standing gates before any live finance spend
1. **Legal sign-off** on the PDPA Do-Not-Call consent wording + MAS disclosures (the docs are research-grade, not legal advice). MAS Digital Advertising Guidelines take effect **25 Mar 2026** and hold the financial institution accountable for all content incl. finfluencer posts.
2. **Calibrate scoring weights** on the first client's real lead→sale data (Module 20). The default weights are sound starting points, not a validated edge.

## Status
v0.1 scaffold — schema live, app boots, strategy in `/docs`. Next: build Modules 1–10 generation (MVP), then lead ingestion + scoring + CAPI offline-conversion loop (Phase 2).
