'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { profileSocialsSchema } from '@/lib/validation';
import type { ActionResult } from '@/app/actions/auth';
export type { ActionResult };

export async function updateSocialsAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const raw = {
    instagram: (formData.get('instagram') as string) || null,
    linkedin: (formData.get('linkedin') as string) || null,
    facebook: (formData.get('facebook') as string) || null,
    tiktok: (formData.get('tiktok') as string) || null,
    youtube: (formData.get('youtube') as string) || null,
    threads: (formData.get('threads') as string) || null,
  };
  const parsed = profileSocialsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { error } = await supabase.from('user_socials').upsert({
    user_id: user.id, ...parsed.data, updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: 'Erro ao salvar' };

  revalidatePath('/perfil');
  return { ok: true };
}
