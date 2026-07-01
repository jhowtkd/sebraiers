import Link from 'next/link';
import { ArrowUpRight, Flame, Sparkles } from 'lucide-react';
import { TierProgress } from '@/components/ui/tier-badge';
import { formatPoints } from '@/lib/utils';

export function YourStatusCard({
  profile,
  totalPoints,
  weeklyPoints,
  position,
  streakDays,
}: {
  profile: { full_name: string; username: string; avatar_url: string | null };
  totalPoints: number;
  weeklyPoints?: number;
  position?: number;
  streakDays?: number;
}) {
  return (
    // Atlântico sólido como base — dá contraste melhor que gradient pro texto branco
    <div
      className="relative overflow-hidden rounded-2xl shadow-md"
      style={{
        background:
          'linear-gradient(180deg, #142384 0%, #0B195F 100%)',
      }}
    >
      {/* Glow halo discreto, no topo */}
      <div
        className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-brand-ceu/25 blur-3xl pointer-events-none"
        aria-hidden
      />
      {/* Grain sutil pra dar profundidade sem competir com o texto */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden
      />

      <div className="relative p-6 text-white">
        {/* Kicker */}
        <p className="text-caption font-bold uppercase tracking-overline text-white/95">
          Sua jornada
        </p>

        {/* Handle: branco puro pra máximo contraste */}
        <h3 className="mt-2 text-h2 font-black tracking-tight leading-tight text-white">
          @{profile.username}
        </h3>
        <p className="text-body-sm text-white/80 truncate">{profile.full_name}</p>

        {/* Pontos / posição — números com glow sutil */}
        <div className="mt-6 flex items-end justify-between gap-3">
          <div>
            <p className="text-caption text-white/90 uppercase tracking-overline font-bold">
              Pontos totais
            </p>
            <p
              className="text-points-hero font-black tabular-nums leading-none text-white"
              style={{ textShadow: '0 2px 12px rgba(101, 183, 251, 0.25)' }}
            >
              {formatPoints(totalPoints)}
            </p>
          </div>
          {position !== undefined && position > 0 && (
            <div className="text-right">
              <p className="text-caption text-white/90 uppercase tracking-overline font-bold">
                Posição
              </p>
              <p
                className="text-points font-black tabular-nums leading-none text-white"
                style={{ textShadow: '0 2px 12px rgba(101, 183, 251, 0.25)' }}
              >
                {position}º
              </p>
            </div>
          )}
        </div>

        {/* Tier progress */}
        <div className="mt-5">
          <TierProgress points={totalPoints} inverted />
        </div>

        {/* Mini-stats — pílulas com contraste alto */}
        {(weeklyPoints !== undefined || streakDays !== undefined) && (
          <div className="mt-5 grid grid-cols-2 gap-2">
            {weeklyPoints !== undefined && (
              <div className="rounded-xl bg-white/14 backdrop-blur-sm ring-1 ring-inset ring-white/20 p-3">
                <div className="flex items-center gap-1.5 text-caption text-white/90 font-semibold">
                  <Sparkles className="h-3 w-3" aria-hidden /> Semana
                </div>
                <p className="mt-1 text-h4 font-black tabular-nums text-white">
                  +{formatPoints(weeklyPoints)}
                </p>
              </div>
            )}
            {streakDays !== undefined && (
              <div className="rounded-xl bg-white/14 backdrop-blur-sm ring-1 ring-inset ring-white/20 p-3">
                <div className="flex items-center gap-1.5 text-caption text-white/90 font-semibold">
                  <Flame className="h-3 w-3" aria-hidden /> Sequência
                </div>
                <p className="mt-1 text-h4 font-black tabular-nums text-white">
                  {streakDays} {streakDays === 1 ? 'dia' : 'dias'}
                </p>
              </div>
            )}
          </div>
        )}

        <Link
          href="/meu-desempenho"
          className="mt-5 inline-flex items-center gap-1.5 text-body-sm font-semibold text-white hover:text-brand-ceu-100 transition-colors"
        >
          Ver meu desempenho completo
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}