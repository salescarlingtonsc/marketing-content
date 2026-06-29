-- Bootstrap the single owner. This email is auto-approved as 'owner' on signup;
-- everyone else stays 'pending' until the owner approves them.

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text := 'member';
  v_status text := 'pending';
begin
  if new.email = 'sales.carlingtonsc@gmail.com' then
    v_role := 'owner';
    v_status := 'approved';
  end if;
  insert into public.profiles (id, email, role, status)
  values (new.id, new.email, v_role, v_status)
  on conflict (id) do nothing;
  return new;
end $$;

-- promote the owner if the account already exists
update public.profiles set role = 'owner', status = 'approved'
where email = 'sales.carlingtonsc@gmail.com';
