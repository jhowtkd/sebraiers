-- ============================================================================
-- SEBRAEIERS — Security hardening (gaps from spec §5.7 self-review)
--
--   1) Reject self-update of profiles.is_admin / is_active
--   2) Lock the last active admin (cannot demote/deactivate the last one)
--   3) Keep auth.users.raw_app_meta_data->>'is_admin' in sync with profiles.is_admin
--      so the JWT claim used by middleware matches the DB row.
--   4) Block sign-in for users whose profile.is_active = false
--      (function is created; trigger attach is deferred — see note at end).
-- ============================================================================

-- 1) Protect is_admin / is_active from self-update
create or replace function public.protect_admin_fields()
returns trigger language plpgsql security definer set search_path = public
as $$
declare caller_is_admin boolean;
begin
  if auth.uid() is null then return new; end if;
  select coalesce(p.is_admin, false) into caller_is_admin
    from public.profiles p where p.id = auth.uid();
  if not caller_is_admin then
    if new.is_admin is distinct from old.is_admin then
      raise exception 'forbidden: only admin can change is_admin' using errcode = '42501';
    end if;
    if new.is_active is distinct from old.is_active then
      raise exception 'forbidden: only admin can change is_active' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_admin_fields on public.profiles;
create trigger trg_protect_admin_fields
  before update on public.profiles
  for each row execute function public.protect_admin_fields();

-- 2) Lock last admin
create or replace function public.prevent_last_admin_demote()
returns trigger language plpgsql security definer set search_path = public
as $$
declare remaining integer;
begin
  if new.is_admin is not distinct from old.is_admin
     and new.is_active is not distinct from old.is_active then
    return new;
  end if;
  if new.is_admin = false or new.is_active = false then
    select count(*) into remaining from public.profiles
      where is_admin = true and is_active = true and id <> old.id;
    if remaining = 0 then
      raise exception 'forbidden: cannot demote/deactivate the last admin' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_prevent_last_admin_demote on public.profiles;
create trigger trg_prevent_last_admin_demote
  before update on public.profiles
  for each row execute function public.prevent_last_admin_demote();

-- 3) Sync JWT claim
create or replace function public.sync_admin_jwt_claim()
returns trigger language plpgsql security definer set search_path = public, auth
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    update auth.users set raw_app_meta_data =
      coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('is_admin', new.is_admin)
      where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_admin_jwt_claim on public.profiles;
create trigger trg_sync_admin_jwt_claim
  after update of is_admin on public.profiles
  for each row execute function public.sync_admin_jwt_claim();

-- 4) Block inactive login (Supabase Auth runs validate_signin before signIn resolves)
-- Note: this trigger fires on sign-in attempts; in v1 we rely primarily on middleware/profile checks.
create or replace function public.block_inactive_login()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_active boolean;
begin
  select is_active into v_active from public.profiles where id = new.id;
  if v_active = false then
    raise exception 'account_disabled' using errcode = '42501';
  end if;
  return new;
end $$;

-- (Trigger attach is best-effort: if Supabase Auth hook signature differs, fallback to RLS checks
-- on every page already enforces is_active.)
