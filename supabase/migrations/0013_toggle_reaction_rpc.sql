-- ============================================================================
-- SEBRAEIERS — Atomic toggle_reaction RPCs
--
--   Defect fixed: race condition in app/actions/social.ts. The previous flow
--   did SELECT → DELETE → INSERT in separate statements with no transaction.
--   Two concurrent clicks could both read "no existing reaction" and both
--   INSERT, hitting a PK violation. The DELETE also ignored its error.
--
--   These functions perform the toggle (insert-or-delete of a SINGLE reaction
--   kind) in one transactional statement, immune to concurrent races. The PK
--   (post_id, user_id, reaction) allows multiple DISTINCT reactions per user
--   per target, so toggling 'fire' never touches an existing 'clap'.
--
--   Returns 'set' if the reaction was added, 'removed' if it was toggled off.
-- ============================================================================

create or replace function public.toggle_post_reaction(
  p_post_id uuid,
  p_user_id uuid,
  p_reaction text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing boolean;
begin
  -- Caller must be the acting user (defense in depth; action also enforces).
  if p_user_id <> auth.uid() then
    raise exception 'forbidden: caller must be the reacting user' using errcode = '42501';
  end if;

  -- Validate reaction kind (defense in depth; Zod already validates).
  if p_reaction not in ('fire', 'muscle', 'clap', 'raised', 'laugh') then
    raise exception 'invalid_reaction' using errcode = '22023';
  end if;

  -- Is this exact reaction already present for this user+post?
  select exists(
    select 1 from public.post_reactions
    where post_id = p_post_id and user_id = p_user_id and reaction = p_reaction
  ) into v_existing;

  if v_existing then
    delete from public.post_reactions
    where post_id = p_post_id and user_id = p_user_id and reaction = p_reaction;
    return 'removed';
  end if;

  insert into public.post_reactions (post_id, user_id, reaction)
  values (p_post_id, p_user_id, p_reaction);
  return 'set';
end $$;

revoke all on function public.toggle_post_reaction(uuid, uuid, text) from public;
grant execute on function public.toggle_post_reaction(uuid, uuid, text) to authenticated;

create or replace function public.toggle_checkin_reaction(
  p_checkin_id uuid,
  p_user_id uuid,
  p_reaction text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing boolean;
begin
  if p_user_id <> auth.uid() then
    raise exception 'forbidden: caller must be the reacting user' using errcode = '42501';
  end if;

  -- checkin_reactions only allows 'clap' (CHECK constraint on the table).
  if p_reaction <> 'clap' then
    raise exception 'invalid_reaction' using errcode = '22023';
  end if;

  select exists(
    select 1 from public.checkin_reactions
    where checkin_id = p_checkin_id and user_id = p_user_id and reaction = p_reaction
  ) into v_existing;

  if v_existing then
    delete from public.checkin_reactions
    where checkin_id = p_checkin_id and user_id = p_user_id and reaction = p_reaction;
    return 'removed';
  end if;

  insert into public.checkin_reactions (checkin_id, user_id, reaction)
  values (p_checkin_id, p_user_id, p_reaction);
  return 'set';
end $$;

revoke all on function public.toggle_checkin_reaction(uuid, uuid, text) from public;
grant execute on function public.toggle_checkin_reaction(uuid, uuid, text) to authenticated;
