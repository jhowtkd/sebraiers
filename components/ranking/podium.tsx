import { cn, initials, formatPoints } from '@/lib/utils';
import type { RankingRow } from '@/lib/ranking';

const MEDALS = ['🥇', '🥈', '🥉'] as const;
const HEIGHTS = ['h-32', 'h-24', 'h-20'] as const;
const COLORS = ['bg-tier-ouro', 'bg-tier-prata', 'bg-tier-bronze'] as const;

export function Podium({ top3 }: { top3: RankingRow[] }) {
  if (top3.length === 0) return null;
  const visual = [top3[1], top3[0], top3[2]].filter(Boolean);
  return (
    <div className="flex items-end justify-center gap-3 sm:gap-6">
      {visual.map((row) => {
        const realIdx = top3.findIndex((r) => r.user_id === row.user_id);
        return (
          <div key={row.user_id} className="flex flex-col items-center w-1/3 max-w-40">
            <div className="text-3xl mb-1">{MEDALS[realIdx]}</div>
            <div className="flex flex-col items-center mb-2">
              <div className="h-12 w-12 rounded-full bg-brand-azul text-white flex items-center justify-center font-semibold text-caption">
                {initials(row.full_name)}
              </div>
              <p className="mt-2 text-body-sm font-semibold text-text-primary text-center truncate w-full">{row.full_name}</p>
              <p className="text-caption text-text-muted">@{row.username}</p>
            </div>
            <div className={cn('w-full rounded-t-md flex items-center justify-center text-points font-bold tabular-nums text-text-primary', HEIGHTS[realIdx], COLORS[realIdx])}>
              {formatPoints(row.total_points)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
