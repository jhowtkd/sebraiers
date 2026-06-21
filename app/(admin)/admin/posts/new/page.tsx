import { requireAdmin } from '@/lib/auth';
import { PostForm } from '@/components/admin/post-form';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';

export default async function NewPostPage() {
  await requireAdmin();
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-h1 text-text-primary">Nova publicação</h1>
      <Card>
        <CardHeader><CardTitle>Detalhes</CardTitle></CardHeader>
        <CardBody><PostForm /></CardBody>
      </Card>
    </div>
  );
}