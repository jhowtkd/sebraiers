export interface RankingRow {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  total_points: number;
  approved_checkins: number;
  last_approved_at: string | null;
}

export function sortRanking<T extends RankingRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    const at = a.last_approved_at ? new Date(a.last_approved_at).getTime() : 0;
    const bt = b.last_approved_at ? new Date(b.last_approved_at).getTime() : 0;
    if (bt !== at) return bt - at;
    return a.username.localeCompare(b.username);
  });
}

export function rankPosition<T extends RankingRow>(rows: T[], userId: string): number {
  return rows.findIndex((r) => r.user_id === userId) + 1;
}
