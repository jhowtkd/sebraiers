import { NextResponse, type NextRequest } from 'next/server';
import { isProxyableCoverUrl, normalizeCoverUrl } from '@/lib/cover-image';
import { fetchCoverImage, resolvePostCoverImage } from '@/lib/cover-image-fetch';

function imageResponse(image: { body: ArrayBuffer; contentType: string }) {
  return new NextResponse(image.body, {
    status: 200,
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}

export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get('postId');
  if (postId) {
    const image = await resolvePostCoverImage(postId);
    if (!image) {
      return NextResponse.json({ error: 'unavailable' }, { status: 502 });
    }
    return imageResponse(image);
  }

  const raw = request.nextUrl.searchParams.get('url');
  if (!raw) return NextResponse.json({ error: 'missing url' }, { status: 400 });

  let url: string;
  try {
    url = new URL(normalizeCoverUrl(raw)).toString();
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  if (!isProxyableCoverUrl(url)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const image = await fetchCoverImage(url);
  if (!image) {
    return NextResponse.json({ error: 'unavailable' }, { status: 502 });
  }

  return imageResponse(image);
}
