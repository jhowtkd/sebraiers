import Link from 'next/link';
import { ArrowUpRight, Heart, MessageCircle, Repeat2, Clock } from 'lucide-react';
import { NetworkIcon } from '@/components/ui/network-icon';
import { PostCardInteractions } from './post-card-interactions';
import { NETWORK_LABELS, type Post, type Network } from '@/lib/types';
import type { PostEngagement } from '@/lib/queries/posts';
import { cn, formatRelative } from '@/lib/utils';

type Props = {
  post: Post;
  engagement?: PostEngagement;
};

const NETWORK_TONE: Record<
  Network,
  { chip: string; text: string; glow: string }
> = {
  instagram: {
    chip: 'bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]',
    text: 'text-white',
    glow: 'shadow-[0_4px_14px_-4px_rgba(221,42,123,0.5)]',
  },
  linkedin: {
    chip: 'bg-[#0a66c2]',
    text: 'text-white',
    glow: 'shadow-[0_4px_14px_-4px_rgba(10,102,194,0.5)]',
  },
  facebook: {
    chip: 'bg-[#1877f2]',
    text: 'text-white',
    glow: 'shadow-[0_4px_14px_-4px_rgba(24,119,242,0.5)]',
  },
  tiktok: {
    chip: 'bg-gradient-to-br from-[#69C9D0] via-black to-[#EE1D52]',
    text: 'text-white',
    glow: 'shadow-[0_4px_14px_-4px_rgba(238,29,82,0.45)]',
  },
  youtube: {
    chip: 'bg-[#ff0000]',
    text: 'text-white',
    glow: 'shadow-[0_4px_14px_-4px_rgba(255,0,0,0.5)]',
  },
  threads: {
    chip: 'bg-black',
    text: 'text-white',
    glow: 'shadow-[0_4px_14px_-4px_rgba(0,0,0,0.4)]',
  },
  x: {
    chip: 'bg-black',
    text: 'text-white',
    glow: 'shadow-[0_4px_14px_-4px_rgba(0,0,0,0.4)]',
  },
};

const ACTION_HINT: Record<Network, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  instagram: { icon: Heart, label: 'curta' },
  linkedin: { icon: MessageCircle, label: 'comente' },
  facebook: { icon: Heart, label: 'reaja' },
  tiktok: { icon: Repeat2, label: 'assista' },
  youtube: { icon: Heart, label: 'inscreva-se' },
  threads: { icon: MessageCircle, label: 'responda' },
  x: { icon: Heart, label: 'favorite' },
};

export function PostCard({ post, engagement }: Props) {
  const isSynced = Boolean((post as Post & { external_id?: string | null }).external_id);
  const authorUsername = isSynced ? 'sebraegoias' : post.author?.username ?? 'anônimo';
  const networkLabel = NETWORK_LABELS[post.network];
  const time = formatRelative(post.published_at);
  const tone = NETWORK_TONE[post.network];
  const Hint = ACTION_HINT[post.network];

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-surface-elevated border border-border-subtle shadow-xs',
        'transition-all duration-base ease-out-quart',
        'hover:-translate-y-0.5 hover:shadow-md hover:border-border-strong/15'
      )}
    >
      {/* COVER — editorial hero */}
      <Link href={`/post/${post.id}`} className="block focus-visible:outline-none">
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-jacaranda-manaca">
          {post.cover_url ? (
            <img
              src={post.cover_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-slower ease-out-quart group-hover:scale-[1.04]"
            />
          ) : (
            <div
              className={cn(
                'absolute inset-0 flex items-end p-6 bg-gradient-to-t from-black/60 to-transparent',
                tone.chip
              )}
            >
              <p className="text-h2 font-bold text-white text-balance line-clamp-2">
                {post.title}
              </p>
            </div>
          )}
          {/* Network chip */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 backdrop-blur-md',
                tone.chip,
                tone.text,
                tone.glow
              )}
            >
              <NetworkIcon network={post.network} className="h-3.5 w-3.5" />
              <span className="text-caption font-bold uppercase tracking-overline">
                {networkLabel}
              </span>
            </span>
            {isSynced && (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-md px-2.5 py-1.5 text-caption font-semibold text-white">
                <Clock className="h-3 w-3" /> Sync
              </span>
            )}
          </div>
          {/* Hint pill — discreto, bottom-right */}
          <div className="absolute bottom-4 right-4 hidden sm:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-md px-3 py-1.5 text-caption font-semibold text-text-primary">
              <Hint.icon className="h-3.5 w-3.5 text-brand-azul" />
              {Hint.label}
            </span>
          </div>
        </div>
      </Link>

      {/* KICKER: avatar + handle + tempo */}
      <header className="flex items-center gap-3 px-6 pt-5 pb-2">
        <div
          className={cn(
            'h-9 w-9 flex-shrink-0 rounded-full flex items-center justify-center text-white ring-2 ring-white',
            tone.chip
          )}
          aria-hidden
        >
          <NetworkIcon network={post.network} className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-sm font-semibold text-text-primary truncate">
            @{authorUsername}
          </p>
          <p className="text-caption text-text-muted tabular-nums">{time}</p>
        </div>
      </header>

      {/* TITLE — editorial hero */}
      <Link
        href={`/post/${post.id}`}
        className="block px-6 pb-3 focus-visible:outline-none"
      >
        <h3 className="text-h2 font-bold text-text-primary leading-[1.15] tracking-tight text-balance group-hover:text-brand-azul transition-colors duration-base">
          {post.title}
        </h3>
      </Link>

      {/* DESCRIPTION */}
      {post.description && (
        <p className="px-6 pb-4 text-body text-text-secondary line-clamp-3 leading-relaxed">
          {post.description}
        </p>
      )}

      {/* FOOTER CTA — sticky visual, sai do card no hover */}
      <Link
        href={`/post/${post.id}`}
        className="group/cta flex items-center justify-between gap-2 px-6 py-4 border-t border-border-subtle/60 hover:bg-brand-azul-50/60 transition-colors duration-base"
        aria-label={`Abrir post: ${post.title}`}
      >
        <span className="text-body-sm font-semibold text-text-primary group-hover/cta:text-brand-azul-700 transition-colors">
          Fazer check-in
        </span>
        <ArrowUpRight className="h-4 w-4 text-text-muted group-hover/cta:text-brand-azul-700 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5 transition-all duration-base" />
      </Link>

      <PostCardInteractions
        postId={post.id}
        url={post.original_url}
        networkLabel={networkLabel}
        engagement={engagement}
      />
    </article>
  );
}