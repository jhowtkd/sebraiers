import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/card';
import { NetworkIcon } from '@/components/ui/network-icon';
import { formatRelative } from '@/lib/utils';
import type { Post } from '@/lib/types';

export function PostCard({ post }: { post: Post }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {post.cover_url && (
        <Link href={`/post/${post.id}`} aria-label={`Ver detalhe de ${post.title}`}>
          <div className="aspect-video w-full bg-surface-sunken overflow-hidden">
            <img src={post.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        </Link>
      )}
      <CardBody>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-2 py-0.5 text-caption text-text-secondary">
            <NetworkIcon network={post.network} /> {post.network}
          </span>
          <span className="text-caption text-text-muted">{formatRelative(post.published_at)}</span>
        </div>
        <Link href={`/post/${post.id}`} className="block">
          <h3 className="text-h4 text-text-primary line-clamp-2 hover:text-brand-azul">{post.title}</h3>
        </Link>
        {post.description && <p className="mt-2 text-body-sm text-text-secondary line-clamp-3">{post.description}</p>}
        <a href={post.original_url} target="_blank" rel="noopener noreferrer"
          className="mt-3 inline-block text-body-sm text-brand-azul font-medium hover:underline">
          Abrir publicação original →
        </a>
      </CardBody>
    </Card>
  );
}
