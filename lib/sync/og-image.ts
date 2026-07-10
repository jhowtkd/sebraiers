import 'server-only';
import { normalizeCoverUrl } from '@/lib/cover-image';

// Hosts permitted for OG image fetching. Limited to the social networks
// the product syncs from. Anything else (incl. internal/SSRF targets like
// 169.254.169.254, localhost, private ranges) is rejected before fetching.
const ALLOWED_HOSTS = new Set([
  'instagram.com',
  'www.instagram.com',
  'linkedin.com',
  'www.linkedin.com',
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
  'tiktok.com',
  'www.tiktok.com',
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'threads.net',
  'www.threads.net',
  'threads.com',
  'www.threads.com',
]);

function isAllowedHost(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return ALLOWED_HOSTS.has(parsed.hostname.toLowerCase());
}

// Reject well-known wrong-og:image patterns.
function isValidPostImage(url: string): boolean {
  if (/pbs\.twimg\.com\/profile_images\//.test(url)) return false;
  return true;
}

export async function fetchOgImage(url: string, timeoutMs = 5000): Promise<string | null> {
  if (!isAllowedHost(url)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Try property-before-content first (most common), then content-before-property.
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m && isValidPostImage(m[1])) return normalizeCoverUrl(m[1]);
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
