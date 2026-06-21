'use server';

import { createClient } from '@/lib/supabase/server';
import { checkinDeclareSchema, checkinDecideSchema } from '@/lib/validation';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/app/actions/auth';

export async function declareCheckinAction(input: { post_id: string; action: 'like' | 'comment' | 'share' }): Promise<ActionResult> {
  const parsed = checkinDeclareSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const { data: post } = await supabase.from('posts').select('id, is_active').eq('id', parsed.data.post_id).maybeSingle();
  if (!post || !post.is_active) return { ok: false, error: 'Publicação não disponível' };

  const { error } = await supabase.from('checkins').insert({
    user_id: user.id, post_id: parsed.data.post_id, action: parsed.data.action, status: 'pending',
  });
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Você já declarou essa ação neste post.' };
    return { ok: false, error: 'Erro ao registrar ação' };
  }

  revalidatePath(`/post/${parsed.data.post_id}`);
  revalidatePath('/meu-desempenho');
  return { ok: true };
}

export async function decideCheckinAction(input: { checkin_id: string; decision: 'approved' | 'rejected'; note?: string | null }): Promise<ActionResult> {
  const parsed = checkinDecideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return { ok: false, error: 'Sem permissão' };

  const { error: rpcErr } = await supabase.rpc('decide_checkin', {
    p_checkin_id: parsed.data.checkin_id,
    p_decision: parsed.data.decision,
    p_admin_id: user.id,
    p_note: parsed.data.note ?? null,
  });
  if (rpcErr) {
    if (rpcErr.code === 'P0002') return { ok: false, error: 'Este check-in já foi decidido.' };
    return { ok: false, error: 'Erro ao processar decisão.' };
  }

  revalidatePath('/admin/checkins');
  revalidatePath('/admin');
  revalidatePath('/ranking');
  revalidatePath('/meu-desempenho');
  return { ok: true };
}
