import * as React from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({ icon, title, description, action, className }: {
  icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center p-10 rounded-xl bg-surface-canvas border border-dashed border-border-subtle', className)}>
      {icon && <div className="mb-4 text-text-muted">{icon}</div>}
      <h3 className="text-h4 text-text-primary">{title}</h3>
      {description && <p className="mt-1 text-body text-text-secondary max-w-md">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}