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
