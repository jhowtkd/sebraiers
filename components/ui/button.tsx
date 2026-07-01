import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'hero' | 'secondary' | 'ghost' | 'destructive' | 'social';
type Size = 'sm' | 'md' | 'lg';

const base =
  'relative inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight ' +
  'transition-all duration-base ease-out-quart ' +
  'disabled:opacity-50 disabled:pointer-events-none ' +
  'focus-visible:outline-none focus-visible:shadow-focus ' +
  'active:scale-[0.97] active:duration-instant';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-azul text-white shadow-sm hover:bg-brand-azul-600 hover:shadow-md hover:-translate-y-0.5',
  hero:
    'bg-gradient-atlantico-cobalto text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 ' +
    'before:absolute before:inset-0 before:rounded-full before:bg-white before:opacity-0 ' +
    'hover:before:opacity-10 before:transition-opacity',
  secondary:
    'bg-surface-elevated text-text-primary border border-border-subtle shadow-xs ' +
    'hover:bg-surface-sunken hover:border-border-strong/20 hover:-translate-y-0.5',
  ghost:
    'bg-transparent text-text-primary hover:bg-surface-sunken',
  destructive:
    'bg-state-error text-white shadow-sm hover:bg-state-error-strong hover:-translate-y-0.5',
  social:
    'bg-surface-elevated text-text-primary border border-border-subtle shadow-xs ' +
    'hover:border-brand-azul/40 hover:shadow-glow-azul',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-body-sm',
  md: 'h-11 px-5 text-body',
  lg: 'h-14 px-7 text-body-lg',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, fullWidth, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading && (
        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      )}
      {children}
    </button>
  )
);
Button.displayName = 'Button';