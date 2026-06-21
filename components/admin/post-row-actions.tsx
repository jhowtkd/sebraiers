'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { togglePostActiveAction, deletePostAction } from '@/app/actions/posts';
import { useToast } from '@/components/ui/toast';
import { Eye, EyeOff, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';

export function PostRowActions({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function toggle() {
    start(async () => {
      const res = await togglePostActiveAction(id, !isActive);
      if (res.ok) toast({ title: isActive ? 'Publicação desativada' : 'Publicação ativada', variant: 'success' });
      else toast({ title: 'Erro', description: res.error, variant: 'error' });
    });
  }
  function remove() {
    if (!confirm('Excluir esta publicação? Esta ação não pode ser desfeita.')) return;
    start(async () => {
      const res = await deletePostAction(id);
      if (res.ok) { toast({ title: 'Publicação excluída', variant: 'success' }); router.refresh(); }
      else toast({ title: 'Erro', description: res.error, variant: 'error' });
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={`/admin/posts/${id}/edit`}>
        <Button size="sm" variant="ghost" disabled={pending}><Pencil className="h-4 w-4" /></Button>
      </Link>
      <Button size="sm" variant="ghost" disabled={pending} onClick={toggle}>
        {isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={remove}>
        <Trash2 className="h-4 w-4 text-state-error" />
      </Button>
    </div>
  );
}