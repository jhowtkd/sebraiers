import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ size = 'md', href = '/timeline' }: { size?: 'sm' | 'md' | 'lg'; href?: string }) {
  const sizes = { sm: 'text-h4', md: 'text-h3', lg: 'text-h1' };
  return (
    <Link href={href} className={cn('font-extrabold tracking-tight text-text-primary', sizes[size])}>
      SEBRAE<span className="text-brand-ceu">iers</span>
    </Link>
  );
}