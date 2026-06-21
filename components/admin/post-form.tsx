'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { postSchema, type PostInput } from '@/lib/validation';
import { createPostAction } from '@/app/actions/posts';
import { PostFormFields } from '@/components/forms/post-form-fields';
import { Button } from '@/components/ui/button';
import type { ActionResult } from '@/app/actions/auth';
import { useToast } from '@/components/ui/toast';

function SubmitBtn({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending}>{children}</Button>;
}

export function PostForm() {
  const { register } = useForm<PostInput>({ resolver: zodResolver(postSchema) });
  const [state, action] = useFormState<ActionResult | null, FormData>(createPostAction, null);
  const { toast } = useToast();

  return (
    <form action={action} className="space-y-4" onSubmit={() => state?.ok && toast({ title: 'Publicação criada', variant: 'success' })}>
      <PostFormFields register={register} />
      <input type="hidden" name="is_active" value="false" />
      <div className="flex items-center gap-2">
        <input id="is_active" type="checkbox" {...register('is_active')} defaultChecked className="h-4 w-4" />
        <label htmlFor="is_active" className="text-body-sm text-text-primary">Publicar imediatamente (ativa)</label>
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-body-sm text-state-error-strong bg-state-error/10 border border-state-error/30 rounded-md p-3">{state.error}</p>
      )}
      <div className="flex justify-end gap-2"><SubmitBtn>Criar publicação</SubmitBtn></div>
    </form>
  );
}