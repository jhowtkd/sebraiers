import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { UserRow } from '@/components/admin/user-row';
import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';

export default async function AdminUsersPage() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  const list = (users ?? []) as unknown as Parameters<typeof UserRow>[0]['user'][];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-text-primary">Usuários</h1>
        <p className="text-body text-text-secondary mt-1">{list.length} colaborador(es) cadastrado(s).</p>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Users className="h-10 w-10" />} title="Nenhum usuário" />
      ) : (
        <ul className="space-y-3">
          {list.map((u) => <UserRow key={u.id} user={u} isMe={u.id === me.id} />)}
        </ul>
      )}
    </div>
  );
}
