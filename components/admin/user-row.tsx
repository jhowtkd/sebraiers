'use client';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { toggleUserActiveAction, toggleUserAdminAction } from '@/app/actions/users';
import { initials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';

type Item = {
  id: string;
  full_name: string;
  username: string;
  email?: string | null;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
};

export function UserRow({ user, isMe }: { user: Item; isMe: boolean }) {
  const [pending, start] = useTransition();
  const { toast } = useToast();

  function toggleActive() {
    start(async () => {
      const res = await toggleUserActiveAction(user.id, !user.is_active);
      if (res.ok) toast({ title: user.is_active ? 'Usuário desativado' : 'Usuário ativado', variant: 'success' });
      else toast({ title: 'Erro', description: res.error, variant: 'error' });
    });
  }

  function toggleAdmin() {
    start(async () => {
      const res = await toggleUserAdminAction(user.id, !user.is_admin);
      if (res.ok) toast({ title: user.is_admin ? 'Rebaixado' : 'Promovido a admin', variant: 'success' });
      else toast({ title: 'Erro', description: res.error, variant: 'error' });
    });
  }

  return (
    <li className="rounded-xl border border-border-subtle bg-surface-elevated p-4 flex items-center gap-4">
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-brand-azul text-white text-caption font-semibold">{initials(user.full_name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className="text-body-sm font-medium text-text-primary truncate">{user.full_name}</p>
          {user.is_admin && <Badge variant="info">Admin</Badge>}
          {!user.is_active && <Badge variant="neutral">Desativado</Badge>}
          {isMe && <Badge variant="default">Você</Badge>}
        </div>
        <p className="text-caption text-text-muted">@{user.username} · {user.email} · desde {formatDate(user.created_at)}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button size="sm" variant="ghost" disabled={pending || isMe} onClick={toggleAdmin}>
          {user.is_admin ? 'Rebaixar' : 'Promover'}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending || isMe} onClick={toggleActive}>
          {user.is_active ? 'Desativar' : 'Ativar'}
        </Button>
      </div>
    </li>
  );
}
