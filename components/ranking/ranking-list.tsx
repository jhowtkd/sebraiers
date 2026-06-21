import { cn, initials, formatPoints } from '@/lib/utils';
import type { RankingRow } from '@/lib/ranking';

export function RankingList({
  rows,
  highlightUserId,
  myPosition,
}: {
  rows: RankingRow[];
  highlightUserId?: string;
  myPosition?: number;
}) {
  if (rows.length === 0) {
    return <p className="text-center text-text-secondary py-8">Ainda sem pontuação. Seja o primeiro!</p>;
  }
  return (
    <ol className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface-elevated overflow-hidden">
      {rows.map((r, i) => {
        const pos = myPosition && r.user_id === highlightUserId ? myPosition : i + 4;
        const isMe = r.user_id === highlightUserId;
        return (
          <li key={r.user_id} className={cn('flex items-center gap-3 sm:gap-4 p-3 sm:p-4', isMe && 'bg-state-info/5')}>
            <span
              className={cn(
                'w-8 text-center text-rank tabular-nums font-bold',
                pos === 1
                  ? 'text-state-warning-strong'
                  : pos === 2
                  ? 'text-text-secondary'
                  : pos === 3
                  ? 'text-tier-bronze'
                  : 'text-text-muted'
              )}
            >
              {pos}º
            </span>
            <div className="h-9 w-9 rounded-full bg-brand-azul text-white flex items-center justify-center font-semibold text-caption flex-shrink-0">
              {initials(r.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium text-text-primary truncate">{r.full_name}</p>
              <p className="text-caption text-text-muted">
                @{r.username} · {r.approved_checkins} {r.approved_checkins === 1 ? 'check-in' : 'check-ins'}
              </p>
            </div>
            <span className="text-h4 tabular-nums font-bold text-text-primary">{formatPoints(r.total_points)}</span>
          </li>
        );
      })}
    </ol>
  );
}
