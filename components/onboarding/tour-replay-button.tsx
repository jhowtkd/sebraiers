'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle } from 'lucide-react';
import { resetOnboarded } from '@/app/actions/onboarding';
import { cn } from '@/lib/utils';

interface TourReplayButtonProps {
  role: 'user' | 'admin';
  className?: string;
}

export function TourReplayButton({ role, className }: TourReplayButtonProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  async function handleClick() {
    if (!confirming) {
      setConfirming(true);
      window.setTimeout(() => setConfirming(false), 4000);
      return;
    }
    setPending(true);
    const res = await resetOnboarded(role);
    setPending(false);
    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-elevated px-3 py-1.5 text-caption font-semibold text-text-secondary hover:border-brand-azul/40 hover:text-brand-azul-700 transition-colors duration-base',
        confirming && 'border-state-warning text-state-warning-strong',
        className,
      )}
    >
      <HelpCircle className="h-3.5 w-3.5" />
      {pending ? 'Reabrindo…' : confirming ? 'Confirmar' : 'Rever tour'}
    </button>
  );
}