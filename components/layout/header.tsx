import Link from 'next/link';
import { LayoutGrid, Trophy, User, Sparkles } from 'lucide-react';
import { Logo } from './logo';
import { UserMenu } from './user-menu';
import { getAuthHeaderContext } from '@/lib/auth';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/timeline', label: 'Timeline', icon: LayoutGrid },
  { href: '/ranking', label: 'Ranking', icon: Trophy },
  { href: '/meu-desempenho', label: 'Meu desempenho', icon: User },
];

export async function Header() {
  const ctx = await getAuthHeaderContext();
  if (!ctx) return null;

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-border-subtle">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full',
                  'text-body-sm font-semibold text-text-secondary',
                  'transition-all duration-base ease-out-quart',
                  'hover:bg-surface-sunken hover:text-text-primary'
                )}
              >
                <Icon className="h-4 w-4 opacity-70" />
                {label}
              </Link>
            ))}
            {ctx.isAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full ml-2 bg-text-primary text-white text-body-sm font-semibold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-base ease-out-quart"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Admin
              </Link>
            )}
          </nav>
        </div>
        <UserMenu
          user={ctx.user}
          fullName={ctx.fullName}
          avatarUrl={ctx.avatarUrl}
        />
      </div>
    </header>
  );
}