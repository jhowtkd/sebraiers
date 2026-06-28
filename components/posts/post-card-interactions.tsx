'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { ReactionBar } from '@/components/social/reaction-bar';
import { EngageButton } from './engage-button';
import type { PostEngagement } from '@/lib/queries/posts';

type Props = {
  postId: string;
  url: string;
  networkLabel: string;
  engagement?: PostEngagement;
};

/** Single client boundary per timeline card (reactions + engage CTA). */
export function PostCardInteractions({ postId, url, networkLabel, engagement }: Props) {
  return (
    <>
      {engagement && (
        <div className="flex items-center justify-between gap-2 px-6 py-3 border-t border-border-subtle/60">
          <ReactionBar
            target="post"
            targetId={postId}
            engagement={engagement}
            compact
          />
          <Link
            href={`/post/${postId}#conversa`}
            className="inline-flex items-center gap-1 text-caption text-text-muted hover:text-brand-azul transition-colors shrink-0"
            aria-label={`Ver ${engagement.commentCount} comentários`}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="tabular-nums">{engagement.commentCount}</span>
          </Link>
        </div>
      )}
      <div className="px-6 pt-2 pb-6">
        <EngageButton
          postId={postId}
          url={url}
          networkLabel={networkLabel}
        />
      </div>
    </>
  );
}
