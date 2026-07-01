import * as React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Crown, Gem, Star, Award } from 'lucide-react';
import {
  type Tier,
  tierForPoints,
  nextTierForPoints,
  tierProgressPercent,
  TIER_LABELS,
} from '@/lib/gamification/tiers';

export type { Tier } from '@/lib/gamification/tiers';
export { tierForPoints, nextTierForPoints } from '@/lib/gamification/tiers';

type StyleSpec = {
  label: string;
  bg: string;
  text: string;
  ring: string;
  icon: React.ComponentType<{ className?: string }>;
  glow?: string;
};

const STYLES: Record<Tier, StyleSpec> = {
  bronze: {
    label: TIER_LABELS.bronze,
    bg: 'bg-tier-bronze-soft',
    text: 'text-[#7C3A1F]',
    ring: 'ring-tier-bronze/40',
    icon: Award,
  },
  prata: {
    label: TIER_LABELS.prata,
    bg: 'bg-tier-prata-soft',
    text: 'text-[#3F4654]',
    ring: 'ring-tier-prata/50',
    icon: Star,
  },
  ouro: {
    label: TIER_LABELS.ouro,
    bg: 'bg-tier-ouro-soft',
    text: 'text-[#7A5B12]',
    ring: 'ring-tier-ouro/60',
    icon: Crown,
  },
  platina: {
    label: TIER_LABELS.platina,
    bg: 'bg-tier-platina-soft',
    text: 'text-[#7E2A6B]',
    ring: 'ring-tier-platina/50',
    icon: Sparkles,
  },
  diamante: {
    label: TIER_LABELS.diamante,
    bg: 'bg-tier-diamante-soft',
    text: 'text-[#4B2278]',
    ring: 'ring-tier-diamante/50',
    icon: Gem,
    glow: 'shadow-[0_0_0_4px_rgba(155,93,229,0.18)]',
  },
};

type Size = 'sm' | 'md' | 'lg';

const sizeMap: Record<Size, { chip: string; icon: string }> = {
  sm: { chip: 'h-6 px-2 text-[10px] gap-1', icon: 'h-3 w-3' },
  md: { chip: 'h-8 px-3 text-caption gap-1.5', icon: 'h-3.5 w-3.5' },
  lg: { chip: 'h-10 px-4 text-body-sm gap-2', icon: 'h-4 w-4' },
};

export function TierBadge({
  tier,
  size = 'md',
  className,
}: {
  tier: Tier;
  size?: Size;
  className?: string;
}) {
  const s = STYLES[tier];
  const sz = sizeMap[size];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold uppercase tracking-overline ring-1',
        s.bg,
        s.text,
        s.ring,
        sz.chip,
        s.glow,
        className
      )}
    >
      <Icon className={sz.icon} />
      {s.label}
    </span>
  );
}

export function TierProgress({ points, inverted = false }: { points: number; inverted?: boolean }) {
  const current = tierForPoints(points);
  const next = nextTierForPoints(points);
  const pct = tierProgressPercent(points);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <TierBadge tier={current} size="sm" />
        {next && (
          <span
            className={cn(
              'text-caption font-semibold',
              inverted ? 'text-white/85' : 'text-text-muted'
            )}
          >
            {next.points - points} pts pra {STYLES[next.tier].label}
          </span>
        )}
      </div>
      <div
        className={cn(
          'h-2 w-full overflow-hidden rounded-full',
          inverted ? 'bg-white/15' : 'bg-surface-sunken'
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-slower ease-out-quint',
            inverted ? 'bg-gradient-cobalto-ceu' : 'bg-gradient-cobalto-ceu'
          )}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
