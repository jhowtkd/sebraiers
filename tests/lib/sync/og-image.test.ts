import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { fetchOgImage } from '@/lib/sync/og-image';

beforeEach(() => { fetchMock.mockReset(); });

describe('fetchOgImage', () => {
  it('extracts og:image from HTML', async () => {
    const html = '<html><head><meta property="og:image" content="https://cdn.example.com/img.jpg"></head></html>';
    fetchMock.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(html) });
    expect(await fetchOgImage('https://www.instagram.com/p/1')).toBe('https://cdn.example.com/img.jpg');
  });

  it('extracts og:image when attribute order is swapped (content before property)', async () => {
    const html = '<html><head><meta content="https://cdn.example.com/img2.jpg" property="og:image"></head></html>';
    fetchMock.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(html) });
    expect(await fetchOgImage('https://www.instagram.com/p/1')).toBe('https://cdn.example.com/img2.jpg');
  });

  it('returns null on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, text: () => Promise.resolve('') });
    expect(await fetchOgImage('https://www.instagram.com/p/1')).toBeNull();
  });

  it('returns null when no og:image in HTML', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('<html><head></head></html>') });
    expect(await fetchOgImage('https://www.instagram.com/p/1')).toBeNull();
  });

  it('returns null on fetch error (timeout, network)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('aborted'));
    expect(await fetchOgImage('https://www.instagram.com/p/1')).toBeNull();
  });

  it('rejects og:image pointing at X profile picture (not a post image)', async () => {
    const html = '<html><head><meta property="og:image" content="https://pbs.twimg.com/profile_images/abc/avatar_200x200.jpg"></head></html>';
    fetchMock.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(html) });
    expect(await fetchOgImage('https://www.tiktok.com/@user/video/123')).toBeNull();
  });
});

describe('fetchOgImage host allowlist', () => {
  it('fetches an allowed host (instagram)', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('<html><meta property="og:image" content="https://cdn.inst.com/img.jpg" /></html>', { status: 200 })
    );
    const result = await fetchOgImage('https://www.instagram.com/p/abc/');
    expect(result).toBe('https://cdn.inst.com/img.jpg');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null WITHOUT fetching when host is not allowed', async () => {
    const result = await fetchOgImage('http://169.254.169.254/latest/meta-data/');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null without fetching for localhost', async () => {
    const result = await fetchOgImage('http://localhost:8080/');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null for an invalid URL', async () => {
    const result = await fetchOgImage('not-a-url');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
