import { cn } from '@/lib/utils';
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('rounded-md bg-gradient-to-r from-surface-sunken via-surface-canvas to-surface-sunken bg-[length:200%_100%] animate-shimmer', className)} />;
}