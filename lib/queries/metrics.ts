import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';
import type { CheckinStatus, Network } from '@/lib/types';

export interface AdminMetrics {
  totalUsers: number;
  totalActivePosts: number;
  totalPendingCheckins: number;
  totalApprovedCheckins: number;
  totalApprovedPoints: number;
  top5: { user_id: string; full_name: string; username: string; total_points: number; approved_checkins: number }[];
  perNetwork: { network: Network; approved: number; pending: number }[];
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const admin = getAdminClient();
  const [users, posts, pend, appr, top, perNet] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('posts').select('id', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('checkins').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('checkins').select('points').eq('status', 'approved'),
    admin.from('user_points').select('user_id, full_name, username, total_points, approved_checkins')
      .order('total_points', { ascending: false }).limit(5),
    admin.from('checkins').select('status, post:posts(network)'),
  ]);

  const approvedRows = ((appr.data ?? []) as unknown as Array<{ points: number | null }>);
  const totalApprovedPoints = approvedRows.reduce((sum, r) => sum + (r.points ?? 0), 0);
  const netMap = new Map<Network, { approved: number; pending: number }>();
  const perNetRows = ((perNet.data ?? []) as unknown as Array<{ status: CheckinStatus; post: { network: Network | null } | null }>);
  perNetRows.forEach((r) => {
    const n = r.post?.network;
    if (!n) return;
    if (!netMap.has(n)) netMap.set(n, { approved: 0, pending: 0 });
    if (r.status === 'approved') netMap.get(n)!.approved += 1;
    else if (r.status === 'pending') netMap.get(n)!.pending += 1;
  });

  const topRows = ((top.data ?? []) as unknown as AdminMetrics['top5']);

  return {
    totalUsers: users.count ?? 0,
    totalActivePosts: posts.count ?? 0,
    totalPendingCheckins: pend.count ?? 0,
    totalApprovedCheckins: approvedRows.length,
    totalApprovedPoints,
    top5: topRows,
    perNetwork: Array.from(netMap.entries()).map(([network, v]) => ({ network, ...v })),
  };
}