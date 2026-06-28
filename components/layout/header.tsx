import Link from 'next/link';
import { Logo } from './logo';
import { UserMenu } from './user-menu';
import { getAuthHeaderContext } from '@/lib/auth';

export async function Header() {
  const ctx = await getAuthHeaderContext();
  if (!ctx) return null;

  return (
    <header className="sticky top-0 z-30 bg-surface-elevated/95 backdrop-blur border-b border-border-subtle">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden sm:flex items-center gap-1 text-body-sm">
            <Link href="/timeline" className="px-3 py-1.5 rounded-md hover:bg-surface-sunken text-text-secondary hover:text-text-primary">Timeline</Link>
            <Link href="/ranking" className="px-3 py-1.5 rounded-md hover:bg-surface-sunken text-text-secondary hover:text-text-primary">Ranking</Link>
            <Link href="/meu-desempenho" className="px-3 py-1.5 rounded-md hover:bg-surface-sunken text-text-secondary hover:text-text-primary">Meu desempenho</Link>
            {ctx.isAdmin && (
              <Link href="/admin" className="px-3 py-1.5 rounded-md bg-brand-atlantico text-white hover:bg-brand-atlantico-600">Admin</Link>
            )}
          </nav>
        </div>
        <UserMenu user={ctx.user} fullName={ctx.fullName} />
      </div>
    </header>
  );
}
