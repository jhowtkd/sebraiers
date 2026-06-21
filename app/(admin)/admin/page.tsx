import { requireAdmin } from '@/lib/auth';
import { getAdminMetrics } from '@/lib/queries/metrics';
import { MetricsCards } from '@/components/admin/metrics-cards';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { NETWORK_LABELS } from '@/lib/types';

export default async function AdminDashboard() {
  await requireAdmin();
  const m = await getAdminMetrics();

  return (
    <div className="space-y-6">
      <h1 className="text-h1 text-text-primary">Painel administrativo</h1>
      <MetricsCards metrics={m} />
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top 5 do ranking</CardTitle></CardHeader>
          <CardBody>
            {m.top5.length === 0 ? <p className="text-text-secondary text-body-sm">Sem dados ainda.</p> : (
              <ol className="space-y-2">
                {m.top5.map((u, i) => (
                  <li key={u.user_id} className="flex items-center justify-between border-b border-border-subtle last:border-0 py-2">
                    <span className="text-body-sm"><span className="text-text-muted mr-2">{i + 1}º</span>{u.full_name} <span className="text-text-muted">@{u.username}</span></span>
                    <span className="text-body-sm font-semibold tabular-nums">{u.total_points} pts</span>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Engajamento por rede</CardTitle></CardHeader>
          <CardBody>
            {m.perNetwork.length === 0 ? <p className="text-text-secondary text-body-sm">Sem dados ainda.</p> : (
              <ul className="space-y-2">
                {m.perNetwork.map((r) => (
                  <li key={r.network} className="flex items-center justify-between border-b border-border-subtle last:border-0 py-2">
                    <span className="text-body-sm">{NETWORK_LABELS[r.network]}</span>
                    <span className="text-body-sm text-text-secondary">
                      <span className="text-state-success-strong font-semibold">{r.approved}</span> aprovados · <span className="text-state-warning-strong font-semibold">{r.pending}</span> pendentes
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}