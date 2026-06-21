import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const getUserMock = vi.fn();
const fromMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: getUserMock }, from: fromMock }),
}));

import { setPostReactionAction, addPostCommentAction, setCheckinReactionAction, addCheckinCommentAction } from '@/app/actions/social';

function chain(value: any) {
  const obj: any = {
    select: () => obj,
    eq: () => obj,
    in: () => obj,
    delete: () => obj,
    insert: () => obj,
    then: (resolve: any, reject: any) => Promise.resolve(value).then(resolve, reject),
  };
  return obj;
}

beforeEach(() => { vi.clearAllMocks(); });

describe('setPostReactionAction', () => {
  it('rejects unauthenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await setPostReactionAction({ post_id: '11111111-1111-1111-1111-111111111111', reaction: 'fire' });
    expect(res.ok).toBe(false);
  });

  it('rejects invalid reaction', async () => {
    const res = await setPostReactionAction({ post_id: '11111111-1111-1111-1111-111111111111', reaction: 'banana' as any });
    expect(res.ok).toBe(false);
  });

  it('removes existing reaction if user re-clicks the same one', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    let call = 0;
    fromMock.mockImplementation(() => {
      call++;
      if (call === 1) return chain({ data: [{ reaction: 'fire' }], error: null });
      return chain({ data: null, error: null });
    });
    const res = await setPostReactionAction({ post_id: '11111111-1111-1111-1111-111111111111', reaction: 'fire' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.reaction).toBe(null);
  });

  it('inserts when user has no current reaction', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    let call = 0;
    fromMock.mockImplementation(() => {
      call++;
      if (call === 1) return chain({ data: [], error: null });
      return chain({ data: null, error: null });
    });
    const res = await setPostReactionAction({ post_id: '11111111-1111-1111-1111-111111111111', reaction: 'muscle' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.reaction).toBe('muscle');
  });

  it('replaces current reaction when user clicks a different one', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    let call = 0;
    fromMock.mockImplementation(() => {
      call++;
      if (call === 1) return chain({ data: [{ reaction: 'fire' }], error: null });
      if (call === 2) return chain({ data: null, error: null });
      return chain({ data: null, error: null });
    });
    const res = await setPostReactionAction({ post_id: '11111111-1111-1111-1111-111111111111', reaction: 'laugh' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.reaction).toBe('laugh');
  });
});

describe('addPostCommentAction', () => {
  it('rejects invalid input', async () => {
    const res = await addPostCommentAction({ post_id: 'not-uuid', body: 'oi' });
    expect(res.ok).toBe(false);
  });

  it('inserts comment successfully', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation(() => chain({ data: null, error: null }));
    const res = await addPostCommentAction({ post_id: '11111111-1111-1111-1111-111111111111', body: 'Arrasou!' });
    expect(res.ok).toBe(true);
  });

  it('rejects too-long body', async () => {
    const res = await addPostCommentAction({ post_id: '11111111-1111-1111-1111-111111111111', body: 'a'.repeat(501) });
    expect(res.ok).toBe(false);
  });
});

describe('setCheckinReactionAction', () => {
  it('inserts clap on approved checkin', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    let call = 0;
    fromMock.mockImplementation(() => {
      call++;
      if (call === 1) return chain({ data: [], error: null });
      return chain({ data: null, error: null });
    });
    const res = await setCheckinReactionAction({ checkin_id: '11111111-1111-1111-1111-111111111111', reaction: 'clap' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.reaction).toBe('clap');
  });

  it('rejects non-clap reaction', async () => {
    const res = await setCheckinReactionAction({ checkin_id: '11111111-1111-1111-1111-111111111111', reaction: 'fire' as any });
    expect(res.ok).toBe(false);
  });
});

describe('addCheckinCommentAction', () => {
  it('inserts comment successfully', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation(() => chain({ data: null, error: null }));
    const res = await addCheckinCommentAction({ checkin_id: '11111111-1111-1111-1111-111111111111', body: 'Tamo junto!' });
    expect(res.ok).toBe(true);
  });
});
