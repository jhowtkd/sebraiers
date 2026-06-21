import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatRelative, initials } from '@/lib/utils';
import { CommentForm } from './comment-form';
import { MessageCircle } from 'lucide-react';

type Comment = {
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
  currentUserId: string;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-h4 text-text-primary flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        Conversa <span className="text-caption text-text-muted">({comments.length})</span>
      </h3>

      {comments.length === 0 ? (
        <p className="text-body-sm text-text-secondary">Ninguém falou nada ainda. Fala aí.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-brand-azul text-white text-caption font-semibold">
                  {initials(c.user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-body-sm font-medium text-text-primary">{c.user.full_name}</span>
                  <span className="text-caption text-text-muted">@{c.user.username} · {formatRelative(c.created_at)}</span>
                </div>
                <p className="text-body-sm text-text-primary whitespace-pre-wrap break-words mt-0.5">{c.body}</p>
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
