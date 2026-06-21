import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const upsertMock = vi.fn();
const getUserMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: getUserMock }, from: () => ({ upsert: upsertMock }) }),
}));

import { updateSocialsAction } from '@/app/actions/profile';

describe('updateSocialsAction', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('rejects unauthenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const fd = new FormData();
    const res = await updateSocialsAction(null, fd);
    expect(res.ok).toBe(false);
  });

  it('upserts valid socials (strips @)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    upsertMock.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set('instagram', '@meuuser');
    const res = await updateSocialsAction(null, fd);
    expect(res.ok).toBe(true);
    expect(upsertMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1', instagram: 'meuuser' }));
  });
});
