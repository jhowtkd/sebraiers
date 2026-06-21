import { describe, it, expect } from 'vitest';
import { sortRanking, rankPosition } from '@/lib/ranking';

const base = {
  user_id: '',
  username: '',
  full_name: '',
  avatar_url: null,
  approved_checkins: 1,
  last_approved_at: null,
};

describe('sortRanking', () => {
  it('orders by total_points desc', () => {
    const out = sortRanking([
      { ...base, user_id: 'a', username: 'a', total_points: 5 },
      { ...base, user_id: 'b', username: 'b', total_points: 10 },
      { ...base, user_id: 'c', username: 'c', total_points: 1 },
    ]);
    expect(out.map((r) => r.user_id)).toEqual(['b', 'a', 'c']);
  });

  it('breaks ties by last_approved_at desc', () => {
    const out = sortRanking([
      { ...base, user_id: 'a', username: 'a', total_points: 5, last_approved_at: '2026-01-01T00:00:00Z' },
      { ...base, user_id: 'b', username: 'b', total_points: 5, last_approved_at: '2026-06-01T00:00:00Z' },
    ]);
    expect(out[0].user_id).toBe('b');
  });

  it('breaks further ties by username asc', () => {
    const out = sortRanking([
      { ...base, user_id: 'a', username: 'zoe', total_points: 5, last_approved_at: '2026-01-01T00:00:00Z' },
      { ...base, user_id: 'b', username: 'anna', total_points: 5, last_approved_at: '2026-01-01T00:00:00Z' },
    ]);
    expect(out[0].user_id).toBe('b');
  });
});

describe('rankPosition', () => {
  it('returns 1-based position', () => {
    const rows = sortRanking([
      { ...base, user_id: 'a', username: 'a', total_points: 5 },
      { ...base, user_id: 'b', username: 'b', total_points: 10 },
    ]);
    expect(rankPosition(rows, 'b')).toBe(1);
    expect(rankPosition(rows, 'a')).toBe(2);
  });

  it('returns 0 for unknown user', () => {
    expect(rankPosition([], 'x')).toBe(0);
  });
});
