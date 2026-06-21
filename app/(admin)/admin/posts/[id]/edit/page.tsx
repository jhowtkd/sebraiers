import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EditPostForm } from '@/components/admin/edit-post-form';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import type { Post } from '@/lib/types';

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase.from('posts').select('*').eq('id', id).maybeSingle();
  if (!post) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-h1 text-text-primary">Editar publicação</h1>
      <Card>
        <CardHeader><CardTitle>Detalhes</CardTitle></CardHeader>
        <CardBody><EditPostForm post={post as Post} /></CardBody>
      </Card>
    </div>
  );
}