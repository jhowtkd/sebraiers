import { requireUser } from '@/lib/auth';
import { getTimeline } from '@/lib/queries/posts';
import { PostCard } from '@/components/posts/post-card';
import { PostFilters } from '@/components/posts/post-filters';
import { EmptyState } from '@/components/ui/empty-state';
import { Inbox } from 'lucide-react';
import type { Network } from '@/lib/types';

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ network?: Network | 'all'; q?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const network = (sp.network ?? 'all') as Network | 'all';
  const search = sp.q;
  const posts = await getTimeline({ network, search });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-text-primary">Timeline</h1>
        <p className="text-body text-text-secondary mt-1">Publicações do SEBRAE Goiás pra engajar.</p>
      </div>
      <PostFilters />
      {posts.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-10 w-10" />}
          title="Nenhuma publicação por aqui ainda"
          description="Quando o time de comunicação postar nas redes oficiais, vai aparecer aqui pra você conferir e engajar."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </div>
  );
}
