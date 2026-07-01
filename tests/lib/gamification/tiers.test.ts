import { describe, it, expect } from 'vitest';
import {
  tierForPoints,
  nextTierForPoints,
  tierProgressPercent,
  TIER_THRESHOLDS,
} from '@/lib/gamification/tiers';

describe('tierForPoints', () => {
  it('assigns bronze from 0', () => {
    expect(tierForPoints(0)).toBe('bronze');
    expect(tierForPoints(99)).toBe('bronze');
  });

  it('assigns prata at 100', () => {
    expect(tierForPoints(100)).toBe('prata');
  });

  it('assigns diamante at 1000+', () => {
    expect(tierForPoints(1000)).toBe('diamante');
    expect(tierForPoints(5000)).toBe('diamante');
  });
});

describe('nextTierForPoints', () => {
  it('returns prata as next from bronze', () => {
    expect(nextTierForPoints(50)).toEqual({ tier: 'prata', points: TIER_THRESHOLDS.prata });
  });

  it('returns null at max tier', () => {
    expect(nextTierForPoints(2000)).toBeNull();
  });
});

describe('tierProgressPercent', () => {
  it('is 0 at tier floor', () => {
    expect(tierProgressPercent(0)).toBe(0);
  });

  it('is 100 at max tier', () => {
    expect(tierProgressPercent(1000)).toBe(100);
  });

  it('is halfway between bronze and prata at 50 pts', () => {
    expect(tierProgressPercent(50)).toBe(50);
  });
});
