import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';
import { sortRanking, rankPosition, type RankingRow } from '@/lib/ranking';

export async function getRanking(limit = 50): Promise<{ top: RankingRow[]; myPosition: number; me: RankingRow | null }> {
  const user = await getSession();
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('user_points')
    .select('*')
    .order('total_points', { ascending: false })
    .order('last_approved_at', { ascending: false })
    .order('username', { ascending: true })
    .limit(limit);
  if (error) throw error;
  const top = sortRanking((data ?? []) as RankingRow[]);
  const me = user ? top.find((r) => r.user_id === user.id) ?? null : null;
  const myPosition = user ? rankPosition(top, user.id) : 0;
  return { top, myPosition, me };
}
