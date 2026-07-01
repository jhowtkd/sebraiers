'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, Sparkles } from 'lucide-react';
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
    // ignore
  }
}

type Props = {
  postId: string;
  url: string;
  networkLabel: string;
};

export function EngageButton({ postId, url, networkLabel }: Props) {
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
      className={cn(
        'group/cta relative block overflow-hidden rounded-2xl',
        'focus-visible:outline-none focus-visible:shadow-focus'
      )}
      aria-label={
        engaged ? `Reabrir ${networkLabel} (já engajado)` : `Engajar no ${networkLabel}`
      }
    >
      <div
        className={cn(
          'relative flex items-center justify-center gap-3 h-14 px-5 text-body-lg font-bold rounded-2xl overflow-hidden',
          'transition-all duration-base ease-out-quart',
          engaged
            ? 'bg-state-success text-white shadow-md'
            : 'bg-gradient-atlantico-cobalto text-white shadow-md hover:shadow-lg hover:-translate-y-0.5'
        )}
      >
        {!engaged && (
          <span className="absolute inset-0 bg-white opacity-0 group-hover/cta:opacity-10 transition-opacity duration-base" />
        )}
        {engaged && <Sparkles className="h-5 w-5 animate-check-pop" />}
        <span className="relative">{engaged ? 'ENGAJADO' : 'ENGAJAR AGORA'}</span>
        <span className="relative font-normal text-white/80 text-caption hidden sm:inline">
          no {networkLabel}
        </span>
        {engaged ? (
          <Check className="h-5 w-5 ml-auto" aria-hidden />
        ) : (
          <ArrowUpRight
            className="h-5 w-5 ml-auto transition-transform duration-base group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
            aria-hidden
          />
        )}
      </div>
    </a>
  );
}