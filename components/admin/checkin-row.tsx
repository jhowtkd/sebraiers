'use client';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { decideCheckinAction } from '@/app/actions/checkins';
import { useToast } from '@/components/ui/toast';
import { Check, X } from 'lucide-react';
import { NetworkIcon } from '@/components/ui/network-icon';
import { ACTION_LABELS, ACTION_POINTS, type CheckinAction, type Network } from '@/lib/types';
import { formatRelative } from '@/lib/utils';

type Item = {
  id: string;
  action: CheckinAction;
  points: number;
  declared_at: string;
  user: { full_name: string; username: string };
  post: { id: string; title: string; network: Network; original_url: string };
};

export function CheckinRow({ item }: { item: Item }) {
  const [pending, start] = useTransition();
  const { toast } = useToast();

  function decide(decision: 'approved' | 'rejected') {
    start(async () => {
      const res = await decideCheckinAction({ checkin_id: item.id, decision });
      if (res.ok) {
        toast({
          title: decision === 'approved' ? 'Aprovado' : 'Rejeitado',
          variant: decision === 'approved' ? 'success' : 'info',
        });
      } else {
        toast({ title: 'Erro', description: res.error, variant: 'error' });
      }
    });
  }

  return (
    <li className="rounded-xl border border-border-subtle bg-surface-elevated p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-caption text-text-secondary mb-1">
          <NetworkIcon network={item.post.network} />
          <span className="font-medium text-text-primary">{item.user.full_name}</span>
          <span>·</span>
          <span>@{item.user.username}</span>
          <span>·</span>
          <span>
            {ACTION_LABELS[item.action]} (+{ACTION_POINTS[item.action]})
          </span>
          <span>·</span>
          <span>{formatRelative(item.declared_at)}</span>
        </div>
        <a
          href={item.post.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-body-sm font-medium text-text-primary hover:text-brand-azul truncate block"
        >
          {item.post.title}
        </a>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button size="sm" variant="primary" disabled={pending} onClick={() => decide('approved')}>
          <Check className="h-4 w-4" /> Aprovar
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => decide('rejected')}>
          <X className="h-4 w-4" /> Rejeitar
        </Button>
      </div>
    </li>
  );
}
