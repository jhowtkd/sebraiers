import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  isMirroredCoverUrl,
  isProxyableCoverUrl,
  normalizeCoverUrl,
} from '@/lib/cover-image';
import { fetchOgImage } from '@/lib/sync/og-image';

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
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
  const normalized = normalizeCoverUrl(sourceUrl);
  if (isMirroredCoverUrl(normalized) || !isProxyableCoverUrl(normalized)) return normalized;

  const fetched = await fetchCoverImage(normalized);
  if (!fetched) return null;

  const admin = getAdminClient();
  const ext = extensionFromContentType(fetched.contentType) ?? extensionFromUrl(normalized) ?? 'jpg';
  const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error } = await admin.storage.from('post-covers').upload(path, fetched.body, {
    contentType: fetched.contentType,
  });
  if (error) return null;

  const { data } = admin.storage.from('post-covers').getPublicUrl(path);
  return data.publicUrl;
}

async function fetchPublicImage(
  url: string,
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;
    return { body: await res.arrayBuffer(), contentType };
  } catch {
    return null;
  }
}

export async function resolvePostCoverImage(
  postId: string,
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const admin = getAdminClient();
  const { data: post, error } = await admin
    .from('posts')
    .select('id, cover_url, original_url')
    .eq('id', postId)
    .maybeSingle();
  if (error || !post) return null;

  const stored = post.cover_url ? normalizeCoverUrl(post.cover_url) : null;

  if (stored && isMirroredCoverUrl(stored)) {
    const mirrored = await fetchPublicImage(stored);
    if (mirrored) return mirrored;
  }

  if (stored && isProxyableCoverUrl(stored)) {
    const proxied = await fetchCoverImage(stored);
    if (proxied) return proxied;
  }

  const og = await fetchOgImage(post.original_url);
  if (!og) return null;

  const mirroredUrl = await mirrorCoverToStorage(og);
  if (mirroredUrl && isMirroredCoverUrl(mirroredUrl)) {
    await admin.from('posts').update({ cover_url: mirroredUrl }).eq('id', postId);
    const mirrored = await fetchPublicImage(mirroredUrl);
    if (mirrored) return mirrored;
  }

  const normalizedOg = normalizeCoverUrl(og);
  return fetchCoverImage(normalizedOg);
}
