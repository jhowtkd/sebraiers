import 'server-only';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { buildEngagementBatch, countReactions, type BaseEngagement, type CommentWithUser } from '@/lib/social/engagement';
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

export type CheckinEngagement = BaseEngagement & {
  comments: CommentWithUser[];
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
  return {
    reactions: countReactions(rxRes.data ?? []),
    myReactions: (myRxRes.data ?? []).map((r: { reaction: string }) => r.reaction),
    commentCount: countRes.count ?? 0,
    comments: (commentsRes.data ?? []) as unknown as CommentWithUser[],
  };
}

export async function getCheckinsEngagementBatch(
  checkinIds: string[],
  userId: string | null
): Promise<Map<string, BaseEngagement>> {
  if (checkinIds.length === 0) return new Map();
  const supabase = await createClient();
  const [rxRes, myRxRes, commentsRes] = await Promise.all([
    supabase.from('checkin_reactions').select('checkin_id, reaction').in('checkin_id', checkinIds),
    userId
      ? supabase.from('checkin_reactions').select('checkin_id, reaction').in('checkin_id', checkinIds).eq('user_id', userId)
      : Promise.resolve({ data: [] as { checkin_id: string; reaction: string }[] | null }),
    supabase.from('checkin_comments').select('checkin_id').in('checkin_id', checkinIds),
  ]);
  return buildEngagementBatch(
    checkinIds,
    (rxRes.data ?? []).map((r: { checkin_id: string; reaction: string }) => ({ id: r.checkin_id, reaction: r.reaction })),
    (myRxRes.data ?? []).map((r: { checkin_id: string; reaction: string }) => ({ id: r.checkin_id, reaction: r.reaction })),
    (commentsRes.data ?? []).map((c: { checkin_id: string }) => ({ id: c.checkin_id }))
  );
}

/** @deprecated Use getMyPerformanceDashboard from lib/queries/me */
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
