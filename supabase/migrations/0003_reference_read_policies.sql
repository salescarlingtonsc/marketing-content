-- Allow read-only access to the NON-SENSITIVE reference library so the app can
-- generate from it. Client/PII tables (companies, audiences, leads, ...) stay
-- locked (no policy = no anon access) until auth is wired in Phase 2.

create policy "read hook_formulas" on hook_formulas for select to anon, authenticated using (true);
create policy "read compliance_rules" on compliance_rules for select to anon, authenticated using (true);
create policy "read creator_profiles" on creator_profiles for select to anon, authenticated using (true);
create policy "read viral_examples" on viral_examples for select to anon, authenticated using (true);
