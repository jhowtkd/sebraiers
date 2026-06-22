import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { fetchSheetCSV, parseColumns, detectNetwork, parseRede, isStoryUrl } from '@/lib/sync/sheets';

beforeEach(() => { fetchMock.mockReset(); });

describe('fetchSheetCSV', () => {
  it('fetches and parses CSV from Google Sheets published endpoint', async () => {
    const csv = 'link_post,titulo\nhttps://example.com/p/1,Hello\nhttps://example.com/p/2,World';
    fetchMock.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(csv) });
    const rows = await fetchSheetCSV('sheet123', '0');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://docs.google.com/spreadsheets/d/sheet123/export?format=csv&gid=0',
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(rows).toEqual([
      { link_post: 'https://example.com/p/1', titulo: 'Hello' },
      { link_post: 'https://example.com/p/2', titulo: 'World' },
    ]);
  });

  it('throws on non-ok response', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve('') })
      .mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve('') });
    await expect(fetchSheetCSV('sheet', '0')).rejects.toThrow(/500/);
  });

  it('tolerates non-fatal papaparse warnings (e.g., FieldMismatch)', async () => {
    const csv = 'link_post,titulo\nhttps://example.com/p/1,Hello\nhttps://example.com/p/2,World';
    fetchMock.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(csv) });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(fetchSheetCSV('sheet123', '0')).resolves.toBeDefined();
    warnSpy.mockRestore();
  });

  it('URL-encodes sheetId to defend against special chars', async () => {
    const csv = 'link_post,titulo\nhttps://example.com/p/1,Hello';
    fetchMock.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(csv) });
    await fetchSheetCSV('sheet/with spaces', '0');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://docs.google.com/spreadsheets/d/sheet%2Fwith%20spaces/export?format=csv&gid=0',
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });

  it('falls back to gviz/tq when /export returns non-ok', async () => {
    const csv = 'link_post,titulo\nhttps://example.com/p/1,Hello';
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 400, text: () => Promise.resolve('') })
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(csv) });
    const rows = await fetchSheetCSV('sheet123', '0');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('/gviz/tq');
    expect(rows).toEqual([{ link_post: 'https://example.com/p/1', titulo: 'Hello' }]);
  });

  it('throws when both /export and /gviz/tq fail', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 400, text: () => Promise.resolve('') })
      .mockResolvedValueOnce({ ok: false, status: 403, text: () => Promise.resolve('') });
    await expect(fetchSheetCSV('sheet', '0')).rejects.toThrow(/tried \/export and \/gviz\/tq/);
  });
});

describe('parseColumns', () => {
  it('maps default column names', () => {
    const out = parseColumns([
      { link_post: 'https://x.com/1', titulo: 'A', descricao: 'd', data_publicacao: '2025-01-01', rede: 'instagram' },
    ]);
    expect(out).toEqual([{
      original_url: 'https://x.com/1',
      title: 'A',
      description: 'd',
      published_at: '2025-01-01T00:00:00.000Z',
      network: 'instagram',
      cover_url: undefined,
    }]);
  });

  it('accepts alternative column names', () => {
    const out = parseColumns(
      [{ URL: 'https://x.com/2', Title: 'B', Date: '2025-02-02' }],
      { link_post: 'URL', titulo: 'Title', data_publicacao: 'Date' }
    );
    expect(out[0]).toMatchObject({ original_url: 'https://x.com/2', title: 'B', published_at: '2025-02-02T00:00:00.000Z' });
  });

  it('skips rows without original_url', () => {
    const out = parseColumns([{ titulo: 'No URL' }, { link_post: 'https://x.com/3', titulo: 'OK' }]);
    expect(out).toHaveLength(1);
    expect(out[0].original_url).toBe('https://x.com/3');
  });

  it('normalizes ISO dates to full ISO strings', () => {
    const out = parseColumns([
      { link_post: 'https://x.com/iso', data_publicacao: '2025-01-01' },
    ]);
    expect(out[0].published_at).toBe('2025-01-01T00:00:00.000Z');
  });

  it('parses BR dd/mm/yyyy dates to ISO', () => {
    const out = parseColumns([
      { link_post: 'https://x.com/br', data_publicacao: '01/02/2025' },
    ]);
    expect(out[0].published_at).toBe('2025-02-01T00:00:00.000Z');
  });

  it('parses BR dd/mm/yyyy dates with space-separated time component (no silent corruption to today)', () => {
    const out = parseColumns([
      { link_post: 'https://x.com/br-time-space', data_publicacao: '01/02/2025 14:30' },
    ]);
    const parsed = new Date(out[0].published_at).getTime();
    const localExpected = new Date(2025, 1, 1, 14, 30).getTime();
    expect(parsed).toBe(localExpected);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(parsed).not.toBe(today.getTime());
  });

  it('parses BR dd/mm/yyyy dates with T-separated time component', () => {
    const out = parseColumns([
      { link_post: 'https://x.com/br-time-t', data_publicacao: '01/02/2025T14:30' },
    ]);
    const parsed = new Date(out[0].published_at).getTime();
    const localExpected = new Date(2025, 1, 1, 14, 30).getTime();
    expect(parsed).toBe(localExpected);
  });
});

