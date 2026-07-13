import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next/navigation', () => ({ redirect: vi.fn((u: string) => { throw new Error('NEXT_REDIRECT:' + u); }), revalidatePath: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const getUserMock = vi.fn();
const fromMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: getUserMock }, from: fromMock }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ storage: { from: () => ({ upload: vi.fn().mockResolvedValue({ error: null }), getPublicUrl: () => ({ data: { publicUrl: 'https://x' } }) }) } }),
}));
vi.mock('@/lib/cover-image-fetch', () => ({
  mirrorCoverToStorage: vi.fn().mockResolvedValue(null),
}));

import { createPostAction } from '@/app/actions/posts';

describe('createPostAction', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('rejects non-admin', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation(() => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { is_admin: false }, error: null }) }) }) }));
    const fd = new FormData();
    fd.set('title', 'ok'); fd.set('network', 'instagram'); fd.set('original_url', 'https://x'); fd.set('published_at', '2026-06-21T00:00');
    const res = await createPostAction(null, fd);
    expect(res.ok).toBe(false);
  });

  it('creates post as admin', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    let profileCall = 0, insertCall = 0;
    fromMock.mockImplementation(() => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { is_admin: true }, error: null }) }) }),
      insert: () => { insertCall++; return Promise.resolve({ error: null }); },
    }));
    const fd = new FormData();
    fd.set('title', 'Teste de post');
    fd.set('network', 'instagram');
    fd.set('original_url', 'https://instagram.com/p/x');
    fd.set('published_at', '2026-06-21T00:00');
    await expect(createPostAction(null, fd)).rejects.toThrow('NEXT_REDIRECT:/admin/posts');
    expect(insertCall).toBeGreaterThan(0);
  });

  it('creates active post when checkbox is checked (hidden+checkbox form pattern)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    let inserted: Record<string, unknown> | null = null;
    fromMock.mockImplementation((table: string) => {
      if (table !== 'posts') return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { is_admin: true }, error: null }) }) }) };
      return {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { is_admin: true }, error: null }) }) }),
        insert: (row: Record<string, unknown>) => { inserted = row; return Promise.resolve({ error: null }); },
      };
    });
    const fd = new FormData();
    fd.append('is_active', 'false');
    fd.append('is_active', 'on');
    fd.set('title', 'Post ativo');
    fd.set('network', 'instagram');
    fd.set('original_url', 'https://instagram.com/p/x');
    fd.set('published_at', '2026-06-21T00:00');
    await expect(createPostAction(null, fd)).rejects.toThrow('NEXT_REDIRECT:/admin/posts');
    expect(inserted?.is_active).toBe(true);
  });

  it('uploads cover_file when present in FormData', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    let inserted: Record<string, unknown> | null = null;
    fromMock.mockImplementation((table: string) => {
      if (table !== 'posts') return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { is_admin: true }, error: null }) }) }) };
      return {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { is_admin: true }, error: null }) }) }),
        insert: (row: Record<string, unknown>) => { inserted = row; return Promise.resolve({ error: null }); },
      };
    });
    const fd = new FormData();
    fd.set('title', 'Com capa');
    fd.set('network', 'instagram');
    fd.set('original_url', 'https://instagram.com/p/x');
    fd.set('published_at', '2026-06-21T00:00');
    fd.set('cover_file', new File([new Uint8Array([1, 2, 3])], 'capa.jpg', { type: 'image/jpeg' }));
    await expect(createPostAction(null, fd)).rejects.toThrow('NEXT_REDIRECT:/admin/posts');
    expect(inserted?.cover_url).toBe('https://x');
  });
});
