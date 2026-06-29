-- Seed the REUSABLE reference library only (same across every client).
-- Client-specific tables (companies, audiences, leads, ...) stay EMPTY by design — no fabricated data.
-- Each block is guarded (only seeds when the table is empty) so re-running is safe.

-- 1) Hook formulas (20)
insert into hook_formulas (category, formula, why)
select * from (values
  ('Curiosity','The real reason [X] happens...','opens a curiosity gap'),
  ('Fear','If you [X], you are losing [Y]','loss aversion'),
  ('Mistake','Stop [doing X]','pattern break + loss aversion'),
  ('Contrarian','Everyone says [X]. They are wrong.','pattern interrupt + ego'),
  ('Before/After','From [A] to [B] in [time]','transformation / aspiration'),
  ('Status','What [top group] do differently','aspiration'),
  ('Money','How I or they made or saved [amount]','specificity'),
  ('Lifestyle','[dream scene] - here is how','identity'),
  ('Identity','If you are a [audience]...','relevance / identity'),
  ('Pain-point','[name the pain in 3 words]','instant relevance'),
  ('Secret reveal','Nobody tells you this about [X]','insider / curiosity'),
  ('Case study','How [name] got [result]','proof'),
  ('Authority','I have done [N]; here is the number 1 lesson','trust'),
  ('Comparison','[A] vs [B]: which wins','decision aid'),
  ('Nobody tells you','The thing no one mentions about [X]','insider'),
  ('Most get wrong','Most people get [X] wrong','ego + curiosity'),
  ('If you are [audience]','If you are [X], watch this','targeting'),
  ('Wish I knew','I wish I knew this at [stage]','regret / relatability'),
  ('Stop doing this','Stop [common behaviour]','loss aversion'),
  ('Why not working','This is why [X] is not working','diagnosis')
) as v(category, formula, why)
where not exists (select 1 from hook_formulas);

-- 2) Compliance rules (finance = MAS/PDPA-aware; general)
insert into compliance_rules (industry, banned_phrases, required_disclaimers, approval_required)
select * from (values
  ('finance',
   '["guaranteed returns","risk-free","assured profit","cannot lose","no risk","get rich","you should buy","promised returns"]'::jsonb,
   '["Educational only, not financial advice.","Past performance is not indicative of future results.","Speak to a licensed adviser and complete an FNA before deciding."]'::jsonb,
   true),
  ('general',
   '["fabricated stats","fake testimonial","unverified claim"]'::jsonb,
   '[]'::jsonb,
   false)
) as v(industry, banned_phrases, required_disclaimers, approval_required)
where not exists (select 1 from compliance_rules);

-- 3) Creator profiles (mechanics + reuse note; scores via the Creator/Profile model)
insert into creator_profiles (handle, platform, niche, pillars, score, notes)
select * from (values
  ('Alex Hormozi','YouTube/IG/TikTok','business / offers / lead-gen','["offers","lead-gen","sales","mindset"]'::jsonb,95,'Gives the full framework free; value equation; radical transparency with real numbers. Reuse as the Offer Positioning engine.'),
  ('Graham Stephan','YouTube','personal finance / real estate','["money math","investing","real estate"]'::jsonb,88,'Evergreen explain-the-math format, real receipts. NOTE: his casual prescriptive framing would breach SG MAS no-advice-before-FNA; keep educational.'),
  ('Ryan Serhant','IG/TikTok/YouTube','luxury real estate','["listings as content","founder brand"]'::jsonb,90,'Treats content AS the core business; product output is the content. Reuse for Creative Direction.'),
  ('Tatiana Londono','TikTok','real estate coaching','["simplify scary decisions","contrarian"]'::jsonb,89,'Simplifies a high-stakes expensive decision into entertaining clips; says what others will not.'),
  ('Steevie Soucie','TikTok','real estate agent','["solo operator","relatability"]'::jsonb,82,'Proof a single operator runs a content-led pipeline (no media team). The agency-client archetype.'),
  ('Brendan Kane','multi','virality strategy','["hook engineering"]'::jsonb,84,'Hook Point: the first 3 seconds ARE the game. Maps to the Hook Strength weight. Follower/earning stats not freshly verified.'),
  ('Justin Welsh (archetype)','LinkedIn/X','solopreneur systems','["frameworks","carousels"]'::jsonb,86,'Personal profile + framework carousels + email list. Personal profiles meaningfully out-reach company pages (Sprout ~4.7% vs 1-2%); the 8x figure is vendor/directional.'),
  ('SG finfluencer (cautionary)','TikTok/IG','SG personal finance','["relatable money stories","local numbers"]'::jsonb,60,'Copy the reach mechanics (local specificity), NEVER the advice posture. MAS issued advisory letters; FI is liable for finfluencer content (eff 25 Mar 2026).')
) as v(handle, platform, niche, pillars, score, notes)
where not exists (select 1 from creator_profiles);

-- 4) Viral examples (documented mechanics)
insert into viral_examples (url, platform, hook, format, why_worked, metrics)
select * from (values
  ('','YouTube/Shorts','bizarre incongruous 3D model as the first frame','3D explainer','Confusion in the first frame forces attention; visual incongruity drives comments to ask what they are seeing','{"views":"~40M","source":"directional"}'::jsonb),
  ('','TikTok','primary hook that hides the payoff to the last second','narrative','Delayed payoff held to the final second + loop trick = near-100 percent retention and rewatch','{"source":"Bitton framework"}'::jsonb),
  ('','YouTube','one-line passing comment expanded into a 45s narrative','lore / story','Mine long-form for a 5-second moment, build one payoff; reveal identity at the very end','{"source":"MrBeast-lore technique"}'::jsonb)
) as v(url, platform, hook, format, why_worked, metrics)
where not exists (select 1 from viral_examples);
