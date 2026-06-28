import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const fromMock = vi.fn();
const getUserMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: getUserMock }, from: fromMock }),
}));

vi.mock('@/lib/sync/sheets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/sync/sheets')>();
  return {
    ...actual,
    fetchSheetCSV: vi.fn(),
    parseColumns: vi.fn(),
    sha256: vi.fn(async (s: string) => `hash(${s})`),
  };
});

const fetchOgImageMock = vi.fn();
vi.mock('@/lib/sync/og-image', () => ({
  fetchOgImage: (...args: unknown[]) => fetchOgImageMock(...args),
}));

import { runSync } from '@/lib/sync';
import * as sheets from '@/lib/sync/sheets';

const mockSheets = sheets as unknown as {
  fetchSheetCSV: ReturnType<typeof vi.fn>;
  parseColumns: ReturnType<typeof vi.fn>;
};

type ExistingPost = { id: string; cover_url?: string | null; external_id: string };

function postsQuery(opts: {
  existing?: ExistingPost[];
  inError?: { message: string };
  upsertError?: { message: string };
}) {
  return {
    select: () => ({
      in: () =>
        opts.inError
          ? Promise.resolve({ data: null, error: opts.inError })
          : Promise.resolve({ data: opts.existing ?? [], error: null }),
    }),
    upsert: () => Promise.resolve({ data: null, error: opts.upsertError ?? null }),
  };
}

describe('runSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchOgImageMock.mockResolvedValue(null);
  });

  it('creates new posts for new rows', async () => {
    mockSheets.fetchSheetCSV.mockResolvedValueOnce([{ link_post: 'u1', titulo: 'A' }]);
    mockSheets.parseColumns.mockReturnValueOnce([
      {
        original_url: 'https://x.com/1',
        title: 'A',
        published_at: '2025-01-01T00:00:00.000Z',
        network: 'instagram',
      },
    ]);
    fetchOgImageMock.mockResolvedValueOnce('https://img.jpg');
    fromMock.mockImplementation((table: string) => {
      if (table === 'posts') return postsQuery({ existing: [] });
      return {};
    });
    const summary = await runSync({ sheetId: 's', gid: '0', adminId: 'a1' });
    expect(summary.created).toBe(1);
    expect(summary.updated).toBe(0);
    expect(summary.skipped_stories).toBe(0);
    expect(summary.errors).toBe(0);
    expect(summary.og_images_found).toBe(1);
  });

  it('skips story URLs', async () => {
    mockSheets.fetchSheetCSV.mockResolvedValueOnce([{ link_post: 'u1' }]);
    mockSheets.parseColumns.mockReturnValueOnce([
      {
        original_url: 'https://www.instagram.com/stories/user/123/',
        title: 'Story',
        published_at: '2025-01-01T00:00:00.000Z',
        network: 'instagram',
      },
    ]);
    const summary = await runSync({ sheetId: 's', gid: '0', adminId: 'a1' });
    expect(summary.skipped_stories).toBe(1);
    expect(summary.created).toBe(0);
    expect(summary.updated).toBe(0);
    expect(summary.errors).toBe(0);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('updates existing post by external_id', async () => {
    mockSheets.fetchSheetCSV.mockResolvedValueOnce([{ link_post: 'u1' }]);
    mockSheets.parseColumns.mockReturnValueOnce([
      {
        original_url: 'https://x.com/1',
        title: 'Updated',
        published_at: '2025-01-01T00:00:00.000Z',
        network: 'instagram',
      },
    ]);
    fromMock.mockImplementation((table: string) => {
      if (table === 'posts') {
        return postsQuery({
          existing: [{ id: 'p-existing', cover_url: 'https://existing.jpg', external_id: 'hash(https://x.com/1)' }],
        });
      }
      return {};
    });
    const summary = await runSync({ sheetId: 's', gid: '0', adminId: 'a1' });
    expect(summary.updated).toBe(1);
    expect(summary.created).toBe(0);
    expect(summary.errors).toBe(0);
    expect(fetchOgImageMock).not.toHaveBeenCalled();
  });

  it('reports errors when upsert fails', async () => {
    mockSheets.fetchSheetCSV.mockResolvedValueOnce([{ link_post: 'u1' }]);
    mockSheets.parseColumns.mockReturnValueOnce([
      {
        original_url: 'https://x.com/1',
        title: 'A',
        published_at: '2025-01-01T00:00:00.000Z',
        network: 'instagram',
      },
    ]);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fromMock.mockImplementation((table: string) => {
      if (table === 'posts') return postsQuery({ existing: [], upsertError: { message: 'db down' } });
      return {};
    });
    const summary = await runSync({ sheetId: 's', gid: '0', adminId: 'a1' });
    errSpy.mockRestore();
    expect(summary.errors).toBe(1);
    expect(summary.created).toBe(0);
    expect(summary.updated).toBe(0);
  });
});
