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
    fetchOgImage: vi.fn(),
    sha256: vi.fn(async (s: string) => `hash(${s})`),
  };
});

import { runSync } from '@/lib/sync';
import * as sheets from '@/lib/sync/sheets';

const mockSheets = sheets as unknown as {
  fetchSheetCSV: ReturnType<typeof vi.fn>;
  parseColumns: ReturnType<typeof vi.fn>;
  fetchOgImage: ReturnType<typeof vi.fn>;
};

function postsQuery(opts: {
  existing?: { id: string; cover_url?: string | null } | null;
  selectError?: Error;
  insertError?: { message: string } | null;
  updateError?: { message: string } | null;
}) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: () =>
          opts.selectError
            ? Promise.reject(opts.selectError)
            : Promise.resolve({ data: opts.existing ?? null, error: null }),
      }),
    }),
    insert: () =>
      Promise.resolve({
        data: opts.insertError ? null : { id: 'p-new' },
        error: opts.insertError ?? null,
      }),
    update: () => ({
      eq: () =>
        Promise.resolve({ data: null, error: opts.updateError ?? null }),
    }),
  };
}

describe('runSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockSheets.fetchOgImage.mockResolvedValueOnce('https://img.jpg');
    fromMock.mockImplementation((table: string) => {
      if (table === 'posts') return postsQuery({ existing: null });
      return {};
    });
    const summary = await runSync({ sheetId: 's', gid: '0', adminId: 'a1' });
    expect(summary.created).toBe(1);
    expect(summary.updated).toBe(0);
    expect(summary.skipped_stories).toBe(0);
    expect(summary.errors).toBe(0);
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
    mockSheets.fetchOgImage.mockResolvedValueOnce(null);
    fromMock.mockImplementation((table: string) => {
      if (table === 'posts') return postsQuery({ existing: { id: 'p-existing' } });
      return {};
    });
    const summary = await runSync({ sheetId: 's', gid: '0', adminId: 'a1' });
    expect(summary.updated).toBe(1);
    expect(summary.created).toBe(0);
    expect(summary.errors).toBe(0);
  });

  it('continues on per-row error', async () => {
    mockSheets.fetchSheetCSV.mockResolvedValueOnce([{ link_post: 'u1' }, { link_post: 'u2' }]);
    mockSheets.parseColumns.mockReturnValueOnce([
      {
        original_url: 'https://x.com/1',
        title: 'A',
        published_at: '2025-01-01T00:00:00.000Z',
        network: 'instagram',
      },
      {
        original_url: 'https://x.com/2',
        title: 'B',
        published_at: '2025-01-02T00:00:00.000Z',
        network: 'instagram',
      },
    ]);
    let call = 0;
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fromMock.mockImplementation((table: string) => {
      if (table === 'posts') {
        call++;
        if (call === 1) return postsQuery({ selectError: new Error('db down') });
        return postsQuery({ existing: null });
      }
      return {};
    });
    const summary = await runSync({ sheetId: 's', gid: '0', adminId: 'a1' });
    errSpy.mockRestore();
    expect(summary.errors).toBe(1);
    expect(summary.created).toBe(1);
  });
});