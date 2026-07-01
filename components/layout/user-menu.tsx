import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LogOut, User as UserIcon, Settings, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type Props = {
  user: User;
  fullName: string;
  avatarUrl?: string | null;
};

export function UserMenu({ user, fullName, avatarUrl }: Props) {
  async function signOut() {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <div className="relative group">
      <button
        type="button"
        className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-surface-sunken transition-colors duration-base ease-out-quart"
        aria-label="Menu do usuário"
      >
        <Avatar size="sm" name={fullName} src={avatarUrl ?? null} />
        <span className="hidden md:inline text-body-sm font-medium text-text-primary">
          {fullName.split(' ')[0]}
        </span>
        <ChevronDown className="hidden md:inline h-3.5 w-3.5 text-text-muted transition-transform duration-base group-hover:rotate-180" />
      </button>
      <div
        className={cn(
          'absolute right-0 top-full mt-2 w-64 rounded-2xl bg-surface-elevated shadow-lg border border-border-subtle p-2 z-50',
          'opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0',
          'group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0',
          'transition-all duration-base ease-out-quart'
        )}
      >
        <div className="p-3 mb-1 rounded-xl bg-surface-sunken/60">
          <p className="text-body-sm font-semibold text-text-primary">{fullName}</p>
          <p className="text-caption text-text-muted truncate">{user.email}</p>
        </div>
        <Link
          href="/meu-desempenho"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-sm font-medium text-text-primary hover:bg-surface-sunken transition-colors"
        >
          <UserIcon className="h-4 w-4 text-text-muted" /> Meu desempenho
        </Link>
        <Link
          href="/meu-desempenho#perfil"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-sm font-medium text-text-primary hover:bg-surface-sunken transition-colors"
        >
          <Settings className="h-4 w-4 text-text-muted" /> Configurações
        </Link>
        <div className="my-1 border-t border-border-subtle" />
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-sm font-medium text-state-error-strong hover:bg-state-error/8 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </form>
      </div>
    </div>
  );
}