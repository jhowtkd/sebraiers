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
  const { data: current } = await supabase
    .from('post_reactions')
    .select('reaction')
    .eq('post_id', parsed.data.post_id)
    .eq('user_id', userId);

  const hadSame = current && current.length === 1 && current[0].reaction === parsed.data.reaction;

  if (current && current.length > 0) {
    await supabase
      .from('post_reactions')
      .delete()
      .eq('post_id', parsed.data.post_id)
      .eq('user_id', userId);
  }

  if (hadSame) {
    revalidatePath('/timeline');
    revalidatePath(`/post/${parsed.data.post_id}`);
    return { ok: true, reaction: null };
  }

  const { error } = await supabase.from('post_reactions').insert({
    post_id: parsed.data.post_id,
    user_id: userId,
    reaction: parsed.data.reaction,
  });
  if (error) return { ok: false, error: 'Erro ao reagir' };

  revalidatePath('/timeline');
  revalidatePath(`/post/${parsed.data.post_id}`);
  return { ok: true, reaction: parsed.data.reaction };
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
  const { data: current } = await supabase
    .from('checkin_reactions')
    .select('reaction')
    .eq('checkin_id', parsed.data.checkin_id)
    .eq('user_id', userId);

  const hadSame = current && current.length === 1 && current[0].reaction === parsed.data.reaction;

  if (current && current.length > 0) {
    await supabase
      .from('checkin_reactions')
      .delete()
      .eq('checkin_id', parsed.data.checkin_id)
      .eq('user_id', userId);
  }

  if (hadSame) {
    revalidatePath('/meu-desempenho');
    return { ok: true, reaction: null };
  }

  const { error } = await supabase.from('checkin_reactions').insert({
    checkin_id: parsed.data.checkin_id,
    user_id: userId,
    reaction: parsed.data.reaction,
  });
  if (error) return { ok: false, error: 'Erro ao reagir' };

  revalidatePath('/meu-desempenho');
  return { ok: true, reaction: parsed.data.reaction };
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
