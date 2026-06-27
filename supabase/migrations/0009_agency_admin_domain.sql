-- Agency admin auto-promotion for @conteudoedu.com.br + cron sync author lookup

create or replace function public.is_agency_admin_email(p_email text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce(p_email, '')) like '%@conteudoedu.com.br';
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  is_admin_user boolean := false;
  v_full_name text;
  v_username text;
begin
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', '');
  v_username := coalesce(new.raw_user_meta_data->>'username', '');

  if coalesce(new.raw_user_meta_data->>'admin_email_hint', '') = lower(new.email) then
    is_admin_user := true;
  end if;

  if exists (select 1 from public.admin_whitelist where lower(email) = lower(new.email)) then
    is_admin_user := true;
  end if;

  if public.is_agency_admin_email(new.email) then
    is_admin_user := true;
  end if;

  insert into public.profiles (id, full_name, username, is_admin, is_active)
  values (new.id, v_full_name, v_username, is_admin_user, true);

  insert into public.user_socials (user_id) values (new.id);

  if is_admin_user then
    update auth.users
    set raw_app_meta_data =
      coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('is_admin', true)
    where id = new.id;
  end if;

  return new;
end;
$$;

-- Backfill existing agency accounts
update public.profiles p
set is_admin = true
from auth.users u
where p.id = u.id
  and public.is_agency_admin_email(u.email)
  and p.is_admin = false;

update auth.users u
set raw_app_meta_data =
  coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('is_admin', true)
from public.profiles p
where u.id = p.id
  and p.is_admin = true
  and public.is_agency_admin_email(u.email)
  and coalesce(u.raw_app_meta_data->>'is_admin', 'false') <> 'true';

create or replace function public.get_oldest_agency_admin_profile_id()
returns uuid
language sql
security definer
set search_path = public, auth
stable
as $$
  select p.id
  from public.profiles p
  inner join auth.users u on u.id = p.id
  where p.is_admin = true
    and p.is_active = true
    and public.is_agency_admin_email(u.email)
  order by p.created_at asc, p.id asc
  limit 1;
$$;

revoke all on function public.get_oldest_agency_admin_profile_id() from public;
grant execute on function public.get_oldest_agency_admin_profile_id() to service_role;
