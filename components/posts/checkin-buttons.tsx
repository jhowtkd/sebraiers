'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Share2, Check, Clock, X, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { declareCheckinAction } from '@/app/actions/checkins';
import { ACTION_LABELS, ACTION_POINTS, type CheckinAction, type CheckinStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const ICONS: Record<CheckinAction, React.ComponentType<{ className?: string }>> = {
  like: Heart,
  comment: MessageCircle,
  share: Share2,
};
const ORDER: CheckinAction[] = ['like', 'comment', 'share'];

export function CheckinButtons({
  postId,
  existing,
}: {
  postId: string;
  existing: { action: CheckinAction; status: CheckinStatus }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<CheckinAction | null>(null);
  const [shake, setShake] = React.useState<CheckinAction | null>(null);
  const [localExisting, setLocalExisting] = React.useState(existing);

  React.useEffect(() => {
    setLocalExisting(existing);
  }, [existing]);

  const statusByAction = React.useMemo(() => {
    const m: Partial<Record<CheckinAction, CheckinStatus>> = {};
    localExisting.forEach((e) => {
      m[e.action] = e.status;
    });
    return m;
  }, [localExisting]);

  async function declare(action: CheckinAction) {
    setBusy(action);
    const res = await declareCheckinAction({ post_id: postId, action });
    if (res.ok) {
      setLocalExisting((prev) => [...prev, { action, status: 'pending' }]);
      router.refresh();
      toast({
        title: 'Ação registrada',
        description: `Aguardando aprovação · +${ACTION_POINTS[action]} pts`,
        variant: 'info',
      });
    } else {
      setShake(action);
      setTimeout(() => setShake(null), 420);
      toast({ title: 'Erro', description: res.error, variant: 'error' });
    }
    setBusy(null);
  }

  return (
    <div data-tour="declare-actions" className="grid sm:grid-cols-3 gap-3">
      {ORDER.map((a) => {
        const status = statusByAction[a];
        const Icon = ICONS[a];
        const isPending = status === 'pending';
        const isApproved = status === 'approved';
        const isRejected = status === 'rejected';
        const label = isPending
          ? 'Aguardando'
          : isApproved
          ? 'Aprovado'
          : isRejected
          ? 'Rejeitado'
          : ACTION_LABELS[a];
        const disabled = !!status || busy !== null;
        const Icon2 = isApproved ? Check : isPending ? Clock : isRejected ? X : Icon;
        return (
          <button
            key={a}
            disabled={disabled}
            onClick={() => declare(a)}
            aria-pressed={isApproved || isPending}
            aria-label={`${ACTION_LABELS[a]} (+${ACTION_POINTS[a]} pontos)`}
            className={cn(
              'group/btn relative flex items-center gap-3 rounded-2xl border h-16 px-4 text-left',
              'transition-all duration-base ease-out-quart active:scale-[0.97]',
              'focus-visible:outline-none focus-visible:shadow-focus',
              isApproved &&
                'border-tier-ouro/40 bg-gradient-to-br from-tier-ouro-soft to-white shadow-glow-azul',
              isPending &&
                'border-state-info/30 bg-state-info/8',
              isRejected &&
                'border-state-error/25 bg-state-error/5 opacity-60',
              !status &&
                'border-border-subtle bg-surface-elevated hover:border-brand-azul/40 hover:shadow-md hover:-translate-y-0.5',
              shake === a && 'animate-shake-x border-state-error/50'
            )}
          >
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 transition-all duration-base',
                isApproved && 'bg-tier-ouro text-text-primary animate-check-pop',
                isPending && 'bg-state-info/20 text-state-info-strong',
                isRejected && 'bg-state-error/15 text-state-error-strong',
                !status &&
                  'bg-brand-azul-50 text-brand-azul-700 group-hover/btn:bg-brand-azul group-hover/btn:text-white group-hover/btn:scale-110'
              )}
            >
              <Icon2 className={cn(isApproved && 'h-5 w-5')} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-body-sm font-bold text-text-primary leading-tight">
                {label}
              </span>
              <span className="block text-caption text-text-muted">
                {ACTION_LABELS[a]}
              </span>
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-caption font-bold tabular-nums',
                isApproved
                  ? 'bg-tier-ouro text-text-primary'
                  : 'bg-brand-azul-50 text-brand-azul-700'
              )}
            >
              {isApproved && <Sparkles className="h-3 w-3" />}
              +{ACTION_POINTS[a]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
