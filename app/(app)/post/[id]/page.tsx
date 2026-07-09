import { CoverImage } from '@/components/ui/cover-image';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Sparkles } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { getPostById, getPostEngagementWithComments } from '@/lib/queries/posts';
import { getMyCheckinsForPost } from '@/lib/queries/checkins';
import { CheckinButtons } from '@/components/posts/checkin-buttons';
import { NetworkIcon } from '@/components/ui/network-icon';
import { ReactionBar } from '@/components/social/reaction-bar';
import { Comments } from '@/components/social/comments';
import { formatDate, formatRelative, cn } from '@/lib/utils';
import { NETWORK_LABELS } from '@/lib/types';

const NETWORK_TONE = {
  instagram: 'bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]',
  linkedin: 'bg-[#0a66c2]',
  facebook: 'bg-[#1877f2]',
  tiktok: 'bg-gradient-to-br from-[#69C9D0] via-black to-[#EE1D52]',
  youtube: 'bg-[#ff0000]',
  threads: 'bg-black',
  x: 'bg-black',
} as const;

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();
  const [mine, engagement] = await Promise.all([
    getMyCheckinsForPost(id),
    getPostEngagementWithComments(id, user.id),
  ]);
  const existing = mine.map((c) => ({ action: c.action, status: c.status }));
  const approved = existing.filter((e) => e.status === 'approved').length;

  return (
    <div className="space-y-6">
      <Link
        href="/timeline"
        className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar pra timeline
      </Link>

      {/* Hero com cover full-bleed */}
      <article className="overflow-hidden rounded-3xl bg-surface-elevated border border-border-subtle shadow-xs">
        <div className="relative aspect-[16/9] sm:aspect-[21/9] overflow-hidden bg-gradient-jacaranda-manaca">
          {post.cover_url ? (
            <CoverImage
              src={post.cover_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              className={cn(
                'absolute inset-0 flex items-end p-8 sm:p-12',
                NETWORK_TONE[post.network]
              )}
            >
              <h1 className="text-display font-black text-white tracking-tighter text-balance max-w-3xl leading-[0.95]">
                {post.title}
              </h1>
            </div>
          )}
          {post.cover_url && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          )}
          <div className="absolute top-5 left-5 inline-flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-md px-3 py-1.5 text-caption font-bold uppercase tracking-overline text-white">
            <NetworkIcon network={post.network} className="h-3.5 w-3.5" />
            {NETWORK_LABELS[post.network]}
          </div>
          {post.cover_url && (
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
              <h1 className="text-h1 sm:text-display font-black text-white tracking-tighter text-balance max-w-3xl leading-[0.95] drop-shadow">
                {post.title}
              </h1>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="px-6 sm:px-8 py-5 border-b border-border-subtle flex flex-wrap items-center gap-x-5 gap-y-2 text-body-sm text-text-secondary">
          <span className="font-semibold text-text-primary">@{post.author?.username ?? 'sebraegoias'}</span>
          <span aria-hidden>·</span>
          <time dateTime={post.published_at} title={formatDate(post.published_at)}>
            {formatRelative(post.published_at)}
          </time>
          <span aria-hidden>·</span>
          <a
            href={post.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-brand-azul-700 hover:text-brand-azul transition-colors"
          >
            Abrir publicação original <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Description */}
        {post.description && (
          <div className="px-6 sm:px-8 py-6 text-body-lg text-text-secondary whitespace-pre-wrap leading-relaxed">
            {post.description}
          </div>
        )}
      </article>

      {/* Check-in card */}
      <section className="rounded-3xl bg-surface-elevated border border-border-subtle shadow-xs p-6 sm:p-8 space-y-5 animate-fade-up">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-caption font-bold uppercase tracking-overline text-brand-azul">
              Sua parte
            </p>
            <h2 className="mt-1 text-h2 font-bold text-text-primary">
              Confirme o que você fez
            </h2>
            <p className="text-body-sm text-text-secondary mt-1">
              Clique em cada ação que você realizou. O admin valida em até 24h.
            </p>
          </div>
          {approved > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tier-ouro-soft text-[#7A5B12] px-3 py-1.5 text-caption font-bold uppercase tracking-overline flex-shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
              {approved} aprovada{approved > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <CheckinButtons postId={post.id} existing={existing} />
      </section>

      {/* Conversa */}
      <section
        id="conversa"
        className="rounded-3xl bg-surface-elevated border border-border-subtle shadow-xs p-6 sm:p-8 space-y-5"
      >
        <h2 className="text-h3 font-bold text-text-primary">Conversa</h2>
        <ReactionBar target="post" targetId={post.id} engagement={engagement} />
        <Comments target="post" postId={post.id} comments={engagement.comments} />
      </section>
    </div>
  );
}