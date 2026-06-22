'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { NETWORK_LABELS, type Network } from '@/lib/types';

const NETWORKS: (Network | 'all')[] = ['all', 'instagram', 'linkedin', 'facebook', 'tiktok', 'youtube', 'threads', 'x'];

export function PostFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const network = (sp.get('network') ?? 'all') as Network | 'all';
  const search = sp.get('q') ?? '';

  const update = useCallback((key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value && value !== 'all') next.set(key, value); else next.delete(key);
    router.push(`/timeline?${next.toString()}`);
  }, [router, sp]);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <Input
          placeholder="Buscar por título…"
          defaultValue={search}
          onBlur={(e) => update('q', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && update('q', (e.target as HTMLInputElement).value)}
          className="pl-9"
        />
      </div>
      <Select defaultValue={network} onChange={(e) => update('network', e.target.value)} className="sm:w-48">
        {NETWORKS.map((n) => <option key={n} value={n}>{n === 'all' ? 'Todas as redes' : NETWORK_LABELS[n]}</option>)}
      </Select>
    </div>
  );
}
