import 'server-only';

// Reject well-known wrong-og:image patterns.
function isValidPostImage(url: string): boolean {
  if (/pbs\.twimg\.com\/profile_images\//.test(url)) return false;
  return true;
}

export async function fetchOgImage(url: string, timeoutMs = 5000): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEBRAEIERS-Sync/1.0)' },
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
      if (m && isValidPostImage(m[1])) return m[1];
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
