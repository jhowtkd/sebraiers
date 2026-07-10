const PROXYABLE_HOST_SUFFIXES = [
  'cdninstagram.com',
  'fbcdn.net',
  'fbsbx.com',
  'tiktokcdn.com',
  'tiktokv.com',
  'ytimg.com',
  'googleusercontent.com',
  'licdn.com',
  'twimg.com',
  'threads.net',
] as const;

const MIRRORED_PATH_SEGMENT = '/post-covers/';

/** Decodes HTML entities commonly found in sheet-exported image URLs. */
export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Ensures cover URLs from sheets/og tags are absolute https URLs. */
export function normalizeCoverUrl(url: string): string {
  const trimmed = decodeHtmlEntities(url.trim());
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return trimmed;
}

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
    const host = new URL(normalizeCoverUrl(url)).hostname.toLowerCase();
    return PROXYABLE_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

/** Rewrites hotlink-protected CDN URLs through our image proxy. */
export function coverImageSrc(
  url: string | null | undefined,
  postId?: string,
): string | undefined {
  if (!url) return undefined;
  const normalized = normalizeCoverUrl(url);
  const mirrored = isMirroredCoverUrl(normalized);
  const proxyable = isProxyableCoverUrl(normalized);
  const resolved = mirrored
    ? normalized
    : postId
      ? `/api/cover-image?postId=${encodeURIComponent(postId)}`
      : proxyable
        ? `/api/cover-image?url=${encodeURIComponent(normalized)}`
        : normalized;
  return resolved;
}
