import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getPostById, getPostEngagement } from '@/lib/queries/posts';
import { getMyCheckinsForPost } from '@/lib/queries/checkins';
import { Card, CardBody } from '@/components/ui/card';
import { CheckinButtons } from '@/components/posts/checkin-buttons';
import { NetworkIcon } from '@/components/ui/network-icon';
import { ReactionBar } from '@/components/social/reaction-bar';
import { Comments, type Comment } from '@/components/social/comments';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();
  const [mine, engagement, supabase] = await Promise.all([
    getMyCheckinsForPost(id),
    getPostEngagement(id, user.id),
    createClient(),
  ]);
  const existing = mine.map((c) => ({ action: c.action, status: c.status }));

  const { data: postComments } = await supabase
    .from('post_comments')
    .select('id, body, created_at, user:profiles!post_comments_user_id_fkey(full_name, username, avatar_url)')
    .eq('post_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/timeline" className="inline-flex items-center gap-1 text-body-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <Card>
        {post.cover_url && (
          <div className="aspect-video w-full bg-surface-sunken overflow-hidden rounded-t-xl">
            <img src={post.cover_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <CardBody className="space-y-4">
          <div className="flex items-center gap-2 text-caption text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <NetworkIcon network={post.network} /> {post.network}
            </span>
            <span>·</span>
            <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
          </div>
          <h1 className="text-h1 text-text-primary">{post.title}</h1>
          {post.description && <p className="text-body text-text-secondary whitespace-pre-wrap">{post.description}</p>}
          <a href={post.original_url} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary">Abrir publicação original</Button>
          </a>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <h2 className="text-h3 text-text-primary mb-1">Confirme suas ações</h2>
          <p className="text-body-sm text-text-secondary mb-4">
            Clique em cada ação que você realizou. O admin valida e seus pontos entram no ranking após aprovação.
          </p>
          <CheckinButtons postId={post.id} existing={existing} />
        </CardBody>
      </Card>
      <Card id="conversa">
        <CardBody className="space-y-5">
          <ReactionBar target="post" targetId={post.id} engagement={engagement} />
          <Comments
            target="post"
            postId={post.id}
            comments={(postComments ?? []) as unknown as Comment[]}
            currentUserId={user.id}
          />
        </CardBody>
      </Card>
    </div>
  );
}
