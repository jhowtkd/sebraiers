-- Security hardening: decide_checkin caller binding + remove forgeable admin_email_hint

create or replace function public.decide_checkin(
  p_checkin_id uuid,
  p_decision text,
  p_admin_id uuid,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_count integer;
  v_approver_is_admin boolean;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if p_admin_id is distinct from auth.uid() then
    raise exception 'forbidden: admin_id must match caller' using errcode = '42501';
  end if;

  select is_admin into v_approver_is_admin
  from public.profiles where id = p_admin_id;
  if not coalesce(v_approver_is_admin, false) then
    raise exception 'forbidden: only admin can decide checkins' using errcode = '42501';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  update public.checkins
  set status = p_decision,
      decided_at = now(),
      decided_by = p_admin_id,
      admin_note = p_note
  where id = p_checkin_id and status = 'pending';

  get diagnostics v_updated_count = row_count;
  if v_updated_count = 0 then
    raise exception 'checkin_not_pending' using errcode = 'P0002';
  end if;

  insert into public.checkin_approvals (checkin_id, admin_id, decision, note)
  values (p_checkin_id, p_admin_id, p_decision, p_note);

  select to_jsonb(c.*) into v_result
  from public.checkins c where c.id = p_checkin_id;

  return v_result;
end;
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
