import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
const variants: Record<Variant, string> = {
  default: 'bg-surface-sunken text-text-primary',
  success: 'bg-state-success/10 text-state-success-strong',
  warning: 'bg-state-warning/30 text-state-warning-strong',
  error: 'bg-state-error/10 text-state-error-strong',
  info: 'bg-state-info/10 text-state-info-strong',
  neutral: 'bg-surface-sunken text-text-secondary',
};

export function Badge({ variant = 'default', className, ...p }: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium', variants[variant], className)} {...p} />;
}