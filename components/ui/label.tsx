import * as React from 'react';
import { cn } from '@/lib/utils';

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }>(
  ({ className, children, required, ...props }, ref) => (
    <label ref={ref} className={cn('text-body-sm font-medium text-text-primary', className)} {...props}>
      {children}{required && <span aria-hidden className="text-state-error ml-0.5">*</span>}
    </label>
  )
);
Label.displayName = 'Label';