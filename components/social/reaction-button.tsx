'use client';

import * as React from 'react';
import { useState, useTransition, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';
import { setPostReactionAction, setCheckinReactionAction } from '@/app/actions/social';
import { cn } from '@/lib/utils';

export interface ReactionButtonProps {
  emoji: string;
  label: string;
  reaction: string;
  count: number;
  active: boolean;
  target: 'post' | 'checkin';
  targetId: string;
}

export function ReactionButton({ emoji, label, reaction, count, active, target, targetId }: ReactionButtonProps) {
  const [optimisticCount, setOptimisticCount] = useState(count);
  const [optimisticActive, setOptimisticActive] = useState(active);
  const [busy, start] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    setOptimisticCount(count);
    setOptimisticActive(active);
  }, [count, active]);

  function onClick() {
    const wasActive = optimisticActive;
    const wasCount = optimisticCount;
    setOptimisticActive(!wasActive);
    setOptimisticCount(wasActive ? wasCount - 1 : wasCount + 1);

    start(async () => {
      const res = target === 'post'
        ? await setPostReactionAction({ post_id: targetId, reaction })
        : await setCheckinReactionAction({ checkin_id: targetId, reaction: 'clap' });
      if (!res.ok) {
        setOptimisticActive(wasActive);
        setOptimisticCount(wasCount);
        toast({ title: 'Erro', description: res.error, variant: 'error' });
        return;
      }
      if (res.reaction) {
        toast({ title: `${emoji} adicionado!`, variant: 'info' });
      } else {
        toast({ title: 'Removido', variant: 'info' });
      }
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      aria-pressed={optimisticActive}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption font-medium transition-colors',
        'border',
        optimisticActive
          ? 'bg-tier-ouro/20 border-tier-ouro/50 text-text-primary'
          : 'bg-surface-sunken border-transparent hover:bg-surface-canvas text-text-secondary',
        busy && 'opacity-50 pointer-events-none'
      )}
    >
      <span className="text-base" aria-hidden>{emoji}</span>
      {optimisticCount > 0 && <span className="tabular-nums">{optimisticCount}</span>}
    </button>
  );
}
