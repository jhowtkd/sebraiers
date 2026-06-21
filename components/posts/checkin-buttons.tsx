'use client';
import * as React from 'react';
import { Heart, MessageCircle, Share2, Check, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { declareCheckinAction } from '@/app/actions/checkins';
import { ACTION_LABELS, ACTION_POINTS, type CheckinAction, type CheckinStatus } from '@/lib/types';

const ICONS: Record<CheckinAction, React.ComponentType<{ className?: string }>> = {
  like: Heart, comment: MessageCircle, share: Share2,
};
const ORDER: CheckinAction[] = ['like', 'comment', 'share'];

export function CheckinButtons({ postId, existing }: { postId: string; existing: { action: CheckinAction; status: CheckinStatus }[] }) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<CheckinAction | null>(null);

  const statusByAction = React.useMemo(() => {
    const m: Partial<Record<CheckinAction, CheckinStatus>> = {};
    existing.forEach((e) => { m[e.action] = e.status; });
    return m;
  }, [existing]);

  async function declare(action: CheckinAction) {
    setBusy(action);
    const res = await declareCheckinAction({ post_id: postId, action });
    if (res.ok) toast({ title: 'Ação registrada!', description: 'Aguardando aprovação do administrador.', variant: 'info' });
    else toast({ title: 'Erro', description: res.error, variant: 'error' });
    setBusy(null);
  }

  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {ORDER.map((a) => {
        const status = statusByAction[a];
        const Icon = ICONS[a];
        const isPending = status === 'pending';
        const isApproved = status === 'approved';
        const isRejected = status === 'rejected';
        const label = isPending ? 'Aguardando' : isApproved ? 'Aprovado' : isRejected ? 'Rejeitado' : ACTION_LABELS[a];
        const variant = isApproved ? 'secondary' : isRejected ? 'ghost' : 'primary';
        const disabled = !!status || busy !== null;
        const Icon2 = isApproved ? Check : isPending ? Clock : isRejected ? X : Icon;
        return (
          <Button key={a} variant={variant} disabled={disabled} loading={busy === a} onClick={() => declare(a)}>
            <Icon2 className="h-4 w-4" />
            <span className="flex-1 text-left">{label}</span>
            <span className="text-caption tabular-nums">+{ACTION_POINTS[a]}</span>
          </Button>
        );
      })}
    </div>
  );
}
