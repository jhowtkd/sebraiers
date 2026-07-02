'use client';

import { useState, useRef, useEffect } from 'react';
import { signOutAction } from '@/app/actions/auth';
import { LogOut, User as UserIcon, Settings, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';

type Props = {
  user: User;
  fullName: string;
  avatarUrl?: string | null;
};

export function UserMenu({ user, fullName, avatarUrl }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-surface-sunken transition-colors duration-base ease-out-quart"
        aria-label="Menu do usuário"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar size="sm" name={fullName} src={avatarUrl ?? null} />
        <span className="hidden md:inline text-body-sm font-medium text-text-primary">
          {fullName.split(' ')[0]}
        </span>
        <ChevronDown
          className={cn(
            'hidden md:inline h-3.5 w-3.5 text-text-muted transition-transform duration-base',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-surface-elevated shadow-lg border border-border-subtle p-2 z-50 transition-all duration-base ease-out-quart"
        >
          <div className="p-3 mb-1 rounded-xl bg-surface-sunken/60">
            <p className="text-body-sm font-semibold text-text-primary">{fullName}</p>
            <p className="text-caption text-text-muted truncate">{user.email}</p>
          </div>
          <Link
            href="/meu-desempenho"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-sm font-medium text-text-primary hover:bg-surface-sunken transition-colors"
          >
            <UserIcon className="h-4 w-4 text-text-muted" /> Meu desempenho
          </Link>
          <Link
            href="/meu-desempenho#perfil"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-sm font-medium text-text-primary hover:bg-surface-sunken transition-colors"
          >
            <Settings className="h-4 w-4 text-text-muted" /> Configurações
          </Link>
          <div className="my-1 border-t border-border-subtle" />
          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-sm font-medium text-state-error-strong hover:bg-state-error/8 transition-colors"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
