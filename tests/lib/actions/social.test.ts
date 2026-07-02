import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

// Mock supabase server client BEFORE importing the actions.
// `rpc` backs the reaction (toggle_*) actions; `from` backs the comment (insert) actions.
const getUserMock = vi.fn();
const fromMock = vi.fn();
const rpcMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
    rpc: rpcMock,
  })),
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

beforeEach(() => {
  vi.clearAllMocks();
  // Default to an authenticated user for all suites.
  getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });
});

describe('setPostReactionAction (via toggle_post_reaction RPC)', () => {
  beforeEach(() => rpcMock.mockReset());

  it('returns reaction set when RPC returns "set"', async () => {
    rpcMock.mockResolvedValueOnce({ data: 'set', error: null });
    const res = await setPostReactionAction({ post_id: '11111111-1111-1111-1111-111111111111', reaction: 'fire' });
    expect(res.ok).toBe(true);
    expect(res.reaction).toBe('fire');
    expect(rpcMock).toHaveBeenCalledWith('toggle_post_reaction', {
      p_post_id: '11111111-1111-1111-1111-111111111111',
      p_user_id: 'user-1',
      p_reaction: 'fire',
    });
  });

  it('returns reaction null when RPC returns "removed" (toggle off)', async () => {
    rpcMock.mockResolvedValueOnce({ data: 'removed', error: null });
    const res = await setPostReactionAction({ post_id: '11111111-1111-1111-1111-111111111111', reaction: 'fire' });
    expect(res.ok).toBe(true);
    expect(res.reaction).toBeNull();
  });

  it('returns ok:false on RPC error', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const res = await setPostReactionAction({ post_id: '11111111-1111-1111-1111-111111111111', reaction: 'fire' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('Erro ao reagir');
  });

  it('rejects invalid reaction kind before calling RPC', async () => {
    const res = await setPostReactionAction({ post_id: '11111111-1111-1111-1111-111111111111', reaction: 'invalid' });
    expect(res.ok).toBe(false);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe('addPostCommentAction', () => {
  it('rejects invalid input', async () => {
    const res = await addPostCommentAction({ post_id: 'not-uuid', body: 'oi' });
    expect(res.ok).toBe(false);
  });

  it('inserts comment successfully', async () => {
    fromMock.mockImplementation(() => chain({ data: null, error: null }));
    const res = await addPostCommentAction({ post_id: '11111111-1111-1111-1111-111111111111', body: 'Arrasou!' });
    expect(res.ok).toBe(true);
  });

  it('rejects too-long body', async () => {
    const res = await addPostCommentAction({ post_id: '11111111-1111-1111-1111-111111111111', body: 'a'.repeat(501) });
    expect(res.ok).toBe(false);
  });
});

describe('setCheckinReactionAction (via toggle_checkin_reaction RPC)', () => {
  beforeEach(() => rpcMock.mockReset());

  it('returns reaction set when RPC returns "set"', async () => {
    rpcMock.mockResolvedValueOnce({ data: 'set', error: null });
    const res = await setCheckinReactionAction({ checkin_id: '22222222-2222-2222-2222-222222222222', reaction: 'clap' });
    expect(res.ok).toBe(true);
    expect(res.reaction).toBe('clap');
  });

  it('returns reaction null when toggled off', async () => {
    rpcMock.mockResolvedValueOnce({ data: 'removed', error: null });
    const res = await setCheckinReactionAction({ checkin_id: '22222222-2222-2222-2222-222222222222', reaction: 'clap' });
    expect(res.ok).toBe(true);
    expect(res.reaction).toBeNull();
  });
});

describe('addCheckinCommentAction', () => {
  it('inserts comment successfully', async () => {
    fromMock.mockImplementation(() => chain({ data: null, error: null }));
    const res = await addCheckinCommentAction({ checkin_id: '11111111-1111-1111-1111-111111111111', body: 'Tamo junto!' });
    expect(res.ok).toBe(true);
  });
});
