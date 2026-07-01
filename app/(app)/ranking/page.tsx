import { Trophy, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getRanking } from '@/lib/queries/ranking';
import { getMyPoints } from '@/lib/queries/me';
import { Podium } from '@/components/ranking/podium';
import { RankingList } from '@/components/ranking/ranking-list';
import { TierProgress, tierForPoints } from '@/components/ui/tier-badge';
import { TIER_LABELS, TIER_THRESHOLDS } from '@/lib/gamification/tiers';
import { formatPoints } from '@/lib/utils';

export default async function RankingPage() {
  const user = await requireUser();
  const [{ top, myPosition, me }, totalPoints] = await Promise.all([
    getRanking(50),
    getMyPoints(user.id),
  ]);
  const top3 = top.slice(0, 3);
  const rest = top.slice(3);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="space-y-3 animate-fade-up">
        <p className="text-caption font-bold uppercase tracking-overline text-brand-azul">
          Ranking da semana
        </p>
        <h1 className="text-h1 sm:text-display font-black tracking-tighter leading-[0.95] text-text-primary text-balance">
          Quem tá movendo<br />as redes do SEBRAE.
        </h1>
        <p className="text-body-lg text-text-secondary max-w-2xl">
          Tiers: <strong className="text-tier-bronze">{TIER_LABELS.bronze}</strong> {TIER_THRESHOLDS.bronze} ·{' '}
          <strong className="text-tier-prata">{TIER_LABELS.prata}</strong> {TIER_THRESHOLDS.prata} ·{' '}
          <strong className="text-tier-ouro">{TIER_LABELS.ouro}</strong> {TIER_THRESHOLDS.ouro} ·{' '}
          <strong className="text-tier-platina">{TIER_LABELS.platina}</strong> {TIER_THRESHOLDS.platina} ·{' '}
          <strong className="text-tier-diamante">{TIER_LABELS.diamante}</strong> {TIER_THRESHOLDS.diamante}.
        </p>
      </section>

      {/* Your position pill (mobile) — em desktop vira sidebar */}
      {me && myPosition > 0 && (
        <div className="lg:hidden rounded-2xl bg-gradient-atlantico-cobalto text-white p-5 flex items-center justify-between shadow-md animate-fade-up">
          <div>
            <p className="text-caption font-bold uppercase tracking-overline text-white/70">
              Sua posição
            </p>
            <p className="text-h2 font-black tabular-nums">{myPosition}º</p>
          </div>
          <div className="text-right">
            <p className="text-caption font-bold uppercase tracking-overline text-white/70">
              Pontos
            </p>
            <p className="text-h2 font-black tabular-nums">{formatPoints(totalPoints)}</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="space-y-8 min-w-0">
          {/* Pódio */}
          <section className="rounded-3xl bg-surface-elevated border border-border-subtle shadow-xs p-6 sm:p-10 overflow-hidden relative">
            <div
              className="absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-64 rounded-full bg-tier-ouro-soft blur-3xl opacity-50"
              aria-hidden
            />
            <div className="relative">
              <div className="flex items-center gap-2 text-brand-azul">
                <Trophy className="h-4 w-4" />
                <p className="text-caption font-bold uppercase tracking-overline">
                  Pódio
                </p>
              </div>
              <Podium top3={top3} />
            </div>
          </section>

          {/* Lista */}
          <section>
            <h2 className="text-h3 font-bold text-text-primary mb-4">
              Posições seguintes
            </h2>
            <RankingList
              rows={rest}
              highlightUserId={user.id}
              myPosition={myPosition}
            />
          </section>
        </div>

        {/* Sidebar: seu status */}
        {me && myPosition > 0 && (
          <aside className="space-y-4 lg:sticky lg:top-20 self-start hidden lg:block">
            <div className="rounded-2xl bg-gradient-atlantico-cobalto text-white p-6 shadow-md">
              <p className="text-caption font-bold uppercase tracking-overline text-white/70">
                Sua posição
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-points-hero font-black tabular-nums leading-none">
                    {myPosition}º
                  </p>
                  <p className="text-caption text-white/70 mt-1">no ranking geral</p>
                </div>
                <div className="text-right">
                  <p className="text-points font-black tabular-nums leading-none">
                    {formatPoints(totalPoints)}
                  </p>
                  <p className="text-caption text-white/70 mt-1">pontos</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-surface-elevated border border-border-subtle shadow-xs p-5">
              <p className="text-caption font-bold uppercase tracking-overline text-text-muted">
                Sua jornada
              </p>
              <div className="mt-3">
                <TierProgress points={totalPoints} />
              </div>
              <p className="mt-4 text-body-sm text-text-secondary">
                Tier atual:{' '}
                <strong className="text-text-primary">
                  {tierForPoints(totalPoints)}
                </strong>
              </p>
              <Link
                href="/meu-desempenho"
                className="mt-4 inline-flex items-center gap-1 text-body-sm font-semibold text-brand-azul-700 hover:text-brand-azul transition-colors"
              >
                Ver meu desempenho completo
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}