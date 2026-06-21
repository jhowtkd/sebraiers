import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { initials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export async function UserMenu() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  if (!profile) return null;

  async function signOut() {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 rounded-full p-1 hover:bg-surface-sunken" aria-label="Menu do usuário">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-brand-azul text-white text-caption font-semibold">
            {initials(profile.full_name)}
          </AvatarFallback>
        </Avatar>
      </button>
      <div className="absolute right-0 top-full mt-2 w-56 rounded-md bg-surface-elevated shadow-lg border border-border-subtle opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all">
        <div className="p-3 border-b border-border-subtle">
          <p className="text-body-sm font-medium text-text-primary">{profile.full_name}</p>
          <p className="text-caption text-text-muted truncate">{user.email}</p>
        </div>
        <Link href="/meu-desempenho" className="flex items-center gap-2 px-3 py-2 text-body-sm hover:bg-surface-sunken">
          <User className="h-4 w-4" /> Meu desempenho
        </Link>
        <form action={signOut}>
          <button type="submit" className="w-full flex items-center gap-2 px-3 py-2 text-body-sm hover:bg-surface-sunken text-state-error-strong">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </form>
      </div>
    </div>
  );
}