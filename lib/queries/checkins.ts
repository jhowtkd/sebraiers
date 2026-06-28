import 'server-only';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Checkin, Network } from '@/lib/types';

type CheckinWithPost = Checkin & { post: { id: string; title: string; network: Network; cover_url: string | null } | null };

export async function getMyCheckinsForPost(postId: string): Promise<Checkin[]> {
  const user = await getSession();
  if (!user) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from('checkins').select('*')
    .eq('user_id', user.id).eq('post_id', postId).order('declared_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Checkin[];
}

export async function getMyCheckinsWithPost(): Promise<CheckinWithPost[]> {
  const user = await getSession();
  if (!user) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from('checkins')
    .select('*, post:posts(id, title, network, cover_url)')
    .eq('user_id', user.id).order('declared_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as CheckinWithPost[];
}

export type CheckinEngagement = {
  reactions: Record<string, number>;
  myReactions: string[];
  commentCount: number;
  comments: { id: string; body: string; created_at: string; user: { full_name: string; username: string; avatar_url: string | null } }[];
};

export async function getCheckinEngagement(checkinId: string, userId: string | null): Promise<CheckinEngagement> {
  const supabase = await createClient();
  const [rxRes, myRxRes, countRes, commentsRes] = await Promise.all([
    supabase.from('checkin_reactions').select('reaction').eq('checkin_id', checkinId),
    userId
      ? supabase.from('checkin_reactions').select('reaction').eq('checkin_id', checkinId).eq('user_id', userId)
      : Promise.resolve({ data: [] as { reaction: string }[] | null }),
    supabase.from('checkin_comments').select('id', { count: 'exact', head: true }).eq('checkin_id', checkinId),
    supabase.from('checkin_comments')
      .select('id, body, created_at, user:profiles!checkin_comments_user_id_fkey(full_name, username, avatar_url)')
      .eq('checkin_id', checkinId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  const reactions: Record<string, number> = {};
  (rxRes.data ?? []).forEach((r: { reaction: string }) => { reactions[r.reaction] = (reactions[r.reaction] ?? 0) + 1; });
  return {
    reactions,
    myReactions: (myRxRes.data ?? []).map((r: { reaction: string }) => r.reaction),
    commentCount: countRes.count ?? 0,
    comments: (commentsRes.data ?? []) as unknown as CheckinEngagement['comments'],
  };
}

export async function getCheckinsEngagementBatch(
  checkinIds: string[],
  userId: string | null
): Promise<Map<string, Omit<CheckinEngagement, 'comments'>>> {
  const result = new Map<string, Omit<CheckinEngagement, 'comments'>>();
  if (checkinIds.length === 0) return result;
  const supabase = await createClient();
  const [rxRes, myRxRes, commentsRes] = await Promise.all([
    supabase.from('checkin_reactions').select('checkin_id, reaction').in('checkin_id', checkinIds),
    userId
      ? supabase.from('checkin_reactions').select('checkin_id, reaction').in('checkin_id', checkinIds).eq('user_id', userId)
      : Promise.resolve({ data: [] as { checkin_id: string; reaction: string }[] | null }),
    supabase.from('checkin_comments').select('checkin_id').in('checkin_id', checkinIds),
  ]);
  const rxByCheckin = new Map<string, Record<string, number>>();
  (rxRes.data ?? []).forEach((r: { checkin_id: string; reaction: string }) => {
    if (!rxByCheckin.has(r.checkin_id)) rxByCheckin.set(r.checkin_id, {});
    const m = rxByCheckin.get(r.checkin_id)!;
    m[r.reaction] = (m[r.reaction] ?? 0) + 1;
  });
  const myRxByCheckin = new Map<string, string[]>();
  (myRxRes.data ?? []).forEach((r: { checkin_id: string; reaction: string }) => {
    if (!myRxByCheckin.has(r.checkin_id)) myRxByCheckin.set(r.checkin_id, []);
    myRxByCheckin.get(r.checkin_id)!.push(r.reaction);
  });
  const commentCountByCheckin = new Map<string, number>();
  (commentsRes.data ?? []).forEach((c: { checkin_id: string }) => {
    commentCountByCheckin.set(c.checkin_id, (commentCountByCheckin.get(c.checkin_id) ?? 0) + 1);
  });
  for (const id of checkinIds) {
    result.set(id, {
      reactions: rxByCheckin.get(id) ?? {},
      myReactions: myRxByCheckin.get(id) ?? [],
      commentCount: commentCountByCheckin.get(id) ?? 0,
    });
  }
  return result;
}
