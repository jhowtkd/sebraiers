'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { postSchema, type PostInput } from '@/lib/validation';
import { updatePostAction } from '@/app/actions/posts';
import { PostFormFields } from '@/components/forms/post-form-fields';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import type { Post } from '@/lib/types';
import type { ActionResult } from '@/app/actions/auth';

function SubmitBtn({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending}>{children}</Button>;
}

export function EditPostForm({ post }: { post: Post }) {
  const { register, formState: { errors } } = useForm<PostInput>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: post.title,
      description: post.description ?? '',
      network: post.network,
      original_url: post.original_url,
      published_at: post.published_at.slice(0, 16),
      cover_url: post.cover_url ?? '',
      is_active: post.is_active,
    },
  });
  const action = updatePostAction.bind(null, post.id);
  const [state, formAction] = useFormState<ActionResult | null, FormData>(action, null);
  const { toast } = useToast();

  return (
    <form action={formAction} className="space-y-4" onSubmit={() => state?.ok && toast({ title: 'Publicação atualizada', variant: 'success' })}>
      <PostFormFields register={register} />
      <div className="flex items-center gap-2">
        <input id="is_active" type="checkbox" {...register('is_active')} defaultChecked={post.is_active} className="h-4 w-4" />
        <label htmlFor="is_active" className="text-body-sm text-text-primary">Publicação ativa</label>
      </div>
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="text-body-sm text-state-error-strong bg-state-error/10 border border-state-error/30 rounded-md p-3">
          Verifique os campos obrigatórios.
        </p>
      )}
      {state && !state.ok && (
        <p role="alert" className="text-body-sm text-state-error-strong bg-state-error/10 border border-state-error/30 rounded-md p-3">{state.error}</p>
      )}
      <div className="flex justify-end gap-2"><SubmitBtn>Salvar alterações</SubmitBtn></div>
    </form>
  );
}