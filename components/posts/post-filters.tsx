'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Search } from 'lucide-react';
import { type Network } from '@/lib/types';
import { cn } from '@/lib/utils';

const NETWORKS: { key: Network | 'all'; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'threads', label: 'Threads' },
  { key: 'x', label: 'X' },
];

const NETWORK_GRADIENT: Record<Network, string> = {
  instagram: 'bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]',
  linkedin: 'bg-[#0a66c2]',
  facebook: 'bg-[#1877f2]',
  tiktok: 'bg-gradient-to-br from-[#69C9D0] via-black to-[#EE1D52]',
  youtube: 'bg-[#ff0000]',
  threads: 'bg-black',
  x: 'bg-black',
};

export function PostFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const network = (sp.get('network') ?? 'all') as Network | 'all';
  const search = sp.get('q') ?? '';

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(sp.toString());
      if (value && value !== 'all') next.set(key, value);
      else next.delete(key);
      router.push(`/timeline?${next.toString()}`);
    },
    [router, sp]
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          type="search"
          placeholder="Buscar por título…"
          defaultValue={search}
          onBlur={(e) => update('q', e.target.value)}
          onKeyDown={(e) =>
            e.key === 'Enter' && update('q', (e.target as HTMLInputElement).value)
          }
          aria-label="Buscar posts"
          className={cn(
            'w-full h-12 pl-11 pr-4 rounded-full bg-surface-elevated border border-border-subtle',
            'text-body text-text-primary placeholder:text-text-muted',
            'transition-all duration-base ease-out-quart',
            'focus:outline-none focus:border-brand-azul focus:shadow-glow-azul'
          )}
        />
      </div>

      <div className="-mx-1 px-1 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {NETWORKS.map(({ key, label }) => {
          const active = network === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => update('network', key)}
              aria-pressed={active}
              className={cn(
                'inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-body-sm font-semibold whitespace-nowrap',
                'transition-all duration-base ease-out-quart active:scale-95',
                active
                  ? 'bg-text-primary text-white shadow-md'
                  : 'bg-surface-elevated text-text-secondary border border-border-subtle hover:border-border-strong/30 hover:text-text-primary'
              )}
            >
              {key !== 'all' && (
                <span
                  className={cn('h-2 w-2 rounded-full', NETWORK_GRADIENT[key as Network])}
                  aria-hidden
                />
              )}
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}