import * as React from 'react';
import { cn } from '@/lib/utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-xl bg-surface-elevated shadow-sm border border-border-subtle', className)} {...props} />
  )
);
Card.displayName = 'Card';

export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={cn('p-5 border-b border-border-subtle', className)} {...p} />;

export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) =>
  <h3 className={cn('text-h4 text-text-primary', className)} {...p} />;

export const CardBody = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={cn('p-5', className)} {...p} />;

export const CardFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={cn('p-5 border-t border-border-subtle', className)} {...p} />;