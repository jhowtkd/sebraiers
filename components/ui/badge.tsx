import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'azul'
  | 'atlantico'
  | 'atlantico-inverse';

const variants: Record<Variant, string> = {
  default: 'bg-surface-sunken text-text-primary',
  success: 'bg-state-success/12 text-state-success-strong',
  warning: 'bg-tier-ouro-soft text-state-warning-strong',
  error: 'bg-state-error/12 text-state-error-strong',
  info: 'bg-brand-ceu/15 text-state-info-strong',
  neutral: 'bg-surface-sunken text-text-secondary',
  azul: 'bg-brand-azul-50 text-brand-azul-700',
  atlantico: 'bg-brand-atlantico text-white',
  'atlantico-inverse': 'bg-white/15 text-white backdrop-blur',
};

export function Badge({
  variant = 'default',
  className,
  ...p
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-caption font-semibold tracking-tight',
        variants[variant],
        className
      )}
      {...p}
    />
  );
}