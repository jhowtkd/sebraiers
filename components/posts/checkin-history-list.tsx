'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { NetworkIcon } from '@/components/ui/network-icon';
import { ReactionBar } from '@/components/social/reaction-bar';
import { Comments } from '@/components/social/comments';
import { formatRelative } from '@/lib/utils';
import { ACTION_LABELS, type CheckinAction, type CheckinStatus, type Network } from '@/lib/types';
import type { CheckinEngagement } from '@/lib/queries/checkins';

type Item = {
  id: string;
  action: CheckinAction;
  status: CheckinStatus;
  points: number;
  declared_at: string;
  post: { id: string; title: string; network: Network; cover_url: string | null } | null;
};

export function CheckinHistoryList({
  items,
  engagementMap,
  currentUserId,
}: {
  items: Item[];
  engagementMap: Map<string, CheckinEngagement>;
  currentUserId: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-subtle p-10 text-center text-text-secondary">
        Você ainda não declarou nenhuma ação. Acesse a <Link href="/timeline" className="text-brand-azul font-medium hover:underline">timeline</Link>.
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((it) => {
        const engagement = engagementMap.get(it.id);
        const isOpen = openId === it.id;
        return (
          <Card key={it.id}>
            <CardBody>
              <div className="flex items-center gap-4">
                {it.post?.cover_url && (
                  <img
                    src={it.post.cover_url}
                    alt=""
                    className="h-12 w-12 rounded-md object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-caption text-text-secondary mb-1">
                    <NetworkIcon network={it.post?.network ?? 'instagram'} />
                    <span className="font-medium">{ACTION_LABELS[it.action]}</span>
                    <span>·</span>
                    <span>{formatRelative(it.declared_at)}</span>
                  </div>
                  {it.post && (
                    <Link
                      href={`/post/${it.post.id}`}
                      className="block text-body-sm font-medium text-text-primary hover:text-brand-azul truncate"
                    >
                      {it.post.title}
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-body-sm tabular-nums font-semibold text-text-primary">+{it.points}</span>
                  <StatusBadge status={it.status} />
                </div>
              </div>
              {engagement && (
                <div className="mt-3 pt-3 border-t border-border-subtle space-y-2">
                  <ReactionBar target="checkin" targetId={it.id} engagement={engagement} />
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : it.id)}
                    aria-expanded={isOpen}
                    className="inline-flex items-center gap-1.5 text-caption text-text-muted hover:text-brand-azul"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="tabular-nums">{engagement.commentCount}</span>
                    <span>{engagement.commentCount === 1 ? 'comentário' : 'comentários'}</span>
                    {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {isOpen && (
                    <div className="pt-2">
                      <Comments
                        target="checkin"
                        checkinId={it.id}
                        comments={engagement.comments}
                        currentUserId={currentUserId}
                      />
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}
    </ul>
  );
}
