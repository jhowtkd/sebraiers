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
