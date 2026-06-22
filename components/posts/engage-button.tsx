'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'sebraeiers:engaged';

function readEngaged(postId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.includes(postId);
  } catch {
    return false;
  }
}

function writeEngaged(postId: string, engaged: boolean) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? (parsed as string[]) : [];
    const set = new Set(list);
    if (engaged) set.add(postId);
    else set.delete(postId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage quota or disabled — ignore
  }
}

type Props = {
  postId: string;
  url: string;
  networkLabel: string;
};

export function EngageButton({ postId, url, networkLabel }: Props) {
  // SSR-safe: initial render matches server (not engaged); localStorage
  // is read in an effect to avoid hydration mismatch.
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    setEngaged(readEngaged(postId));
  }, [postId]);

  const handleClick = () => {
    if (engaged) return;
    setEngaged(true);
    writeEngaged(postId, true);
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="block group/cta rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-state-success/40"
      aria-label={
        engaged
          ? `Reabrir ${networkLabel} (já engajado)`
          : `Engajar no ${networkLabel}`
      }
    >
      <Button
        size="lg"
        className={cn(
          'w-full h-14 px-5 text-body-lg font-bold gap-2 rounded-xl border-0',
          'bg-state-success hover:bg-state-success-strong text-white',
          engaged && 'shadow-[inset_0_0_0_2px_rgba(255,255,255,0.35)]'
        )}
      >
        <span>{engaged ? 'ENGAJADO' : 'ENGAJAR'}</span>
        {!engaged && (
          <span className="font-normal text-white/80 text-caption hidden sm:inline">
            no {networkLabel}
          </span>
        )}
        {engaged ? (
          <Check
            className="h-5 w-5 ml-auto transition-transform duration-200 group-hover/cta:scale-110"
            aria-hidden
          />
        ) : (
          <ArrowUpRight
            className="h-5 w-5 ml-auto transition-transform duration-200 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
            aria-hidden
          />
        )}
      </Button>
    </a>
  );
}
