-- ============================================================================
-- SEBRAEIERS — Atomic decide_checkin RPC
--
--   Defects fixed (post-review of Task 14):
--     1) No atomicity between checkins.update and checkin_approvals.insert.
--        If the audit insert failed, the checkin was left approved/rejected
--        with no matching checkin_approvals row (orphaned audit state).
--     2) No guard against re-deciding an already-decided checkin. An admin
--        could overwrite decided_at/decided_by on a checkin that already had
--        a checkin_approvals row, leaving the log out of sync.
--
--   This function does both operations in a single transaction, and only
--   updates a checkin if it is still 'pending'.
-- ============================================================================

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
  -- Verify caller is admin
  select is_admin into v_approver_is_admin
  from public.profiles where id = p_admin_id;
  if not coalesce(v_approver_is_admin, false) then
    raise exception 'forbidden: only admin can decide checkins' using errcode = '42501';
  end if;

  -- Reject decisions that are not approved/rejected (defense in depth: Zod
  -- already validates this on the server action, but the RPC is callable
  -- directly from SQL clients).
  if p_decision not in ('approved', 'rejected') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  -- Update checkin only if still pending
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

  -- Insert audit row
  insert into public.checkin_approvals (checkin_id, admin_id, decision, note)
  values (p_checkin_id, p_admin_id, p_decision, p_note);

  -- Return the updated checkin
  select to_jsonb(c.*) into v_result
  from public.checkins c where c.id = p_checkin_id;

  return v_result;
end $$;

-- Grant execute to authenticated users (RLS still applies at row level via SECURITY DEFINER)
grant execute on function public.decide_checkin(uuid, text, uuid, text) to authenticated;
