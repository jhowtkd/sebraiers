import { describe, it, expect } from 'vitest';
import {
  coverImageSrc,
  isMirroredCoverUrl,
  isProxyableCoverUrl,
  normalizeCoverUrl,
} from '@/lib/cover-image';

describe('cover-image', () => {
  it('detects Instagram CDN URLs as proxyable', () => {
    expect(
      isProxyableCoverUrl(
        'https://scontent-gru2-1.cdninstagram.com/v/t51.2885-15/723626478_17974011075106177_2558222387328774790_n.jpg',
      ),
    ).toBe(true);
  });

  it('decodes HTML entities in CDN URLs', () => {
    const encoded =
      'https://scontent.cdninstagram.com/x.jpg?foo=1&amp;bar=2';
    expect(normalizeCoverUrl(encoded)).toBe(
      'https://scontent.cdninstagram.com/x.jpg?foo=1&bar=2',
    );
  });

  it('normalizes protocol-relative CDN URLs', () => {
    const normalized = normalizeCoverUrl(
      '//scontent-gru2-1.cdninstagram.com/v/t51.2885-15/723626478_17974011075106177_2558222387328774790_n.jpg',
    );
    expect(isProxyableCoverUrl(normalized)).toBe(true);
    expect(coverImageSrc(normalized, 'post-1')).toBe('/api/cover-image?postId=post-1');
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

  it('prefers postId route for CDN covers when post id is available', () => {
    const cdn =
      'https://scontent-gru2-1.cdninstagram.com/v/t51.2885-15/723626478_17974011075106177_2558222387328774790_n.jpg';
    expect(coverImageSrc(cdn, 'post-123')).toBe('/api/cover-image?postId=post-123');
  });

  it('returns custom URLs unchanged', () => {
    const url = 'https://images.example.com/cover.jpg';
    expect(coverImageSrc(url)).toBe(url);
  });
});
