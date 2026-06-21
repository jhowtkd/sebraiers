import { ReactionButton } from './reaction-button';
import { POST_REACTIONS, CHECKIN_REACTIONS, type PostReactionKind, type CheckinReactionKind } from '@/lib/social/emojis';
import { cn } from '@/lib/utils';

type Engagement = { reactions: Record<string, number>; myReactions: string[] };

const POST_KINDS: PostReactionKind[] = ['fire', 'muscle', 'clap', 'raised', 'laugh'];

export function ReactionBar({
  target,
  targetId,
  engagement,
  compact,
}: {
  target: 'post' | 'checkin';
  targetId: string;
  engagement: Engagement;
  compact?: boolean;
}) {
  if (target === 'post') {
    return (
      <div className={cn('flex flex-wrap gap-1.5', compact && 'gap-1')}>
        {POST_KINDS.map((kind) => {
          const def = POST_REACTIONS[kind];
          return (
            <ReactionButton
              key={kind}
              emoji={def.emoji}
              label={def.label}
              reaction={kind}
              count={engagement.reactions[kind] ?? 0}
              active={engagement.myReactions.includes(kind)}
              target="post"
              targetId={targetId}
            />
          );
        })}
      </div>
    );
  }
  const kind: CheckinReactionKind = 'clap';
  const def = CHECKIN_REACTIONS[kind];
  return (
    <div className="flex">
      <ReactionButton
        emoji={def.emoji}
        label={def.label}
        reaction={kind}
        count={engagement.reactions[kind] ?? 0}
        active={engagement.myReactions.includes(kind)}
        target="checkin"
        targetId={targetId}
      />
    </div>
  );
}