'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FileText, CheckCircle, Users, BarChart3 } from 'lucide-react';

const ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3 },
  { href: '/admin/posts', label: 'Publicações', icon: FileText },
  { href: '/admin/checkins', label: 'Aprovações', icon: CheckCircle },
  { href: '/admin/users', label: 'Usuários', icon: Users },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border-subtle bg-surface-elevated px-4 sm:px-6">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = path === href || (href !== '/admin' && path.startsWith(href));
        return (
          <Link key={href} href={href}
            data-tour={
              href === '/admin/posts'
                ? 'admin-posts'
                : href === '/admin/checkins'
                ? 'admin-checkins'
                : href === '/admin/users'
                ? 'admin-users'
                : undefined
            }
            className={cn(
              'flex items-center gap-2 px-3 py-3 text-body-sm font-medium border-b-2 -mb-px transition-colors',
              active ? 'border-brand-azul text-brand-azul' : 'border-transparent text-text-secondary hover:text-text-primary'
            )}>
            <Icon className="h-4 w-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}