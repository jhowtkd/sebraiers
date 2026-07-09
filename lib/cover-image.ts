const PROXYABLE_HOST_SUFFIXES = [
  'cdninstagram.com',
  'fbcdn.net',
  'tiktokcdn.com',
  'tiktokv.com',
  'ytimg.com',
  'googleusercontent.com',
  'licdn.com',
  'twimg.com',
  'threads.net',
] as const;

const MIRRORED_PATH_SEGMENT = '/post-covers/';

export function isMirroredCoverUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.endsWith('.supabase.co') &&
      parsed.pathname.includes(MIRRORED_PATH_SEGMENT)
    );
  } catch {
    return false;
  }
}

export function isProxyableCoverUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return PROXYABLE_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

/** Rewrites hotlink-protected CDN URLs through our image proxy. */
export function coverImageSrc(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (isMirroredCoverUrl(url) || !isProxyableCoverUrl(url)) return url;
  return `/api/cover-image?url=${encodeURIComponent(url)}`;
}
