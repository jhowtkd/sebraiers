'use server';

import { createClient } from '@/lib/supabase/server';
import { checkinDeclareSchema } from '@/lib/validation';
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
