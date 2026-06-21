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

  const { data: updated, error: updErr } = await supabase.from('checkins').update({
    status: parsed.data.decision,
    decided_at: new Date().toISOString(),
    decided_by: user.id,
    admin_note: parsed.data.note ?? null,
  }).eq('id', parsed.data.checkin_id).select('user_id').maybeSingle();
  if (updErr || !updated) return { ok: false, error: 'Erro ao atualizar' };

  const { error: logErr } = await supabase.from('checkin_approvals').insert({
    checkin_id: parsed.data.checkin_id,
    admin_id: user.id,
    decision: parsed.data.decision,
    note: parsed.data.note ?? null,
  });
  if (logErr) return { ok: false, error: 'Erro ao registrar log' };

  revalidatePath('/admin/checkins');
  revalidatePath('/admin');
  revalidatePath('/ranking');
  revalidatePath('/meu-desempenho');
  return { ok: true };
}
