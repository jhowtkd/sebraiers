import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const getUserMock = vi.fn();
const fromMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: getUserMock }, from: fromMock }),
}));

import { decideCheckinAction } from '@/app/actions/checkins';

function chain(value: any) {
  return {
    select: () => chain(value),
    eq: () => chain(value),
    maybeSingle: () => Promise.resolve(value),
    update: () => chain(value),
    insert: () => Promise.resolve(value),
  };
}

describe('decideCheckinAction', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('rejects non-admin', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation(() => chain({ data: { is_admin: false }, error: null }));
    const res = await decideCheckinAction({
      checkin_id: '11111111-1111-1111-1111-111111111111',
      decision: 'approved',
    });
    expect(res.ok).toBe(false);
  });

  it('approves as admin', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    let call = 0;
    fromMock.mockImplementation((table: string) => {
      call++;
      if (call === 1) return chain({ data: { is_admin: true }, error: null });
      if (table === 'checkins') return chain({ data: { user_id: 'u2' }, error: null });
      if (table === 'checkin_approvals') return chain({ data: null, error: null });
      return chain({ data: null, error: null });
    });
    const res = await decideCheckinAction({
      checkin_id: '11111111-1111-1111-1111-111111111111',
      decision: 'approved',
    });
    expect(res.ok).toBe(true);
  });
});
