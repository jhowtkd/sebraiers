import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';
import { isMirroredCoverUrl, isProxyableCoverUrl } from '@/lib/cover-image';

function refererForUrl(url: string): string {
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes('instagram') || host.includes('fbcdn') || host.includes('cdninstagram')) {
    return 'https://www.instagram.com/';
  }
  if (host.includes('tiktok')) return 'https://www.tiktok.com/';
  if (host.includes('youtube') || host.includes('ytimg') || host.includes('googleusercontent')) {
    return 'https://www.youtube.com/';
  }
  if (host.includes('linkedin') || host.includes('licdn')) return 'https://www.linkedin.com/';
  if (host.includes('twimg')) return 'https://x.com/';
  if (host.includes('threads')) return 'https://www.threads.net/';
  if (host.includes('facebook')) return 'https://www.facebook.com/';
  return 'https://www.google.com/';
}

function extensionFromContentType(contentType: string): string | null {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[contentType.split(';')[0]?.trim().toLowerCase() ?? ''] ?? null;
}

function extensionFromUrl(url: string): string | null {
  const match = new URL(url).pathname.match(/\.([a-z0-9]{2,5})$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export async function fetchCoverImage(
  url: string,
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  if (!isProxyableCoverUrl(url)) return null;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEBRAEIERS/1.0)',
        Referer: refererForUrl(url),
        Accept: 'image/*,*/*',
      },
      redirect: 'follow',
    });
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;

    return { body: await res.arrayBuffer(), contentType };
  } catch {
    return null;
  }
}

export async function mirrorCoverToStorage(sourceUrl: string): Promise<string | null> {
  if (isMirroredCoverUrl(sourceUrl) || !isProxyableCoverUrl(sourceUrl)) return sourceUrl;

  const fetched = await fetchCoverImage(sourceUrl);
  if (!fetched) return null;

  const admin = getAdminClient();
  const ext = extensionFromContentType(fetched.contentType) ?? extensionFromUrl(sourceUrl) ?? 'jpg';
  const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error } = await admin.storage.from('post-covers').upload(path, fetched.body, {
    contentType: fetched.contentType,
  });
  if (error) return null;

  const { data } = admin.storage.from('post-covers').getPublicUrl(path);
  return data.publicUrl;
}
