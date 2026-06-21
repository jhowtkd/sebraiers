import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CheckinRow } from '@/components/admin/checkin-row';
import { EmptyState } from '@/components/ui/empty-state';
import { Inbox } from 'lucide-react';
import type { CheckinAction, Network } from '@/lib/types';

type PendingCheckin = {
  id: string;
  action: CheckinAction;
  points: number;
  declared_at: string;
  user: { full_name: string; username: string } | { full_name: string; username: string }[] | null;
  post: { id: string; title: string; network: Network; original_url: string } | { id: string; title: string; network: Network; original_url: string }[] | null;
};

function first<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function AdminCheckinsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: checkins } = await supabase
    .from('checkins')
    .select(
      'id, action, points, declared_at, user:profiles!checkins_user_id_fkey(full_name, username), post:posts(id, title, network, original_url)'
    )
    .eq('status', 'pending')
    .order('declared_at', { ascending: true })
    .limit(200);

  const items = ((checkins ?? []) as unknown as PendingCheckin[]).map((c) => {
    const u = first(c.user);
    const p = first(c.post);
    return {
      id: c.id,
      action: c.action,
      points: c.points,
      declared_at: c.declared_at,
      user: u ?? { full_name: '', username: '' },
      post: p ?? { id: '', title: '', network: 'instagram' as Network, original_url: '' },
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-text-primary">Aprovações pendentes</h1>
        <p className="text-body text-text-secondary mt-1">
          {items.length} check-in(s) aguardando sua decisão.
        </p>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-10 w-10" />}
          title="Nenhum check-in pendente"
          description="Quando colaboradores declararem ações, elas aparecem aqui para aprovação."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <CheckinRow key={it.id} item={it} />
          ))}
        </ul>
      )}
    </div>
  );
}
