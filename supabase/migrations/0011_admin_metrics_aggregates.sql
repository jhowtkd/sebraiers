-- Aggregate admin check-in stats in Postgres instead of fetching all rows to Node.

create or replace function public.get_admin_checkin_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total_approved_checkins',
      (select count(*)::int from public.checkins where status = 'approved'),
    'total_approved_points',
      (select coalesce(sum(points), 0)::int from public.checkins where status = 'approved'),
    'per_network',
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'network', network,
            'approved', approved,
            'pending', pending
          )
          order by network
        )
        from (
          select
            p.network,
            count(*) filter (where c.status = 'approved')::int as approved,
            count(*) filter (where c.status = 'pending')::int as pending
          from public.checkins c
          inner join public.posts p on p.id = c.post_id
          group by p.network
        ) stats
      ), '[]'::jsonb)
  );
$$;
