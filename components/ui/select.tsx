import * as React from 'react';
import { cn } from '@/lib/utils';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-border-subtle bg-surface-elevated px-3 text-body appearance-none',
        'focus:outline-none focus:border-brand-azul focus:shadow-focus',
        className
      )}
      {...props}
    >{children}</select>
  )
);
Select.displayName = 'Select';