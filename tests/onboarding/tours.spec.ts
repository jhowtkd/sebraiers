import { describe, it, expect } from 'vitest';
import { userTourSteps } from '@/lib/onboarding/user-tour';
import { adminTourSteps } from '@/lib/onboarding/admin-tour';

describe('onboarding tours', () => {
  it('userTourSteps has exactly 5 steps', () => {
    expect(userTourSteps).toHaveLength(5);
  });

  it('adminTourSteps has exactly 4 steps', () => {
    expect(adminTourSteps).toHaveLength(4);
  });

  it.each([
    ['userTourSteps', 'userTourSteps' as const],
    ['adminTourSteps', 'adminTourSteps' as const],
  ])('%s has valid step shape', (_name, source) => {
    const steps = source === 'userTourSteps' ? userTourSteps : adminTourSteps;
    for (const step of steps) {
      expect(step.selector).toBeTruthy();
      expect(step.selector).toMatch(/^\[data-tour="/);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.title.length).toBeLessThanOrEqual(60);
      expect(step.body.length).toBeGreaterThan(0);
      expect(step.body.length).toBeLessThanOrEqual(240);
    }
  });

  it('userTourSteps selectors are unique', () => {
    const selectors = userTourSteps.map((s) => s.selector);
    expect(new Set(selectors).size).toBe(selectors.length);
  });

  it('adminTourSteps selectors are unique', () => {
    const selectors = adminTourSteps.map((s) => s.selector);
    expect(new Set(selectors).size).toBe(selectors.length);
  });
});
