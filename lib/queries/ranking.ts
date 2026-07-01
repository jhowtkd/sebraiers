import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';
import { IS_MOCK } from '@/lib/data-source/env';
import { mockGetRanking } from '@/lib/mock/db';
import { sortRanking, type RankingRow } from '@/lib/ranking';

export async function getRanking(limit = 50): Promise<{ top: RankingRow[]; myPosition: number; me: RankingRow | null }> {
  if (IS_MOCK) return mockGetRanking(limit);

  const user = await getSession();
  const supabase = await createClient();

  const [leaderboardRes, rankRes] = await Promise.all([
    supabase.rpc('get_leaderboard', { p_limit: limit }),
    user ? supabase.rpc('get_user_rank', { p_user_id: user.id }) : Promise.resolve({ data: 0, error: null }),
  ]);

  if (leaderboardRes.error) throw leaderboardRes.error;

  const top = sortRanking((leaderboardRes.data ?? []) as RankingRow[]);
  const myPosition = user ? Number(rankRes.data ?? 0) : 0;
  const me = user ? top.find((r) => r.user_id === user.id) ?? null : null;

  return { top, myPosition, me };
}
