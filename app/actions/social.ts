'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  postReactionSetSchema,
  postCommentSchema,
  checkinReactionSetSchema,
  checkinCommentSchema,
} from '@/lib/validation';
import type { ActionResult } from '@/app/actions/auth';

type ReactionState = string | null;
export type SocialActionResult = ActionResult & { reaction?: ReactionState };

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function setPostReactionAction(input: { post_id: string; reaction: string }): Promise<SocialActionResult> {
  const parsed = postReactionSetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Não autenticado' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('toggle_post_reaction', {
    p_post_id: parsed.data.post_id,
    p_user_id: userId,
    p_reaction: parsed.data.reaction,
  });
  if (error) return { ok: false, error: 'Erro ao reagir' };

  const reaction = data === 'set' ? parsed.data.reaction : null;
  revalidatePath('/timeline');
  revalidatePath(`/post/${parsed.data.post_id}`);
  return { ok: true, reaction };
}

export async function addPostCommentAction(input: { post_id: string; body: string }): Promise<ActionResult> {
  const parsed = postCommentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Não autenticado' };

  const supabase = await createClient();
  const { error } = await supabase.from('post_comments').insert({
    post_id: parsed.data.post_id,
    user_id: userId,
    body: parsed.data.body,
  });
  if (error) return { ok: false, error: 'Erro ao comentar' };

  revalidatePath('/timeline');
  revalidatePath(`/post/${parsed.data.post_id}`);
  return { ok: true };
}

export async function setCheckinReactionAction(input: { checkin_id: string; reaction: 'clap' }): Promise<SocialActionResult> {
  const parsed = checkinReactionSetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Não autenticado' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('toggle_checkin_reaction', {
    p_checkin_id: parsed.data.checkin_id,
    p_user_id: userId,
    p_reaction: parsed.data.reaction,
  });
  if (error) return { ok: false, error: 'Erro ao reagir' };

  const reaction = data === 'set' ? parsed.data.reaction : null;
  revalidatePath('/meu-desempenho');
  return { ok: true, reaction };
}

export async function addCheckinCommentAction(input: { checkin_id: string; body: string }): Promise<ActionResult> {
  const parsed = checkinCommentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Não autenticado' };

  const supabase = await createClient();
  const { error } = await supabase.from('checkin_comments').insert({
    checkin_id: parsed.data.checkin_id,
    user_id: userId,
    body: parsed.data.body,
  });
  if (error) return { ok: false, error: 'Erro ao comentar' };

  revalidatePath('/meu-desempenho');
  return { ok: true };
}

export async function getCheckinCommentsAction(checkin_id: string): Promise<{ ok: boolean; comments?: { id: string; body: string; created_at: string; user: { full_name: string; username: string; avatar_url: string | null } }[]; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('checkin_comments')
    .select('id, body, created_at, user:profiles!checkin_comments_user_id_fkey(full_name, username, avatar_url)')
    .eq('checkin_id', checkin_id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return { ok: false, error: 'Erro ao carregar comentários' };
  return { ok: true, comments: (data ?? []) as unknown as { id: string; body: string; created_at: string; user: { full_name: string; username: string; avatar_url: string | null } }[] };
}
