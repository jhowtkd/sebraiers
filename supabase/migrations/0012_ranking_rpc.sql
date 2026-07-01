-- Public leaderboard reads via SECURITY DEFINER RPCs so anon client can fetch
-- cross-user aggregates without bypassing RLS on checkins directly.

create or replace function public.get_leaderboard(p_limit int default 50)
returns table (
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  total_points int,
  approved_checkins int,
  last_approved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    up.user_id,
    up.username,
    up.full_name,
    up.avatar_url,
    up.total_points,
    up.approved_checkins,
    up.last_approved_at
  from public.user_points up
  order by
    up.total_points desc,
    up.last_approved_at desc nulls last,
    up.username asc
  limit greatest(p_limit, 1);
$$;

revoke all on function public.get_leaderboard(int) from public;
grant execute on function public.get_leaderboard(int) to authenticated;

create or replace function public.get_user_rank(p_user_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select
      up.user_id,
      row_number() over (
        order by
          up.total_points desc,
          up.last_approved_at desc nulls last,
          up.username asc
      )::int as pos
    from public.user_points up
  )
  select coalesce((select pos from ranked where user_id = p_user_id), 0);
$$;

revoke all on function public.get_user_rank(uuid) from public;
grant execute on function public.get_user_rank(uuid) to authenticated;
