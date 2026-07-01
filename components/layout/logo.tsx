import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ size = 'md', href = '/timeline' }: { size?: 'sm' | 'md' | 'lg'; href?: string }) {
  const sizes = {
    sm: 'text-h4',
    md: 'text-h3',
    lg: 'text-h1',
  };
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-2 font-extrabold tracking-tighter leading-none',
        sizes[size]
      )}
      aria-label="SEBRAEIERS — início"
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-atlantico-cobalto text-white shadow-sm transition-transform duration-base ease-out-quart group-hover:rotate-6 group-hover:scale-105">
        <span className="text-caption font-black">S</span>
      </span>
      <span className="text-text-primary">
        SEBRAE<span className="bg-gradient-atlantico-cobalto bg-clip-text text-transparent">iers</span>
      </span>
    </Link>
  );
}