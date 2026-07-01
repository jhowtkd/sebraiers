import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { cn, formatPoints } from '@/lib/utils';
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
    return (
      <div className="rounded-2xl border border-dashed border-border-subtle p-10 text-center">
        <p className="text-h4 font-bold text-text-primary">Ainda sem pontuação</p>
        <p className="mt-2 text-body-sm text-text-secondary">
          Faça seu primeiro check-in na timeline pra começar.
        </p>
      </div>
    );
  }
  return (
    <ol className="rounded-2xl border border-border-subtle bg-surface-elevated overflow-hidden shadow-xs">
      {rows.map((r, i) => {
        const pos = myPosition && r.user_id === highlightUserId ? myPosition : i + 4;
        const isMe = r.user_id === highlightUserId;
        const TrendIcon =
          i === 0 ? TrendingUp : i === rows.length - 1 ? TrendingDown : Minus;
        return (
          <li
            key={r.user_id}
            className={cn(
              'flex items-center gap-3 sm:gap-4 p-4 transition-colors duration-base',
              'border-b border-border-subtle/60 last:border-b-0',
              isMe && 'bg-brand-azul-50/70 border-l-4 border-l-brand-azul',
              !isMe && 'hover:bg-surface-sunken/50'
            )}
          >
            <span
              className={cn(
                'w-10 text-center text-rank tabular-nums font-black',
                pos === 1
                  ? 'text-tier-ouro'
                  : pos === 2
                  ? 'text-tier-prata'
                  : pos === 3
                  ? 'text-tier-bronze'
                  : 'text-text-muted'
              )}
            >
              {pos}
            </span>
            <Avatar size="sm" name={r.full_name} src={r.avatar_url ?? null} />
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-semibold text-text-primary truncate">
                {r.full_name}
                {isMe && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-brand-azul text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-overline">
                    Você
                  </span>
                )}
              </p>
              <p className="text-caption text-text-muted">
                @{r.username} · {r.approved_checkins}{' '}
                {r.approved_checkins === 1 ? 'check-in' : 'check-ins'}
              </p>
            </div>
            <TrendIcon
              className={cn(
                'h-4 w-4 flex-shrink-0',
                i === 0
                  ? 'text-state-success'
                  : i === rows.length - 1
                  ? 'text-state-error/60'
                  : 'text-text-muted/50'
              )}
            />
            <span className="text-h4 tabular-nums font-bold text-text-primary">
              {formatPoints(r.total_points)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}