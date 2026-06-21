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
