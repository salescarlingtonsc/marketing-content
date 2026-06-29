# Intake Questionnaire + AI Prompt Architecture

## Intake ("the ingredients") — `(R)` = required for MVP generation
**Business:** `(R)` name · industry · country · `(R)` what you sell (one line) · `(R)` price · margin% · sales cycle · CLV · revenue model · `(R)` biggest constraint (leads/closing/show-ups/trust).
**Audience:** `(R)` best past customer (age/gender/job/income/location) · platforms · `(R)` top 3 pre-purchase complaints · top 3 secret wants · #1 fear/objection · buying trigger.
**Offer & proof:** dream outcome · why they don't believe it · strongest proof · guarantee/risk-reversal.
**Competitors:** 3–5 handles · what they do well · their weakness (your wedge).
**Assets & ops:** footage/brand assets · who creates content · who responds + how fast · tools (CRM, ad accounts).
**Goal & budget:** `(R)` conversion goal · monthly budget · target CPL/CPA · lead volume target.
**Compliance:** `(R)` regulated? · banned phrases · required disclaimers · who signs off.
**Vertical add-ons:** finance (licence, products allowed, FNA, savings band, MAS/BSC), interior design/property (project type, value, timeline-as-intent), SaaS (tiers, trial, activation, ICP), recruitment (roles, side, fee model), coaching (offer ladder, authority).

## Shared system prompt (prepended to every module call)
"You are a top-1% growth strategist + performance marketer. Be specific, evidence-based, non-generic. Separate education from recommendation. NEVER output guarantees, returns claims, or financial advice; if the client is regulated, insert required disclaimers and flag risky phrases in a `compliance_flags` array. Optimise for QUALITY leads and CPQL, not views/CPL. Return STRICT JSON. If data is missing, list it in a `needs` array — never invent."

## Per-module prompts (inject `{{client}}` + prior outputs; return JSON)
1 Business → `{model_summary, clv, max_cpa, constraint}` · 2 Audience → `personas[]` · 3 Pain → `pains[]` (intensity×frequency) · 4 Desire → `desires[]` · 5 Offer → `{offer_statement, belief_gaps[]}` · 6 Competitor → `gap_map` · 7 Angle → `angles[]` · 8 Hook → `hooks[]`+flags · 9 Script → `scripts[]` · 10 Creative → `{shot_list, overlays, broll}` · 11 Magnet → `magnet[]` · 12 Giveaway → `{prize, qualifying_qs[]}` · 13 Targeting → `targeting` · 14 Lead form → `form` (+consent) · 15 Score → `{score, tier, breakdown[]}` (code computes) · 16 Follow-up → `sequence[]` · 17 Retargeting → `ladders[]` · 18 Conversion → `objection_scripts[]` (+FNA gate) · 19 Analytics → `dashboard` · 20 Iteration → `{new_weights, next_brief}`.

**Orchestration:** modules 1–6 run once per client (cached); 7–14 per campaign; 15–20 continuously on live data. Low temp for scoring/compliance, higher for hooks/angles. All finance outputs pass the compliance gate before save/publish.
