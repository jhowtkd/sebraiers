import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Supabase server client used by the action.
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

// Mock getCurrentProfile to control is_admin.
const mockGetCurrentProfile = vi.fn();
vi.mock('@/lib/auth', () => ({
  getCurrentProfile: mockGetCurrentProfile,
}));

describe('onboarding server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    // chain: from(table).update(values).eq(col, val)
    mockFrom.mockReturnValue({
      update: mockUpdate.mockReturnValue({
        eq: mockEq.mockResolvedValue({ error: null }),
      }),
    });
  });

  it('markOnboarded("user") updates only onboarded_at and succeeds', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'user-1', is_admin: false });
    const { markOnboarded } = await import('@/app/actions/onboarding');
    const res = await markOnboarded('user');
    expect(res).toEqual({ ok: true });
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith({ onboarded_at: expect.any(String) });
  });

  it('markOnboarded("admin") for non-admin returns forbidden', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'user-1', is_admin: false });
    const { markOnboarded } = await import('@/app/actions/onboarding');
    const res = await markOnboarded('admin');
    expect(res).toEqual({ ok: false, error: 'forbidden' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('markOnboarded("admin") for admin updates only admin_onboarded_at', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'user-1', is_admin: true });
    const { markOnboarded } = await import('@/app/actions/onboarding');
    const res = await markOnboarded('admin');
    expect(res).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({ admin_onboarded_at: expect.any(String) });
  });

  it('resetOnboarded("user") nulls onboarded_at and keeps admin flag intact', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'user-1', is_admin: false });
    const { resetOnboarded } = await import('@/app/actions/onboarding');
    const res = await resetOnboarded('user');
    expect(res).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({ onboarded_at: null });
  });

  it('returns unauthenticated when no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { markOnboarded } = await import('@/app/actions/onboarding');
    const res = await markOnboarded('user');
    expect(res).toEqual({ ok: false, error: 'unauthenticated' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});