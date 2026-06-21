import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { NetworkIcon } from '@/components/ui/network-icon';
import { formatRelative } from '@/lib/utils';
import { ACTION_LABELS, type CheckinAction, type CheckinStatus, type Network } from '@/lib/types';

type Item = {
  id: string;
  action: CheckinAction;
  status: CheckinStatus;
  points: number;
  declared_at: string;
  post: { id: string; title: string; network: Network; cover_url: string | null } | null;
};

export function CheckinHistoryList({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-subtle p-10 text-center text-text-secondary">
        Você ainda não declarou nenhuma ação. Acesse a <Link href="/timeline" className="text-brand-azul font-medium hover:underline">timeline</Link>.
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <Card key={it.id}>
          <CardBody className="flex items-center gap-4">
            {it.post?.cover_url && <img src={it.post.cover_url} alt="" className="h-12 w-12 rounded-md object-cover flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-caption text-text-secondary mb-1">
                <NetworkIcon network={it.post?.network ?? 'instagram'} />
                <span className="font-medium">{ACTION_LABELS[it.action]}</span>
                <span>·</span>
                <span>{formatRelative(it.declared_at)}</span>
              </div>
              {it.post && (
                <Link href={`/post/${it.post.id}`} className="block text-body-sm font-medium text-text-primary hover:text-brand-azul truncate">
                  {it.post.title}
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-body-sm tabular-nums font-semibold text-text-primary">+{it.points}</span>
              <StatusBadge status={it.status} />
            </div>
          </CardBody>
        </Card>
      ))}
    </ul>
  );
}
