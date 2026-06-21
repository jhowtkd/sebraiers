import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NetworkIcon } from '@/components/ui/network-icon';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { NETWORK_LABELS, type Post } from '@/lib/types';
import { PostRowActions } from '@/components/admin/post-row-actions';

export default async function AdminPostsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: posts } = await supabase.from('posts').select('*').order('published_at', { ascending: false }).limit(200);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-text-primary">Publicações</h1>
        <Link href="/admin/posts/new"><Button>Nova publicação</Button></Link>
      </div>
      {(posts ?? []).length === 0 ? (
        <Card><CardBody className="text-center text-text-secondary py-12">Nenhuma publicação cadastrada.</CardBody></Card>
      ) : (
        <div className="space-y-3">
          {(posts as Post[]).map((p) => (
            <Card key={p.id}>
              <CardBody className="flex items-center gap-4">
                {p.cover_url && <img src={p.cover_url} alt="" className="h-14 w-14 rounded-md object-cover flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-caption text-text-secondary mb-1">
                    <NetworkIcon network={p.network} /> {NETWORK_LABELS[p.network]}
                    <span>·</span> <time>{formatDate(p.published_at)}</time>
                    {!p.is_active && <Badge variant="neutral">Inativa</Badge>}
                  </div>
                  <h3 className="text-body font-medium text-text-primary truncate">{p.title}</h3>
                </div>
                <PostRowActions id={p.id} isActive={p.is_active} />
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}