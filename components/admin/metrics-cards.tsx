import { Card, CardBody } from '@/components/ui/card';
import { formatPoints } from '@/lib/utils';
import type { AdminMetrics } from '@/lib/queries/metrics';
import type { LucideIcon } from 'lucide-react';
import { Users, FileText, Clock, Award, Sparkles } from 'lucide-react';

type MetricKey = Exclude<keyof AdminMetrics, 'top5' | 'perNetwork'>;
type MetricItem = { key: MetricKey; label: string; icon: LucideIcon; format?: (v: number) => string };

const ITEMS: MetricItem[] = [
  { key: 'totalUsers', label: 'Colaboradores', icon: Users },
  { key: 'totalActivePosts', label: 'Publicações ativas', icon: FileText },
  { key: 'totalPendingCheckins', label: 'Check-ins pendentes', icon: Clock },
  { key: 'totalApprovedCheckins', label: 'Check-ins aprovados', icon: Award },
  { key: 'totalApprovedPoints', label: 'Pontos totais', icon: Sparkles, format: formatPoints },
];

export function MetricsCards({ metrics }: { metrics: AdminMetrics }) {
  return (
    <div data-tour="admin-metrics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {ITEMS.map((it) => {
        const v = metrics[it.key];
        const Icon = it.icon;
        return (
          <Card key={it.key}>
            <CardBody>
              <div className="flex items-center justify-between text-text-muted">
                <span className="text-caption">{it.label}</span>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-2 text-points tabular-nums text-text-primary">{it.format ? it.format(v) : v}</p>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}