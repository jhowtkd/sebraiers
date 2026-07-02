'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminClient } from '@/lib/supabase/admin';
import { postSchema } from '@/lib/validation';
import type { ActionResult } from '@/app/actions/auth';
import { requireAdminOrFail, fileFromFormData } from '@/app/actions/_shared/admin-guard';

export async function createPostAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, user, profile } = await requireAdminOrFail();
  if (!user) return { ok: false, error: 'Não autenticado' };
  if (!profile?.is_admin) return { ok: false, error: 'Sem permissão' };

  const parsed = postSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || null,
    network: formData.get('network'),
    original_url: formData.get('original_url'),
    published_at: formData.get('published_at'),
    cover_url: formData.get('cover_url') || null,
    is_active: formData.get('is_active') === 'on' || formData.get('is_active') === 'true',
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const cover = fileFromFormData(formData, 'cover_file');
  let cover_url = parsed.data.cover_url ?? null;
  if (cover) {
    const admin = getAdminClient();
    const ext = cover.name.split('.').pop();
    const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await admin.storage.from('post-covers').upload(path, cover, { contentType: cover.type });
    if (upErr) return { ok: false, error: 'Falha no upload da imagem' };
    const { data: pub } = admin.storage.from('post-covers').getPublicUrl(path);
    cover_url = pub.publicUrl;
  }

  const { error } = await supabase.from('posts').insert({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    network: parsed.data.network,
    original_url: parsed.data.original_url,
    published_at: new Date(parsed.data.published_at).toISOString(),
    cover_url,
    is_active: parsed.data.is_active,
    created_by: user.id,
  });
  if (error) return { ok: false, error: 'Erro ao criar publicação' };

  revalidatePath('/admin/posts');
  revalidatePath('/timeline');
  redirect('/admin/posts');
}

export async function updatePostAction(id: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, user, profile } = await requireAdminOrFail();
  if (!user) return { ok: false, error: 'Não autenticado' };
  if (!profile?.is_admin) return { ok: false, error: 'Sem permissão' };

  const parsed = postSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || null,
    network: formData.get('network'),
    original_url: formData.get('original_url'),
    published_at: formData.get('published_at'),
    cover_url: formData.get('cover_url') || null,
    is_active: formData.get('is_active') === 'on' || formData.get('is_active') === 'true',
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const cover = fileFromFormData(formData, 'cover_file');
  let cover_url = parsed.data.cover_url ?? null;
  if (cover) {
    const admin = getAdminClient();
    const ext = cover.name.split('.').pop();
    const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await admin.storage.from('post-covers').upload(path, cover, { contentType: cover.type });
    if (upErr) return { ok: false, error: 'Falha no upload da imagem' };
    const { data: pub } = admin.storage.from('post-covers').getPublicUrl(path);
    cover_url = pub.publicUrl;
  }

  const { error } = await supabase.from('posts').update({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    network: parsed.data.network,
    original_url: parsed.data.original_url,
    published_at: new Date(parsed.data.published_at).toISOString(),
    cover_url,
    is_active: parsed.data.is_active,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return { ok: false, error: 'Erro ao atualizar' };

  revalidatePath('/admin/posts');
  revalidatePath('/timeline');
  revalidatePath(`/post/${id}`);
  redirect('/admin/posts');
}

export async function togglePostActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  const { supabase, user, profile } = await requireAdminOrFail();
  if (!user) return { ok: false, error: 'Não autenticado' };
  if (!profile?.is_admin) return { ok: false, error: 'Sem permissão' };
  const { error } = await supabase.from('posts').update({ is_active: isActive }).eq('id', id);
  if (error) return { ok: false, error: 'Erro' };
  revalidatePath('/admin/posts');
  revalidatePath('/timeline');
  revalidatePath(`/post/${id}`);
  return { ok: true };
}

export async function deletePostAction(id: string): Promise<ActionResult> {
  const { supabase, user, profile } = await requireAdminOrFail();
  if (!user) return { ok: false, error: 'Não autenticado' };
  if (!profile?.is_admin) return { ok: false, error: 'Sem permissão' };
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) return { ok: false, error: 'Erro' };
  revalidatePath('/admin/posts');
  revalidatePath('/timeline');
  return { ok: true };
}