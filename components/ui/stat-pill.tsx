import * as React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, Flame, Zap, Target } from 'lucide-react';

type Tone = 'azul' | 'ceu' | 'begonia' | 'jacaranda' | 'taiti' | 'ouro';

const toneStyles: Record<Tone, string> = {
  azul: 'bg-brand-azul-50 text-brand-azul-700',
  ceu: 'bg-brand-ceu/15 text-state-info-strong',
  begonia: 'bg-[#FFE5F2] text-[#9C2E6F]',
  jacaranda: 'bg-[#ECE9FB] text-[#4030A8]',
  taiti: 'bg-[#E6F4D8] text-[#3E6B26]',
  ouro: 'bg-tier-ouro-soft text-[#7A5B12]',
};

const sizeStyles = {
  sm: 'h-7 px-2.5 text-caption gap-1.5',
  md: 'h-9 px-3.5 text-body-sm gap-2',
  lg: 'h-12 px-4 text-body gap-2',
} as const;

export function StatPill({
  value,
  label,
  tone = 'azul',
  size = 'md',
  icon,
  trend,
  className,
}: {
  value: string | number;
  label?: string;
  tone?: Tone;
  size?: keyof typeof sizeStyles;
  icon?: 'trend' | 'streak' | 'energy' | 'target';
  trend?: number;
  className?: string;
}) {
  const Icon =
    icon === 'trend'
      ? TrendingUp
      : icon === 'streak'
      ? Flame
      : icon === 'energy'
      ? Zap
      : icon === 'target'
      ? Target
      : null;
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-bold tabular-nums',
        toneStyles[tone],
        sizeStyles[size],
        className
      )}
    >
      {Icon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />}
      <span className="leading-none">{value}</span>
      {label && <span className="font-medium opacity-70 leading-none">{label}</span>}
      {trend !== undefined && (
        <span className={cn('ml-1 text-caption font-semibold tabular-nums', trend >= 0 ? 'opacity-80' : 'opacity-60')}>
          {trend >= 0 ? '+' : ''}
          {trend}
        </span>
      )}
    </div>
  );
}