import { describe, it, expect } from 'vitest';
import { formatPoints, initials, cn } from '@/lib/utils';

describe('formatPoints', () => {
  it('formats with pt-BR thousands separator', () => {
    expect(formatPoints(1234)).toBe('1.234');
  });
});

describe('initials', () => {
  it('takes first letters of first two words', () => {
    expect(initials('Maria Silva')).toBe('MS');
    expect(initials('João')).toBe('J');
  });
});

describe('cn', () => {
  it('merges and dedupes classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
