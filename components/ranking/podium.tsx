import { Crown, Sparkles, Award } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { cn, formatPoints } from '@/lib/utils';
import type { RankingRow } from '@/lib/ranking';

const RANK_STYLES = [
  {
    label: '1º',
    icon: Crown,
    pillBg: 'bg-gradient-podio-ouro',
    pillText: 'text-text-primary',
    bar: 'bg-gradient-podio-ouro',
    barShadow: 'shadow-[0_-12px_24px_-8px_rgba(242,201,76,0.5)]',
    height: 'h-40 sm:h-48',
    iconColor: 'text-tier-ouro',
  },
  {
    label: '2º',
    icon: Award,
    pillBg: 'bg-gradient-podio-prata',
    pillText: 'text-text-primary',
    bar: 'bg-gradient-podio-prata',
    barShadow: 'shadow-[0_-12px_24px_-8px_rgba(182,187,196,0.5)]',
    height: 'h-32 sm:h-40',
    iconColor: 'text-[#5A6172]',
  },
  {
    label: '3º',
    icon: Sparkles,
    pillBg: 'bg-gradient-podio-bronze',
    pillText: 'text-white',
    bar: 'bg-gradient-podio-bronze',
    barShadow: 'shadow-[0_-12px_24px_-8px_rgba(232,145,90,0.5)]',
    height: 'h-24 sm:h-32',
    iconColor: 'text-tier-bronze',
  },
] as const;

export function Podium({ top3 }: { top3: RankingRow[] }) {
  if (top3.length === 0) return null;
  // Layout visual: 2º, 1º, 3º
  const visual = [top3[1], top3[0], top3[2]].filter(Boolean);
  return (
    <div className="relative">
      {/* Glow halo atrás do 1º lugar */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 w-64 h-64 rounded-full bg-tier-ouro-soft blur-3xl opacity-50 pointer-events-none"
        aria-hidden
      />
      <div className="relative flex items-end justify-center gap-3 sm:gap-6 pt-8">
        {visual.map((row) => {
          const realIdx = top3.findIndex((r) => r.user_id === row.user_id);
          const style = RANK_STYLES[realIdx];
          const Icon = style.icon;
          return (
            <div
              key={row.user_id}
              className="flex flex-col items-center w-1/3 max-w-[180px] animate-fade-up-sm"
              style={{ animationDelay: `${realIdx * 80}ms` }}
            >
              {/* Rank icon — flutua acima do avatar */}
              <div
                className={cn(
                  'flex items-center justify-center h-9 w-9 rounded-full bg-white shadow-sm mb-2',
                  style.iconColor
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <Avatar
                size={realIdx === 0 ? 'xl' : 'lg'}
                name={row.full_name}
                src={row.avatar_url ?? null}
                className={cn(realIdx === 0 && 'ring-4 ring-tier-ouro/40')}
              />
              <p className="mt-3 text-body-sm font-bold text-text-primary text-center truncate w-full">
                {row.full_name}
              </p>
              <p className="text-caption text-text-muted truncate w-full text-center">
                @{row.username}
              </p>
              {/* Barra do pódio com pontos */}
              <div
                className={cn(
                  'mt-3 w-full rounded-t-2xl flex flex-col items-center justify-end pb-4 px-3',
                  'transition-transform duration-slower ease-out-quart',
                  style.bar,
                  style.barShadow,
                  style.height
                )}
              >
                <span className="text-points font-black tabular-nums text-text-primary leading-none">
                  {formatPoints(row.total_points)}
                </span>
                <span className="text-caption font-bold uppercase tracking-overline text-text-primary/70 mt-1">
                  pontos
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}