import { requireUser } from '@/lib/auth';
import { getTimeline, getPostsEngagementBatch } from '@/lib/queries/posts';
import { PostCard } from '@/components/posts/post-card';
import { PostFilters } from '@/components/posts/post-filters';
import { EmptyState } from '@/components/ui/empty-state';
import { Inbox } from 'lucide-react';
import type { Network } from '@/lib/types';

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ network?: Network | 'all'; q?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const network = (sp.network ?? 'all') as Network | 'all';
  const search = sp.q;
  const posts = await getTimeline({ network, search });
  const engagementMap = await getPostsEngagementBatch(
    posts.map((p) => p.id),
    user.id
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-text-primary">Timeline</h1>
        <p className="text-body text-text-secondary mt-1">Publicações do SEBRAE Goiás pra engajar.</p>
      </div>
      <div className="mx-auto max-w-[600px] px-4 sm:px-0 space-y-4">
        <PostFilters />
        {posts.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-10 w-10" />}
            title="Nenhuma publicação por aqui ainda"
            description="Quando o time de comunicação postar nas redes oficiais, vai aparecer aqui pra você conferir e engajar."
          />
        ) : (
          <ul className="space-y-6">
            {posts.map((p) => (
              <li key={p.id}>
                <PostCard post={p} engagement={engagementMap.get(p.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
