import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-azul text-white hover:bg-brand-azul-600 focus-visible:shadow-focus',
  secondary: 'bg-surface-elevated text-text-primary border border-border-subtle hover:bg-surface-sunken',
  ghost: 'text-text-primary hover:bg-surface-sunken',
  destructive: 'bg-state-error text-white hover:bg-state-error-strong',
};
const sizes: Record<Size, string> = { sm: 'h-8 px-3 text-body-sm', md: 'h-10 px-4 text-body', lg: 'h-12 px-6 text-body-lg' };

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant], sizes[size], className
      )}
      {...props}
    >
      {loading && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';