describe('detectNetwork', () => {
  it('detects instagram', () => expect(detectNetwork('https://www.instagram.com/p/x/')).toBe('instagram'));
  it('detects linkedin', () => expect(detectNetwork('https://www.linkedin.com/posts/foo')).toBe('linkedin'));
  it('detects facebook', () => expect(detectNetwork('https://facebook.com/sebraego')).toBe('facebook'));
  it('detects tiktok', () => expect(detectNetwork('https://tiktok.com/@sebraego')).toBe('tiktok'));
  it('detects youtube', () => expect(detectNetwork('https://youtube.com/shorts/abc')).toBe('youtube'));
  it('detects threads', () => expect(detectNetwork('https://threads.net/@sebraego')).toBe('threads'));
  it('detects x.com (Twitter)', () => expect(detectNetwork('https://x.com/sebraego/status/123')).toBe('x'));
  it('detects twitter.com', () => expect(detectNetwork('https://twitter.com/sebraego/status/123')).toBe('x'));
  it('falls back to instagram for unknown', () => expect(detectNetwork('https://example.com/foo')).toBe('instagram'));
});

describe('parseRede', () => {
  const IG = 'https://www.instagram.com/p/abc/';
  const LI = 'https://www.linkedin.com/feed/update/urn:li:activity:123';
  const XURL = 'https://x.com/sebraego/status/123';
  const TT = 'https://www.tiktok.com/@x/video/123';
  const TH = 'https://www.threads.com/@x/post/abc';

  it('parses Network/Format (LinkedIn/Artigo)', () => {
    expect(parseRede('LinkedIn/Artigo', LI)).toBe('linkedin');
  });
  it('parses Network/Format (Instagram/Carrossel)', () => {
    expect(parseRede('Instagram/Carrossel', IG)).toBe('instagram');
  });
  it('parses Network:Format/Type (Instagram:Feed/Story)', () => {
    expect(parseRede('Instagram:Feed/Story', IG)).toBe('instagram');
  });
  it('parses plain Threads', () => {
    expect(parseRede('Threads', TH)).toBe('threads');
  });
  it('parses plain TikTok', () => {
    expect(parseRede('TikTok', TT)).toBe('tiktok');
  });
  it('parses plain X', () => {
    expect(parseRede('X', XURL)).toBe('x');
  });
  it('lowercases the head', () => {
    expect(parseRede('x', XURL)).toBe('x');
  });
  it('falls back to detectNetwork for empty rede', () => {
    expect(parseRede('', IG)).toBe('instagram');
    expect(parseRede(undefined, XURL)).toBe('x');
  });
  it('falls back to detectNetwork for unknown rede', () => {
    expect(parseRede('Mastodon/Something', IG)).toBe('instagram');
  });
});

describe('isStoryUrl', () => {
  it('returns true for instagram stories', () => expect(isStoryUrl('https://www.instagram.com/stories/user/123/')).toBe(true));
  it('returns true for facebook stories', () => expect(isStoryUrl('https://facebook.com/stories/123/')).toBe(true));
  it('returns false for regular posts', () => expect(isStoryUrl('https://www.instagram.com/p/abc/')).toBe(false));
  it('returns false for reels', () => expect(isStoryUrl('https://www.instagram.com/reel/abc/')).toBe(false));
  it('returns false for youtube shorts', () => expect(isStoryUrl('https://youtube.com/shorts/abc')).toBe(false));
  it('ignores query params', () => expect(isStoryUrl('https://www.instagram.com/stories/user/123/?utm_source=x')).toBe(true));
});
