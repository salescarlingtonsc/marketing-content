-- User approval system: new signups are PENDING until the owner approves them.
-- Only an 'owner' can approve/reject. Client data is gated behind is_approved().

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'member',     -- 'owner' | 'member'
  status text not null default 'pending',  -- 'pending' | 'approved' | 'rejected'
  created_at timestamptz default now()
);
alter table profiles enable row level security;

-- auto-create a pending profile on every signup
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role, status)
  values (new.id, new.email, 'member', 'pending')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- helpers (security definer so they bypass profiles RLS -> no recursion)
create or replace function is_approved() returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved');
$$;

create or replace function is_owner() returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner');
$$;

-- profiles policies: a user sees their own row; the owner sees + updates all
drop policy if exists "profile self read" on profiles;
create policy "profile self read" on profiles for select to authenticated
  using (id = auth.uid() or public.is_owner());

drop policy if exists "owner manages profiles" on profiles;
create policy "owner manages profiles" on profiles for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- tighten client tables: only APPROVED users (not just any authenticated) get access
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
    execute format('drop policy if exists "approved full access" on public.%I;', t);
    execute format('create policy "approved full access" on public.%I for all to authenticated using (public.is_approved()) with check (public.is_approved());', t);
  end loop;
end $$;
