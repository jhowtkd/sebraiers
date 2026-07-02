export type BaseEngagement = {
  reactions: Record<string, number>;
  myReactions: string[];
  commentCount: number;
};

export type CommentWithUser = {
  id: string;
  body: string;
  created_at: string;
  user: { full_name: string; username: string; avatar_url: string | null };
};

export function countReactions(rows: { reaction: string }[]): Record<string, number> {
  const reactions: Record<string, number> = {};
  for (const r of rows) {
    reactions[r.reaction] = (reactions[r.reaction] ?? 0) + 1;
  }
  return reactions;
}

export function groupReactionsById(
  rows: { id: string; reaction: string }[]
): Map<string, Record<string, number>> {
  const out = new Map<string, Record<string, number>>();
  for (const r of rows) {
    if (!out.has(r.id)) out.set(r.id, {});
    const m = out.get(r.id)!;
    m[r.reaction] = (m[r.reaction] ?? 0) + 1;
  }
  return out;
}

export function groupMyReactionsById(
  rows: { id: string; reaction: string }[]
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const r of rows) {
    if (!out.has(r.id)) out.set(r.id, []);
    out.get(r.id)!.push(r.reaction);
  }
  return out;
}

export function countCommentsById(rows: { id: string }[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    out.set(r.id, (out.get(r.id) ?? 0) + 1);
  }
  return out;
}

export function buildEngagementBatch(
  ids: string[],
  reactionRows: { id: string; reaction: string }[],
  myReactionRows: { id: string; reaction: string }[],
  commentRows: { id: string }[]
): Map<string, BaseEngagement> {
  const rxById = groupReactionsById(reactionRows);
  const myRxById = groupMyReactionsById(myReactionRows);
  const commentCountById = countCommentsById(commentRows);
  const result = new Map<string, BaseEngagement>();
  for (const id of ids) {
    result.set(id, {
      reactions: rxById.get(id) ?? {},
      myReactions: myRxById.get(id) ?? [],
      commentCount: commentCountById.get(id) ?? 0,
    });
  }
  return result;
}
