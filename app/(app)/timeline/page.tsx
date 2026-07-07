import { Inbox } from 'lucide-react';
import { getTimelinePageData } from '@/lib/queries/timeline-page';
import { PostCard } from '@/components/posts/post-card';
import { PostFilters } from '@/components/posts/post-filters';
import { YourStatusCard } from '@/components/ranking/your-status-card';
import { EmptyState } from '@/components/ui/empty-state';
import type { Network } from '@/lib/types';

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ network?: Network | 'all'; q?: string }>;
}) {
  const sp = await searchParams;
  const network = (sp.network ?? 'all') as Network | 'all';
  const search = sp.q;
  const { posts, profile, totalPoints, weeklyPoints, ranking, engagementMap } =
    await getTimelinePageData({ network, search });

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <section className="space-y-2 animate-fade-up">
        <p className="text-caption font-bold uppercase tracking-overline text-brand-azul">
          O que tá rolando
        </p>
        <h1 data-tour="timeline-header" className="text-h1 sm:text-display font-black tracking-tighter leading-[0.95] text-text-primary text-balance">
          Curta, comente ou<br />compartilhe pra somar pontos.
        </h1>
        <p className="text-body-lg text-text-secondary max-w-2xl">
          Cada ação aprovada vira pontos e te sobe no ranking da semana.
        </p>
      </section>

      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        {/* Feed */}
        <div className="space-y-5 min-w-0">
          <PostFilters />
          {posts.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-10 w-10" />}
              title="Nenhuma publicação por aqui"
              description="Quando o time de comunicação postar nas redes oficiais, aparece aqui pra você conferir e engajar."
            />
          ) : (
            <ul className="space-y-6 stagger-children">
              {posts.map((p) => (
                <li key={p.id}>
                  <PostCard post={p} engagement={engagementMap.get(p.id)} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Sidebar — fixa em desktop, topo em mobile */}
        <aside className="space-y-5 lg:sticky lg:top-20 self-start">
          <YourStatusCard
            profile={
              profile
                ? {
                    full_name: profile.full_name,
                    username: profile.username,
                    avatar_url: profile.avatar_url,
                  }
                : { full_name: 'Você', username: 'voce', avatar_url: null }
            }
            totalPoints={totalPoints}
            weeklyPoints={weeklyPoints}
            position={ranking.myPosition}
          />
          <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-5 shadow-xs">
            <p className="text-caption font-bold uppercase tracking-overline text-text-muted">
              Como ganhar pontos
            </p>
            <ul className="mt-3 space-y-3 text-body-sm">
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-azul-50 text-brand-azul-700 font-bold tabular-nums">1</span>
                <span className="flex-1">Curtir um post</span>
                <span className="font-bold tabular-nums text-text-primary">+1 pt</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-azul-50 text-brand-azul-700 font-bold tabular-nums">2</span>
                <span className="flex-1">Comentar</span>
                <span className="font-bold tabular-nums text-text-primary">+2 pts</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-azul-50 text-brand-azul-700 font-bold tabular-nums">3</span>
                <span className="flex-1">Compartilhar</span>
                <span className="font-bold tabular-nums text-text-primary">+3 pts</span>
              </li>
            </ul>
            <p className="mt-4 text-caption text-text-muted">
              Aprovação do admin em até 24h.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
