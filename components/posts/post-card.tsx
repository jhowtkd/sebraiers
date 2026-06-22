import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReactionBar } from '@/components/social/reaction-bar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { NETWORK_LABELS, type Post } from '@/lib/types';
import type { PostEngagement } from '@/lib/queries/posts';
import { initials, formatRelative } from '@/lib/utils';

type Props = {
  post: Post;
  engagement?: PostEngagement;
};

export function PostCard({ post, engagement }: Props) {
  const author = post.author ?? null;
  const authorName = author?.full_name ?? 'Anônimo';
  const authorUsername = author?.username ?? 'anônimo';
  const networkLabel = NETWORK_LABELS[post.network];
  const time = formatRelative(post.published_at);

  return (
    <article className="bg-surface-elevated rounded-xl border border-border-subtle overflow-hidden">
      {/* header */}
      <header className="flex items-center gap-3 p-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          {author?.avatar_url && (
            <AvatarImage src={author.avatar_url} alt={authorName} />
          )}
          <AvatarFallback className="bg-brand-azul text-white text-caption font-semibold">
            {initials(authorName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-body-sm font-semibold text-text-primary truncate">
            {authorName}
          </p>
          <p className="text-caption text-text-muted truncate">
            @{authorUsername} · via {networkLabel}
          </p>
        </div>
        <time dateTime={post.published_at} className="text-caption text-text-muted flex-shrink-0">
          {time}
        </time>
      </header>

      {/* cover (clickable to detail) */}
      <Link href={`/post/${post.id}`} aria-label={`Ver detalhe de ${post.title}`}>
        <figure className="aspect-square w-full bg-surface-sunken overflow-hidden">
          {post.cover_url ? (
            <img
              src={post.cover_url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : null}
        </figure>
      </Link>

      {/* action bar */}
      {engagement && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border-subtle">
          <ReactionBar
            target="post"
            targetId={post.id}
            engagement={engagement}
            compact
          />
          <Link
            href={`/post/${post.id}#conversa`}
            className="ml-auto inline-flex items-center gap-1 text-caption text-text-muted hover:text-brand-azul"
            aria-label={`Ver ${engagement.commentCount} comentários`}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="tabular-nums">{engagement.commentCount}</span>
          </Link>
        </div>
      )}

      {/* caption */}
      <div className="px-3 py-3 space-y-1">
        <p className="text-body-sm text-text-primary">
          <span className="font-semibold">{authorUsername}</span>{' '}
          {post.title}
        </p>
        {post.description && (
          <p className="text-body-sm text-text-secondary line-clamp-3">
            {post.description}
          </p>
        )}
        {engagement && engagement.commentCount > 0 && (
          <Link
            href={`/post/${post.id}#conversa`}
            className="block text-caption text-text-muted hover:text-brand-azul"
          >
            Ver todos os {engagement.commentCount} comentários
          </Link>
        )}
      </div>

      {/* footer */}
      <footer className="px-3 pb-3 space-y-2">
        <a
          href={post.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          aria-label={`Engajar na publicação (${networkLabel})`}
        >
          <Button className="w-full" size="lg">
            ENGAJAR
          </Button>
        </a>
        <p className="text-caption text-text-muted text-center">
          {time} · via {networkLabel}
        </p>
      </footer>
    </article>
  );
}
