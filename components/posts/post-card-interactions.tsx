'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { ReactionBar } from '@/components/social/reaction-bar';
import type { PostEngagement } from '@/lib/queries/posts';

type Props = {
  postId: string;
  url: string;
  networkLabel: string;
  engagement?: PostEngagement;
};

export function PostCardInteractions({ postId, engagement }: Props) {
  if (!engagement) return null;
  return (
    <div className="flex items-center justify-between gap-2 px-6 py-3 border-t border-border-subtle/60">
      <ReactionBar target="post" targetId={postId} engagement={engagement} compact />
      <Link
        href={`/post/${postId}#conversa`}
        className="inline-flex items-center gap-1.5 text-caption font-semibold text-text-muted hover:text-brand-azul-700 transition-colors duration-base shrink-0"
        aria-label={`Ver ${engagement.commentCount} comentários`}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        <span className="tabular-nums">{engagement.commentCount}</span>
      </Link>
    </div>
  );
}