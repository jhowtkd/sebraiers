import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { CheckinWithPostSummary } from '@/lib/types';
import { getCheckinsEngagementBatch, type CheckinEngagement } from '@/lib/queries/checkins';
import type { PerformanceDashboard, PerformanceTotals } from '@/lib/queries/dashboard-types';

export type { PerformanceDashboard, PerformanceTotals } from '@/lib/queries/dashboard-types';

export async function getMyPoints(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_points')
    .select('total_points')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return 0;
  return data?.total_points ?? 0;
}

export async function getMyWeeklyPoints(userId: string): Promise<number> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { data, error } = await supabase
    .from('checkins')
    .select('points')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .gte('decided_at', since.toISOString());
  if (error) return 0;
  return (data ?? []).reduce((acc: number, c: { points: number }) => acc + c.points, 0);
}

export async function getMyStreakDays(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('checkins')
    .select('decided_at')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .order('decided_at', { ascending: false })
    .limit(60);
  if (error || !data || data.length === 0) return 0;

  const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);
  const days = new Set((data as { decided_at: string }[]).map((c) => dayKey(c.decided_at)));

  let streak = 0;
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

async function fetchMyCheckinsWithPost(userId: string, limit = 50): Promise<CheckinWithPostSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('checkins')
    .select('id, action, status, points, declared_at, decided_at, post:posts(id, title, network, cover_url)')
    .eq('user_id', userId)
    .order('declared_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as CheckinWithPostSummary[];
}

async function fetchCheckinStatusTotals(userId: string): Promise<PerformanceTotals> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('checkins')
    .select('status, points')
    .eq('user_id', userId);
  if (error) {
    return { total_points: 0, approved: 0, pending: 0, rejected: 0 };
  }
  return (data ?? []).reduce(
    (acc, r) => {
      if (r.status === 'approved') {
        acc.approved += 1;
        acc.total_points += r.points;
      } else if (r.status === 'pending') acc.pending += 1;
      else if (r.status === 'rejected') acc.rejected += 1;
      return acc;
    },
    { total_points: 0, approved: 0, pending: 0, rejected: 0 }
  );
}

export async function getMyPerformanceDashboard(userId: string): Promise<PerformanceDashboard> {
  const [totalPoints, weeklyPoints, streakDays, totals, checkins] = await Promise.all([
    getMyPoints(userId),
    getMyWeeklyPoints(userId),
    getMyStreakDays(userId),
    fetchCheckinStatusTotals(userId),
    fetchMyCheckinsWithPost(userId),
  ]);

  const batched = await getCheckinsEngagementBatch(
    checkins.map((it) => it.id),
    userId
  );
  const engagementMap = new Map<string, CheckinEngagement>();
  for (const it of checkins) {
    const b = batched.get(it.id);
    engagementMap.set(it.id, {
      reactions: b?.reactions ?? {},
      myReactions: b?.myReactions ?? [],
      commentCount: b?.commentCount ?? 0,
      comments: [],
    });
  }

  return { totalPoints, weeklyPoints, streakDays, totals, checkins, engagementMap };
}
