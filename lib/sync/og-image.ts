export async function fetchOgImage(url: string, timeoutMs = 5000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEBRAEIERS-Sync/1.0)' },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const tag = html.match(/<meta\s[^>]*property=["']og:image["'][^>]*>/i);
    if (!tag) return null;
    const content = tag[0].match(/content=["']([^"']+)["']/i);
    return content?.[1] ?? null;
  } catch {
    return null;
  }
}
