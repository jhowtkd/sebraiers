import { Avatar } from '@/components/ui/avatar';
import { formatRelative } from '@/lib/utils';
import { CommentForm } from './comment-form';
import { MessageCircle } from 'lucide-react';

export type Comment = {
  id: string;
  body: string;
  created_at: string;
  user: { full_name: string; username: string; avatar_url: string | null };
};

export function Comments({
  target,
  postId,
  checkinId,
  comments,
}: {
  target: 'post' | 'checkin';
  postId?: string;
  checkinId?: string;
  comments: Comment[];
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-h4 font-bold text-text-primary flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-brand-azul" />
        Conversa <span className="text-caption font-normal text-text-muted">({comments.length})</span>
      </h3>

      {comments.length === 0 ? (
        <p className="text-body-sm text-text-secondary rounded-xl bg-surface-sunken p-4">
          Ninguém falou nada ainda. Fala aí.
        </p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start gap-3">
              <Avatar size="sm" name={c.user.full_name} src={c.user.avatar_url ?? null} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-body-sm font-semibold text-text-primary">{c.user.full_name}</span>
                  <span className="text-caption text-text-muted">@{c.user.username} · {formatRelative(c.created_at)}</span>
                </div>
                <p className="text-body-sm text-text-primary whitespace-pre-wrap break-words mt-1">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-2 border-t border-border-subtle">
        <CommentForm target={target} postId={postId} checkinId={checkinId} />
      </div>
    </div>
  );
}