import * as React from 'react';
import { cn } from '@/lib/utils';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-20 w-full rounded-md border border-border-subtle bg-surface-elevated p-3 text-body',
        'placeholder:text-text-muted focus:outline-none focus:border-brand-azul focus:shadow-focus',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';