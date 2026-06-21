import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardBody } from '@/components/ui/card';
import { CheckinHistoryList } from '@/components/posts/checkin-history-list';
import type { CheckinAction, CheckinStatus, Network } from '@/lib/types';
import { getCheckinEngagement, type CheckinEngagement } from '@/lib/queries/checkins';

type CheckinWithPost = {
  id: string;
  action: CheckinAction;
  status: CheckinStatus;
  points: number;
  declared_at: string;
  post: { id: string; title: string; network: Network; cover_url: string | null } | null;
};

export default async function MyPerformancePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: rows } = await supabase.from('checkins').select('status, points').eq('user_id', user.id);
  const totals = (rows ?? []).reduce(
    (acc, r) => {
      if (r.status === 'approved') { acc.approved += 1; acc.total_points += r.points; }
      else if (r.status === 'pending') acc.pending += 1;
      else if (r.status === 'rejected') acc.rejected += 1;
      return acc;
    },
    { total_points: 0, approved: 0, pending: 0, rejected: 0 }
  );

  const { data: items } = await supabase
    .from('checkins')
    .select('id, action, status, points, declared_at, post:posts(id, title, network, cover_url)')
    .eq('user_id', user.id)
    .order('declared_at', { ascending: false })
    .limit(50);

  const itemList = (items ?? []) as unknown as CheckinWithPost[];
  const engagementMap = new Map<string, CheckinEngagement>();
  if (itemList.length > 0) {
    await Promise.all(
      itemList.map(async (it) => {
        const eng = await getCheckinEngagement(it.id, user.id);
        engagementMap.set(it.id, eng);
      })
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-text-primary">Meu desempenho</h1>
        <p className="text-body text-text-secondary mt-1">Seus pontos e o histórico das suas ações.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardBody><p className="text-caption text-text-muted">Pontos</p><p className="mt-1 text-points tabular-nums text-text-primary">{totals.total_points}</p></CardBody></Card>
        <Card><CardBody><p className="text-caption text-text-muted">Aprovados</p><p className="mt-1 text-h2 tabular-nums text-state-success-strong">{totals.approved}</p></CardBody></Card>
        <Card><CardBody><p className="text-caption text-text-muted">Pendentes</p><p className="mt-1 text-h2 tabular-nums text-state-warning-strong">{totals.pending}</p></CardBody></Card>
        <Card><CardBody><p className="text-caption text-text-muted">Rejeitados</p><p className="mt-1 text-h2 tabular-nums text-state-error-strong">{totals.rejected}</p></CardBody></Card>
      </div>
      <div>
        <h2 className="text-h3 text-text-primary mb-3">Histórico</h2>
        <CheckinHistoryList
          items={itemList}
          engagementMap={engagementMap}
        />
      </div>
    </div>
  );
}
