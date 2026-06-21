import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString('pt-BR', opts ?? { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.round((then - now) / 1000); // segundos
  const abs = Math.abs(diff);

  const fmt = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  if (abs < 60) return fmt.format(diff, 'second');
  if (abs < 3600) return fmt.format(Math.round(diff / 60), 'minute');
  if (abs < 86_400) return fmt.format(Math.round(diff / 3600), 'hour');
  if (abs < 2_592_000) return fmt.format(Math.round(diff / 86_400), 'day');
  return fmt.format(Math.round(diff / 2_592_000), 'month');
}

export function formatPoints(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(n);
}