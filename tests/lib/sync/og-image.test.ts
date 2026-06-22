import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { fetchOgImage } from '@/lib/sync/og-image';

beforeEach(() => { fetchMock.mockReset(); });

describe('fetchOgImage', () => {
  it('extracts og:image from HTML', async () => {
    const html = '<html><head><meta property="og:image" content="https://cdn.example.com/img.jpg"></head></html>';
    fetchMock.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(html) });
    expect(await fetchOgImage('https://x.com/p/1')).toBe('https://cdn.example.com/img.jpg');
  });

  it('extracts og:image when attribute order is swapped (content before property)', async () => {
    const html = '<html><head><meta content="https://cdn.example.com/img2.jpg" property="og:image"></head></html>';
    fetchMock.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(html) });
    expect(await fetchOgImage('https://x.com/p/1')).toBe('https://cdn.example.com/img2.jpg');
  });

  it('returns null on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, text: () => Promise.resolve('') });
    expect(await fetchOgImage('https://x.com/p/1')).toBeNull();
  });

  it('returns null when no og:image in HTML', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('<html><head></head></html>') });
    expect(await fetchOgImage('https://x.com/p/1')).toBeNull();
  });

  it('returns null on fetch error (timeout, network)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('aborted'));
    expect(await fetchOgImage('https://x.com/p/1')).toBeNull();
  });
});
