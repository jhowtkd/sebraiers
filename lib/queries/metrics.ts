import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';
import type { Network } from '@/lib/types';

export interface AdminMetrics {
  totalUsers: number;
  totalActivePosts: number;
  totalPendingCheckins: number;
  totalApprovedCheckins: number;
  totalApprovedPoints: number;
  top5: { user_id: string; full_name: string; username: string; total_points: number; approved_checkins: number }[];
  perNetwork: { network: Network; approved: number; pending: number }[];
}

type CheckinStatsRpc = {
  total_approved_checkins: number;
  total_approved_points: number;
  per_network: { network: Network; approved: number; pending: number }[];
};

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const admin = getAdminClient();
  const [users, posts, pend, stats, top] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('posts').select('id', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('checkins').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.rpc('get_admin_checkin_stats'),
    admin.from('user_points').select('user_id, full_name, username, total_points, approved_checkins')
      .order('total_points', { ascending: false }).limit(5),
  ]);

  if (stats.error) throw stats.error;

  const checkinStats = stats.data as CheckinStatsRpc;
  const topRows = ((top.data ?? []) as unknown as AdminMetrics['top5']);

  return {
    totalUsers: users.count ?? 0,
    totalActivePosts: posts.count ?? 0,
    totalPendingCheckins: pend.count ?? 0,
    totalApprovedCheckins: checkinStats.total_approved_checkins,
    totalApprovedPoints: checkinStats.total_approved_points,
    top5: topRows,
    perNetwork: checkinStats.per_network ?? [],
  };
}
