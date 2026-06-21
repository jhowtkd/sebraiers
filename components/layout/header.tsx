import Link from 'next/link';
import { Logo } from './logo';
import { UserMenu } from './user-menu';
import { createClient } from '@/lib/supabase/server';

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  const isAdmin = profile?.is_admin === true;

  return (
    <header className="sticky top-0 z-30 bg-surface-elevated/95 backdrop-blur border-b border-border-subtle">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden sm:flex items-center gap-1 text-body-sm">
            <Link href="/timeline" className="px-3 py-1.5 rounded-md hover:bg-surface-sunken text-text-secondary hover:text-text-primary">Timeline</Link>
            <Link href="/ranking" className="px-3 py-1.5 rounded-md hover:bg-surface-sunken text-text-secondary hover:text-text-primary">Ranking</Link>
            <Link href="/meu-desempenho" className="px-3 py-1.5 rounded-md hover:bg-surface-sunken text-text-secondary hover:text-text-primary">Meu desempenho</Link>
            {isAdmin && (
              <Link href="/admin" className="px-3 py-1.5 rounded-md bg-brand-atlantico text-white hover:bg-brand-atlantico-600">Admin</Link>
            )}
          </nav>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}