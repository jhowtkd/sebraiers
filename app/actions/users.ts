'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/app/actions/auth';
import { requireAdminOrFail } from '@/app/actions/_shared/admin-guard';

export async function toggleUserActiveAction(userId: string, isActive: boolean): Promise<ActionResult> {
  const { supabase, user, profile } = await requireAdminOrFail();
  if (!user) return { ok: false, error: 'Não autenticado' };
  if (!profile?.is_admin) return { ok: false, error: 'Sem permissão' };
  if (userId === user.id && !isActive) return { ok: false, error: 'Você não pode desativar sua própria conta.' };
  const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', userId);
  if (error) {
    if (error.code === '42501') return { ok: false, error: 'Não é permitido desativar o último admin.' };
    return { ok: false, error: 'Erro' };
  }
  revalidatePath('/admin/users');
  return { ok: true };
}

export async function toggleUserAdminAction(userId: string, isAdmin: boolean): Promise<ActionResult> {
  const { supabase, user, profile } = await requireAdminOrFail();
  if (!user) return { ok: false, error: 'Não autenticado' };
  if (!profile?.is_admin) return { ok: false, error: 'Sem permissão' };
  if (userId === user.id && !isAdmin) return { ok: false, error: 'Você não pode rebaixar a si mesmo.' };
  const { error } = await supabase.from('profiles').update({ is_admin: isAdmin }).eq('id', userId);
  if (error) {
    if (error.code === '42501') return { ok: false, error: 'Não é permitido rebaixar o último admin.' };
    return { ok: false, error: 'Erro' };
  }
  revalidatePath('/admin/users');
  revalidatePath('/timeline');
  return { ok: true };
}
