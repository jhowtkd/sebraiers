import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-border-subtle bg-surface-elevated px-3 text-body',
        'placeholder:text-text-muted focus:outline-none focus:border-brand-azul focus:shadow-focus',
        'disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';