export const POST_REACTIONS = {
  fire: { emoji: '🔥', label: 'Arrasou' },
  muscle: { emoji: '💪', label: 'Força' },
  clap: { emoji: '👏', label: 'Aplausos' },
  raised: { emoji: '🙌', label: 'Comemorando' },
  laugh: { emoji: '😂', label: 'Engraçado' },
} as const;
export type PostReactionKind = keyof typeof POST_REACTIONS;

export const CHECKIN_REACTIONS = {
  clap: { emoji: '👏', label: 'Tamo junto' },
} as const;
export type CheckinReactionKind = keyof typeof CHECKIN_REACTIONS;

export function isPostReactionKind(v: string): v is PostReactionKind {
  return v in POST_REACTIONS;
}

export function isCheckinReactionKind(v: string): v is CheckinReactionKind {
  return v in CHECKIN_REACTIONS;
}