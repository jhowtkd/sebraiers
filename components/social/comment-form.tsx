'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { addPostCommentAction, addCheckinCommentAction } from '@/app/actions/social';
import type { ActionResult } from '@/app/actions/auth';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="sm" loading={pending}>Postar</Button>;
}

const POST_MAX = 500;
const CHECKIN_MAX = 300;

export function CommentForm({
  target,
  postId,
  checkinId,
}: {
  target: 'post' | 'checkin';
  postId?: string;
  checkinId?: string;
}) {
  const router = useRouter();
  const max = target === 'post' ? POST_MAX : CHECKIN_MAX;

  const action = React.useCallback(
    async (_prev: ActionResult | null, formData: FormData): Promise<ActionResult> => {
      const body = String(formData.get('body') ?? '');
      if (target === 'post') {
        return addPostCommentAction({ post_id: postId!, body });
      }
      return addCheckinCommentAction({ checkin_id: checkinId!, body });
    },
    [target, postId, checkinId]
  );

  const [state, formAction] = useFormState<ActionResult | null, FormData>(action, null);
  const { toast } = useToast();
  const [body, setBody] = React.useState('');

  React.useEffect(() => {
    if (state?.ok) {
      setBody('');
      router.refresh();
      toast({ title: 'Comentário publicado', variant: 'success' });
    } else if (state && !state.ok) {
      toast({ title: 'Erro', description: state.error, variant: 'error' });
    }
  }, [state, toast, router]);

  const nearLimit = body.length > max - 50;
  const overLimit = body.length > max;

  return (
    <form action={formAction} className="flex items-start gap-2">
      <input type="hidden" name="body" value={body} />
      <div className="flex-1">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={target === 'post' ? 'Fala aí...' : 'Deixa um elogio'}
          maxLength={max + 100}
          aria-invalid={overLimit}
        />
        <div className="flex items-center justify-between mt-1">
          <p className={cn('text-caption', nearLimit ? 'text-state-warning-strong' : 'text-text-muted')}>
            {body.length}/{max}
          </p>
        </div>
      </div>
      <SubmitBtn />
    </form>
  );
}
