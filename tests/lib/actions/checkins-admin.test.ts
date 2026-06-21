import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const getUserMock = vi.fn();
const fromMock = vi.fn();
const rpcMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: { getUser: getUserMock },
    from: fromMock,
    rpc: rpcMock,
  }),
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
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('approves as admin via RPC', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation(() => chain({ data: { is_admin: true }, error: null }));
    rpcMock.mockResolvedValue({ data: { id: '11111111-1111-1111-1111-111111111111', status: 'approved' }, error: null });
    const res = await decideCheckinAction({
      checkin_id: '11111111-1111-1111-1111-111111111111',
      decision: 'approved',
    });
    expect(res.ok).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('decide_checkin', {
      p_checkin_id: '11111111-1111-1111-1111-111111111111',
      p_decision: 'approved',
      p_admin_id: 'u1',
      p_note: null,
    });
  });

  it('returns friendly error when RPC signals checkin_not_pending (P0002)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation(() => chain({ data: { is_admin: true }, error: null }));
    rpcMock.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'checkin_not_pending' } });
    const res = await decideCheckinAction({
      checkin_id: '11111111-1111-1111-1111-111111111111',
      decision: 'approved',
    });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected failure');
    expect(res.error).toBe('Este check-in já foi decidido.');
  });

  it('returns generic error for other RPC failures', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation(() => chain({ data: { is_admin: true }, error: null }));
    rpcMock.mockResolvedValue({ data: null, error: { code: '42501', message: 'forbidden' } });
    const res = await decideCheckinAction({
      checkin_id: '11111111-1111-1111-1111-111111111111',
      decision: 'approved',
    });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected failure');
    expect(res.error).toBe('Erro ao processar decisão.');
  });
});
