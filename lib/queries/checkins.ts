import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Checkin, Network } from '@/lib/types';

type CheckinWithPost = Checkin & { post: { id: string; title: string; network: Network; cover_url: string | null } | null };

export async function getMyCheckinsForPost(postId: string): Promise<Checkin[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('checkins').select('*')
    .eq('user_id', user.id).eq('post_id', postId).order('declared_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Checkin[];
}

export async function getMyCheckinsWithPost(): Promise<CheckinWithPost[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
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
  comments: { id: string; body: string; created_at: string; user: { full_name: string; username: string } }[];
};

export async function getCheckinEngagement(checkinId: string, userId: string | null): Promise<CheckinEngagement> {
  const supabase = await createClient();
  const [rxRes, myRxRes, commentsRes] = await Promise.all([
    supabase.from('checkin_reactions').select('reaction').eq('checkin_id', checkinId),
    userId
      ? supabase.from('checkin_reactions').select('reaction').eq('checkin_id', checkinId).eq('user_id', userId)
      : Promise.resolve({ data: [] as { reaction: string }[] | null }),
    supabase.from('checkin_comments')
      .select('id, body, created_at, user:profiles!checkin_comments_user_id_fkey(full_name, username)')
      .eq('checkin_id', checkinId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  const reactions: Record<string, number> = {};
  (rxRes.data ?? []).forEach((r: { reaction: string }) => { reactions[r.reaction] = (reactions[r.reaction] ?? 0) + 1; });
  return {
    reactions,
    myReactions: (myRxRes.data ?? []).map((r: { reaction: string }) => r.reaction),
    commentCount: commentsRes.data?.length ?? 0,
    comments: (commentsRes.data ?? []) as unknown as CheckinEngagement['comments'],
  };
}
