import 'server-only';
import { createClient } from '@/lib/supabase/server';
import {
  buildEngagementBatch,
  countReactions,
  type BaseEngagement,
  type CommentWithUser,
} from '@/lib/social/engagement';
import type { Post, Network } from '@/lib/types';

export type PostEngagement = BaseEngagement;

export type { CommentWithUser };

export async function getTimeline(opts: { network?: Network | 'all'; search?: string } = {}): Promise<Post[]> {
  const supabase = await createClient();
  let q = supabase.from('posts').select('*, author:profiles!posts_created_by_fkey(full_name, username, avatar_url)').eq('is_active', true)
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

export async function getPostEngagement(postId: string, userId: string | null): Promise<PostEngagement> {
  const supabase = await createClient();
  const [rxRes, myRxRes, countRes] = await Promise.all([
    supabase.from('post_reactions').select('reaction').eq('post_id', postId),
    userId
      ? supabase.from('post_reactions').select('reaction').eq('post_id', postId).eq('user_id', userId)
      : Promise.resolve({ data: [] as { reaction: string }[] | null }),
    supabase.from('post_comments').select('id', { count: 'exact', head: true }).eq('post_id', postId),
  ]);
  return {
    reactions: countReactions(rxRes.data ?? []),
    myReactions: (myRxRes.data ?? []).map((r: { reaction: string }) => r.reaction),
    commentCount: countRes.count ?? 0,
  };
}

export async function getPostsEngagementBatch(
  postIds: string[],
  userId: string | null
): Promise<Map<string, PostEngagement>> {
  if (postIds.length === 0) return new Map();
  const supabase = await createClient();
  const [rxRes, myRxRes, commentsRes] = await Promise.all([
    supabase.from('post_reactions').select('post_id, reaction').in('post_id', postIds),
    userId
      ? supabase.from('post_reactions').select('post_id, reaction').in('post_id', postIds).eq('user_id', userId)
      : Promise.resolve({ data: [] as { post_id: string; reaction: string }[] | null }),
    supabase.from('post_comments').select('post_id').in('post_id', postIds),
  ]);
  return buildEngagementBatch(
    postIds,
    (rxRes.data ?? []).map((r: { post_id: string; reaction: string }) => ({ id: r.post_id, reaction: r.reaction })),
    (myRxRes.data ?? []).map((r: { post_id: string; reaction: string }) => ({ id: r.post_id, reaction: r.reaction })),
    (commentsRes.data ?? []).map((c: { post_id: string }) => ({ id: c.post_id }))
  );
}

export async function getPostEngagementWithComments(
  postId: string,
  userId: string | null
): Promise<PostEngagement & { comments: CommentWithUser[] }> {
  const supabase = await createClient();
  const [engagement, commentsRes] = await Promise.all([
    getPostEngagement(postId, userId),
    supabase.from('post_comments')
      .select('id, body, created_at, user:profiles!post_comments_user_id_fkey(full_name, username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  return {
    ...engagement,
    comments: (commentsRes.data ?? []) as unknown as CommentWithUser[],
  };
}
