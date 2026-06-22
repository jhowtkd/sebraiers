import Link from 'next/link';
import { ArrowUpRight, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReactionBar } from '@/components/social/reaction-bar';
import { NetworkIcon } from '@/components/ui/network-icon';
import { NETWORK_LABELS, type Post, type Network } from '@/lib/types';
import type { PostEngagement } from '@/lib/queries/posts';
import { cn, formatRelative } from '@/lib/utils';

type Props = {
  post: Post;
  engagement?: PostEngagement;
};

const NETWORK_AVATAR_BG: Record<Network, string> = {
  instagram: 'bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]',
  linkedin: 'bg-[#0a66c2]',
  facebook: 'bg-[#1877f2]',
  tiktok: 'bg-black',
  youtube: 'bg-[#ff0000]',
  threads: 'bg-black',
  x: 'bg-black',
};

export function PostCard({ post, engagement }: Props) {
  const isSynced = Boolean((post as Post & { external_id?: string | null }).external_id);
  const authorUsername = isSynced ? 'sebraegoias' : post.author?.username ?? 'anônimo';
  const networkLabel = NETWORK_LABELS[post.network];
  const time = formatRelative(post.published_at);

  return (
    <article className="group bg-surface-elevated rounded-2xl border border-border-subtle shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md">
      {/* KICKER: network anchor + meta */}
      <header className="flex items-start gap-3 px-6 pt-5 pb-3">
        <div
          className={cn(
            'h-12 w-12 flex-shrink-0 rounded-full flex items-center justify-center text-white',
            NETWORK_AVATAR_BG[post.network]
          )}
          aria-hidden
        >
          <NetworkIcon network={post.network} className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0 pt-1.5">
          <p className="text-caption font-bold uppercase tracking-[0.08em] text-text-primary">
            {networkLabel}
            <span className="text-text-muted font-normal tracking-normal"> · @{authorUsername}</span>
          </p>
          <p className="text-caption text-text-secondary tabular-nums">
            {time}
          </p>
        </div>
      </header>

      {/* TITLE: editorial hero */}
      <h3 className="px-6 text-h2 font-bold text-text-primary leading-[1.15] tracking-tight">
        {post.title}
      </h3>

      {/* DESCRIPTION: 3 lines max */}
      {post.description && (
        <p className="px-6 pt-2 pb-5 text-body text-text-secondary line-clamp-3 leading-relaxed">
          {post.description}
        </p>
      )}

      {/* REACTIONS: subtle row */}
      {engagement && (
        <div className="flex items-center justify-between gap-2 px-6 py-3 border-t border-border-subtle/60">
          <ReactionBar
            target="post"
            targetId={post.id}
            engagement={engagement}
            compact
          />
          <Link
            href={`/post/${post.id}#conversa`}
            className="inline-flex items-center gap-1 text-caption text-text-muted hover:text-brand-azul transition-colors shrink-0"
            aria-label={`Ver ${engagement.commentCount} comentários`}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="tabular-nums">{engagement.commentCount}</span>
          </Link>
        </div>
      )}

      {/* ENGAJAR: the action star */}
      <div className="px-6 pt-2 pb-6">
        <a
          href={post.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block group/cta"
          aria-label={`Engajar no ${networkLabel}`}
        >
          <Button
            size="lg"
            className="w-full h-14 px-5 text-body-lg font-bold gap-2 rounded-xl"
          >
            <span>ENGAJAR</span>
            <span className="font-normal text-white/70 text-caption hidden sm:inline">
              no {networkLabel}
            </span>
            <ArrowUpRight
              className="h-5 w-5 ml-auto transition-transform duration-200 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
              aria-hidden
            />
          </Button>
        </a>
      </div>
    </article>
  );
}
