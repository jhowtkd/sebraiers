import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const getUserMock = vi.fn();
const fromMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: getUserMock }, from: fromMock }),
}));

import { declareCheckinAction } from '@/app/actions/checkins';

function chain(value: any) {
  return { select: () => chain(value), eq: () => chain(value), maybeSingle: () => Promise.resolve(value) };
}

describe('declareCheckinAction', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('requires auth', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await declareCheckinAction({ post_id: '11111111-1111-1111-1111-111111111111', action: 'like' });
    expect(res.ok).toBe(false);
  });

  it('rejects invalid uuid', async () => {
    const res = await declareCheckinAction({ post_id: 'not-uuid', action: 'like' });
    expect(res.ok).toBe(false);
  });

  it('inserts checkin successfully', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation((table: string) => {
      if (table === 'posts') return chain({ data: { id: 'p1', is_active: true }, error: null });
      if (table === 'checkins') return { insert: () => Promise.resolve({ data: null, error: null }) };
      return chain({ data: null, error: null });
    });
    const res = await declareCheckinAction({ post_id: '11111111-1111-1111-1111-111111111111', action: 'comment' });
    expect(res.ok).toBe(true);
  });

  it('rejects duplicate (unique constraint)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation((table: string) => {
      if (table === 'posts') return chain({ data: { id: 'p1', is_active: true }, error: null });
      if (table === 'checkins') return { insert: () => Promise.resolve({ data: null, error: { code: '23505', message: 'dup' } }) };
      return chain({ data: null, error: null });
    });
    const res = await declareCheckinAction({ post_id: '11111111-1111-1111-1111-111111111111', action: 'share' });
    if (!res.ok) {
      expect(res.error).toMatch(/já declarou/);
    } else {
      throw new Error('expected error result');
    }
  });
});
