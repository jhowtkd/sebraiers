import { ReactionButton } from './reaction-button';
import { POST_REACTIONS, CHECKIN_REACTIONS, type PostReactionKind, type CheckinReactionKind } from '@/lib/social/emojis';
import { cn } from '@/lib/utils';
import type { PostEngagement } from '@/lib/queries/posts';
import type { CheckinEngagement } from '@/lib/queries/checkins';

const POST_KINDS: PostReactionKind[] = ['fire', 'muscle', 'clap', 'raised', 'laugh'];

export function ReactionBar({
  target,
  targetId,
  engagement,
  compact,
}: {
  target: 'post' | 'checkin';
  targetId: string;
  engagement: PostEngagement | CheckinEngagement;
  compact?: boolean;
}) {
  if (target === 'post') {
    const e = engagement as PostEngagement;
    const totalReactions = Object.values(e.reactions).reduce((sum, n) => sum + n, 0);
    const empty = totalReactions === 0;
    return (
      <div className="space-y-1.5">
        {empty && (
          <p className="text-caption text-text-muted">Bora dar um 🔥</p>
        )}
        <div className={cn('flex flex-wrap gap-1.5', compact && 'gap-1')}>
          {POST_KINDS.map((kind) => {
            const def = POST_REACTIONS[kind];
            return (
              <ReactionButton
                key={kind}
                emoji={def.emoji}
                label={def.label}
                reaction={kind}
                count={e.reactions[kind] ?? 0}
                active={e.myReactions.includes(kind)}
                target="post"
                targetId={targetId}
              />
            );
          })}
        </div>
      </div>
    );
  }
  const e = engagement as CheckinEngagement;
  const claps = e.reactions.clap ?? 0;
  const empty = claps === 0;
  const kind: CheckinReactionKind = 'clap';
  const def = CHECKIN_REACTIONS[kind];
  return (
    <div className="space-y-1.5">
      {empty && (
        <p className="text-caption text-text-muted">Ninguém mandou energia ainda. Bora ser o primeiro!</p>
      )}
      <div className="flex">
        <ReactionButton
          emoji={def.emoji}
          label={def.label}
          reaction={kind}
          count={claps}
          active={e.myReactions.includes(kind)}
          target="checkin"
          targetId={targetId}
        />
      </div>
    </div>
  );
}
