-- Multi-tenant isolation: each user sees only their OWN data; the owner sees all.
-- Adds created_by (defaults to the inserting user) and scopes RLS to
-- own-rows-or-owner. Reference tables (hook_formulas/compliance_rules/
-- creator_profiles/viral_examples) + scoring_configs stay shared-read. profiles unchanged.

do $$
declare t text;
begin
  for t in select unnest(array[
    'companies','offers','audiences','avatars','pain_points','desires','competitors',
    'content_ideas','video_scripts','ad_creatives','ad_campaigns','lead_forms','leads',
    'lead_scoring','lead_scores','lead_outcomes','appointments','sales_outcomes','sales_results',
    'follow_up_history','content_performance','ad_performance','experiments',
    'lead_imports','learning_recommendations','posts','generations'
  ]) loop
    execute format('alter table public.%I add column if not exists created_by uuid default auth.uid();', t);
    execute format('drop policy if exists "approved full access" on public.%I;', t);
    execute format('drop policy if exists "own or owner" on public.%I;', t);
    execute format($f$create policy "own or owner" on public.%I for all to authenticated
      using (public.is_approved() and (created_by = auth.uid() or public.is_owner()))
      with check (public.is_approved() and (created_by = auth.uid() or public.is_owner()));$f$, t);
  end loop;
end $$;
