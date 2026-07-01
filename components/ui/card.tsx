import * as React from 'react';
import { cn } from '@/lib/utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl bg-surface-elevated border border-border-subtle shadow-xs ' +
          'transition-all duration-base ease-out-quart',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export const CardHover = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl bg-surface-elevated border border-border-subtle shadow-xs ' +
          'transition-all duration-base ease-out-quart ' +
          'hover:shadow-md hover:-translate-y-0.5 hover:border-border-strong/15',
        className
      )}
      {...props}
    />
  )
);
CardHover.displayName = 'CardHover';

export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={cn('p-6 border-b border-border-subtle', className)} {...p} />;

export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) =>
  <h3 className={cn('text-h4 font-bold text-text-primary', className)} {...p} />;

export const CardBody = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={cn('p-6', className)} {...p} />;

export const CardFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={cn('p-6 border-t border-border-subtle', className)} {...p} />;