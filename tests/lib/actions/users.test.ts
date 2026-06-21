import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next/navigation', () => ({ redirect: vi.fn(), revalidatePath: vi.fn() }));

const getUserMock = vi.fn();
const fromMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: getUserMock }, from: fromMock }),
}));

import { toggleUserActiveAction, toggleUserAdminAction } from '@/app/actions/users';

function chain(value: any) {
  return { select: () => chain(value), eq: () => chain(value), maybeSingle: () => Promise.resolve(value), update: () => chain(value) };
}

describe('user admin actions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('rejects non-admin', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation(() => chain({ data: { is_admin: false }, error: null }));
    const res = await toggleUserActiveAction('u2', false);
    expect(res.ok).toBe(false);
  });

  it('prevents self-deactivation', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation(() => chain({ data: { is_admin: true }, error: null }));
    const res = await toggleUserActiveAction('u1', false);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected failure');
    expect(res.error).toMatch(/própria conta/);
  });

  it('passes last-admin trigger as 42501', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    let call = 0;
    fromMock.mockImplementation(() => {
      call++;
      if (call === 1) return chain({ data: { is_admin: true }, error: null });
      return {
        update: () => ({
          eq: () => Promise.resolve({ data: null, error: { code: '42501', message: 'forbidden' } }),
        }),
      };
    });
    const res = await toggleUserAdminAction('u2', false);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected failure');
    expect(res.error).toMatch(/último admin/);
  });
});
