import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { UserRow } from '@/components/admin/user-row';
import { UserSearch } from '@/components/admin/user-search';
import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const me = await requireAdmin();
  const { q } = await searchParams;
  const trimmed = q?.trim();

  const supabase = await createClient();
  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  // NOTE: `profiles` has no `email` column (email lives in `auth.users`).
  // Filtering on a non-existent column would error at runtime, so search only
  // full_name and username.
  if (trimmed) {
    const like = `%${trimmed}%`;
    query = query.or(`full_name.ilike.${like},username.ilike.${like}`);
  }

  const { data: users } = await query;
  const list = (users ?? []) as unknown as Parameters<typeof UserRow>[0]['user'][];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-text-primary">Usuários</h1>
        <p className="text-body text-text-secondary mt-1">
          {list.length} colaborador(es){trimmed ? ` para "${trimmed}"` : ''}.
        </p>
      </div>
      <UserSearch />
      {list.length === 0 ? (
        <EmptyState icon={<Users className="h-10 w-10" />} title="Nenhum usuário encontrado" />
      ) : (
        <ul className="space-y-3">
          {list.map((u) => <UserRow key={u.id} user={u} isMe={u.id === me.id} />)}
        </ul>
      )}
    </div>
  );
}
