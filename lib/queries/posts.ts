import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Post, Network } from '@/lib/types';

export async function getTimeline(opts: { network?: Network | 'all'; search?: string } = {}): Promise<Post[]> {
  const supabase = await createClient();
  let q = supabase.from('posts').select('*').eq('is_active', true)
    .order('published_at', { ascending: false }).limit(100);
  if (opts.network && opts.network !== 'all') q = q.eq('network', opts.network);
  if (opts.search) q = q.ilike('title', `%${opts.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Post[];
}

export async function getPostById(id: string): Promise<Post | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('posts').select('*').eq('id', id).eq('is_active', true).maybeSingle();
  if (error) throw error;
  return data as Post | null;
}

export type PostEngagement = {
  reactions: Record<string, number>;
  myReactions: string[];
  commentCount: number;
};

export async function getPostEngagement(postId: string, userId: string | null): Promise<PostEngagement> {
  const supabase = await createClient();
  const [rxRes, myRxRes, countRes] = await Promise.all([
    supabase.from('post_reactions').select('reaction').eq('post_id', postId),
    userId
      ? supabase.from('post_reactions').select('reaction').eq('post_id', postId).eq('user_id', userId)
      : Promise.resolve({ data: [] as { reaction: string }[] | null }),
    supabase.from('post_comments').select('id', { count: 'exact', head: true }).eq('post_id', postId),
  ]);
  const reactions: Record<string, number> = {};
  (rxRes.data ?? []).forEach((r: { reaction: string }) => { reactions[r.reaction] = (reactions[r.reaction] ?? 0) + 1; });
  return {
    reactions,
    myReactions: (myRxRes.data ?? []).map((r: { reaction: string }) => r.reaction),
    commentCount: countRes.count ?? 0,
  };
}

export async function getPostsEngagementBatch(
  postIds: string[],
  userId: string | null
): Promise<Map<string, PostEngagement>> {
  const result = new Map<string, PostEngagement>();
  if (postIds.length === 0) return result;
  const supabase = await createClient();
  const [rxRes, myRxRes, commentsRes] = await Promise.all([
    supabase.from('post_reactions').select('post_id, reaction').in('post_id', postIds),
    userId
      ? supabase.from('post_reactions').select('post_id, reaction').in('post_id', postIds).eq('user_id', userId)
      : Promise.resolve({ data: [] as { post_id: string; reaction: string }[] | null }),
    supabase.from('post_comments').select('post_id').in('post_id', postIds),
  ]);
  const rxByPost = new Map<string, Record<string, number>>();
  (rxRes.data ?? []).forEach((r: { post_id: string; reaction: string }) => {
    if (!rxByPost.has(r.post_id)) rxByPost.set(r.post_id, {});
    const m = rxByPost.get(r.post_id)!;
    m[r.reaction] = (m[r.reaction] ?? 0) + 1;
  });
  const myRxByPost = new Map<string, string[]>();
  (myRxRes.data ?? []).forEach((r: { post_id: string; reaction: string }) => {
    if (!myRxByPost.has(r.post_id)) myRxByPost.set(r.post_id, []);
    myRxByPost.get(r.post_id)!.push(r.reaction);
  });
  const commentCountByPost = new Map<string, number>();
  (commentsRes.data ?? []).forEach((c: { post_id: string }) => {
    commentCountByPost.set(c.post_id, (commentCountByPost.get(c.post_id) ?? 0) + 1);
  });
  for (const id of postIds) {
    result.set(id, {
      reactions: rxByPost.get(id) ?? {},
      myReactions: myRxByPost.get(id) ?? [],
      commentCount: commentCountByPost.get(id) ?? 0,
    });
  }
  return result;
}

export type CommentWithUser = {
  id: string;
  body: string;
  created_at: string;
  user: { full_name: string; username: string; avatar_url: string | null };
};

export async function getPostEngagementWithComments(
  postId: string,
  userId: string | null
): Promise<PostEngagement & { comments: CommentWithUser[] }> {
  const supabase = await createClient();
  const [rxRes, myRxRes, countRes, commentsRes] = await Promise.all([
    supabase.from('post_reactions').select('reaction').eq('post_id', postId),
    userId
      ? supabase.from('post_reactions').select('reaction').eq('post_id', postId).eq('user_id', userId)
      : Promise.resolve({ data: [] as { reaction: string }[] | null }),
    supabase.from('post_comments').select('id', { count: 'exact', head: true }).eq('post_id', postId),
    supabase.from('post_comments')
      .select('id, body, created_at, user:profiles!post_comments_user_id_fkey(full_name, username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  const reactions: Record<string, number> = {};
  (rxRes.data ?? []).forEach((r: { reaction: string }) => { reactions[r.reaction] = (reactions[r.reaction] ?? 0) + 1; });
  return {
    reactions,
    myReactions: (myRxRes.data ?? []).map((r: { reaction: string }) => r.reaction),
    commentCount: countRes.count ?? 0,
    comments: (commentsRes.data ?? []) as unknown as CommentWithUser[],
  };
}
