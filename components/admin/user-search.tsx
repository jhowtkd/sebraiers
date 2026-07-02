'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export function UserSearch() {
  const router = useRouter();
  const sp = useSearchParams();
  const current = sp.get('q') ?? '';

  const update = useCallback(
    (value: string) => {
      const next = new URLSearchParams(sp.toString());
      if (value) next.set('q', value);
      else next.delete('q');
      const qs = next.toString();
      router.push(qs ? `/admin/users?${qs}` : '/admin/users');
    },
    [router, sp]
  );

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
      <input
        type="search"
        placeholder="Buscar por nome, usuário ou email…"
        defaultValue={current}
        onBlur={(e) => update(e.target.value)}
        onKeyDown={(e) =>
          e.key === 'Enter' && update((e.target as HTMLInputElement).value)
        }
        aria-label="Buscar usuários"
        className={cn(
          'w-full h-12 pl-11 pr-4 rounded-full bg-surface-elevated border border-border-subtle',
          'text-body text-text-primary placeholder:text-text-muted',
          'transition-all duration-base ease-out-quart',
          'focus:outline-none focus:border-brand-azul focus:shadow-glow-azul'
        )}
      />
    </div>
  );
}
