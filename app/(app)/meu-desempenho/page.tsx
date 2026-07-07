import { CheckCircle2, Clock, XCircle, Sparkles, History } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { CheckinHistoryList } from '@/components/posts/checkin-history-list';
import { TierProgress, tierForPoints } from '@/components/ui/tier-badge';
import { getMyPerformanceDashboard } from '@/lib/queries/me';
import { formatPoints } from '@/lib/utils';
import { TourReplayButton } from '@/components/onboarding/tour-replay-button';

export default async function MyPerformancePage() {
  const user = await requireUser();
  const { totalPoints, weeklyPoints, streakDays, totals, checkins, engagementMap } =
    await getMyPerformanceDashboard(user.id);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="space-y-3 animate-fade-up">
        <p className="text-caption font-bold uppercase tracking-overline text-brand-azul">
          Meu desempenho
        </p>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-h1 sm:text-display font-black tracking-tighter leading-[0.95] text-text-primary text-balance">
            {formatPoints(totalPoints)} pontos e contando.
          </h1>
          <TourReplayButton role="user" />
        </div>
      </section>

      {/* Card de status hero */}
      <section className="rounded-3xl bg-gradient-atlantico-cobalto text-white p-6 sm:p-8 shadow-md relative overflow-hidden animate-fade-up">
        <div
          className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-ceu/30 blur-3xl"
          aria-hidden
        />
        <div className="relative grid sm:grid-cols-[1fr_auto] gap-6 items-end">
          <div>
            <p className="text-caption font-bold uppercase tracking-overline text-white/70">
              Tier atual
            </p>
            <p className="mt-2 text-display font-black capitalize tracking-tighter leading-none">
              {tierForPoints(totalPoints)}
            </p>
            <div className="mt-6 max-w-md">
              <TierProgress points={totalPoints} inverted />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-2xl bg-white/12 backdrop-blur-sm p-4 min-w-[120px]">
              <p className="text-caption uppercase tracking-overline font-bold text-white/70">
                Semana
              </p>
              <p className="mt-1 text-h2 font-black tabular-nums">+{formatPoints(weeklyPoints)}</p>
            </div>
            <div className="rounded-2xl bg-white/12 backdrop-blur-sm p-4 min-w-[120px]">
              <p className="text-caption uppercase tracking-overline font-bold text-white/70">
                Sequência
              </p>
              <p className="mt-1 text-h2 font-black tabular-nums">{streakDays}d</p>
            </div>
          </div>
        </div>
      </section>

      {/* Métricas */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Aprovados"
          value={totals.approved}
          tone="success"
        />
        <MetricCard
          icon={<Clock className="h-4 w-4" />}
          label="Pendentes"
          value={totals.pending}
          tone="warning"
        />
        <MetricCard
          icon={<XCircle className="h-4 w-4" />}
          label="Rejeitados"
          value={totals.rejected}
          tone="error"
        />
        <MetricCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Total de ações"
          value={totals.approved + totals.pending + totals.rejected}
          tone="azul"
        />
      </section>

      {/* Histórico */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <History className="h-4 w-4 text-brand-azul" />
          <h2 className="text-h3 font-bold text-text-primary">Histórico</h2>
        </div>
        <CheckinHistoryList items={checkins} engagementMap={engagementMap} />
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'success' | 'warning' | 'error' | 'azul';
}) {
  const toneMap = {
    success: 'bg-state-success/12 text-state-success-strong',
    warning: 'bg-tier-ouro-soft text-state-warning-strong',
    error: 'bg-state-error/12 text-state-error-strong',
    azul: 'bg-brand-azul-50 text-brand-azul-700',
  };
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-5 shadow-xs transition-all duration-base ease-out-quart hover:shadow-md hover:-translate-y-0.5">
      <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${toneMap[tone]}`}>
        {icon}
        <span className="text-caption font-bold uppercase tracking-overline">{label}</span>
      </div>
      <p className="mt-4 text-points font-black tabular-nums text-text-primary leading-none">
        {formatPoints(value)}
      </p>
    </div>
  );
}
