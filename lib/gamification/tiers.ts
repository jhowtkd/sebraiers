export type Tier = 'bronze' | 'prata' | 'ouro' | 'platina' | 'diamante';

/** Minimum all-time points to reach each tier (bronze is the default from 0). */
export const TIER_THRESHOLDS: Record<Tier, number> = {
  bronze: 0,
  prata: 100,
  ouro: 250,
  platina: 500,
  diamante: 1000,
};

export const TIER_ORDER: Tier[] = ['bronze', 'prata', 'ouro', 'platina', 'diamante'];

export const TIER_LABELS: Record<Tier, string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
  platina: 'Platina',
  diamante: 'Diamante',
};

export function tierForPoints(points: number): Tier {
  if (points >= TIER_THRESHOLDS.diamante) return 'diamante';
  if (points >= TIER_THRESHOLDS.platina) return 'platina';
  if (points >= TIER_THRESHOLDS.ouro) return 'ouro';
  if (points >= TIER_THRESHOLDS.prata) return 'prata';
  return 'bronze';
}

export function nextTierForPoints(points: number): { tier: Tier; points: number } | null {
  const current = tierForPoints(points);
  const idx = TIER_ORDER.indexOf(current);
  const next = TIER_ORDER[idx + 1];
  if (!next) return null;
  return { tier: next, points: TIER_THRESHOLDS[next] };
}

/** Progress from current tier floor toward the next tier (0–100). */
export function tierProgressPercent(points: number): number {
  const next = nextTierForPoints(points);
  if (!next) return 100;
  const current = tierForPoints(points);
  const min = TIER_THRESHOLDS[current];
  const max = next.points;
  return Math.min(100, Math.max(0, ((points - min) / (max - min)) * 100));
}

/** Copy helper for tier legend (e.g. ranking hero). */
export function formatTierLegend(): string {
  return TIER_ORDER.map((t) => `${TIER_LABELS[t]} ${TIER_THRESHOLDS[t]}`).join(' · ');
}
