-- Auth + persistence: authenticated users get full CRUD on client tables.
-- Reference tables keep their anon read policies (0003). Anon still CANNOT write
-- anything. NOTE: this grants any AUTHENTICATED user access — so public signups
-- must be disabled (or an email allowlist added) before this is exposed publicly.

-- store the hook text on the idea (cleaner than overloading `angle`)
alter table content_ideas add column if not exists hook text;

do $$
declare t text;
begin
  for t in select unnest(array[
    'companies','offers','audiences','avatars','pain_points','desires','competitors',
    'content_ideas','video_scripts','ad_creatives','ad_campaigns','lead_forms','leads',
    'lead_scoring','follow_up_history','sales_results','content_performance',
    'ad_performance','experiments'
  ]) loop
    execute format('drop policy if exists "authenticated full access" on public.%I;', t);
    execute format('create policy "authenticated full access" on public.%I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;
