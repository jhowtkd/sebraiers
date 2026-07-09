import { describe, it, expect } from 'vitest';
import { coverImageSrc, isMirroredCoverUrl, isProxyableCoverUrl } from '@/lib/cover-image';

describe('cover-image', () => {
  it('detects Instagram CDN URLs as proxyable', () => {
    expect(
      isProxyableCoverUrl(
        'https://scontent-gru2-1.cdninstagram.com/v/t51.2885-15/723626478_17974011075106177_2558222387328774790_n.jpg',
      ),
    ).toBe(true);
  });

  it('does not proxy Supabase storage URLs', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/post-covers/covers/1.jpg';
    expect(isMirroredCoverUrl(url)).toBe(true);
    expect(coverImageSrc(url)).toBe(url);
  });

  it('rewrites CDN URLs through the image proxy', () => {
    const cdn =
      'https://scontent-gru2-1.cdninstagram.com/v/t51.2885-15/723626478_17974011075106177_2558222387328774790_n.jpg';
    expect(coverImageSrc(cdn)).toBe(`/api/cover-image?url=${encodeURIComponent(cdn)}`);
  });

  it('returns custom URLs unchanged', () => {
    const url = 'https://images.example.com/cover.jpg';
    expect(coverImageSrc(url)).toBe(url);
  });
});
