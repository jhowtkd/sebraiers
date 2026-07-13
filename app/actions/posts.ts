'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { postSchema } from '@/lib/validation';
import type { ActionResult } from '@/app/actions/auth';
import { requireAdminOrFail, fileFromFormData, uploadPostCover } from '@/app/actions/_shared/admin-guard';
import { isMirroredCoverUrl, isProxyableCoverUrl, normalizeCoverUrl } from '@/lib/cover-image';
import { mirrorCoverToStorage } from '@/lib/cover-image-fetch';

function parseIsActive(formData: FormData): boolean {
  return formData.getAll('is_active').some((v) => v === 'on' || v === 'true');
}

/** Prefer Storage upload; otherwise persist a durable URL when the CDN can be mirrored. */
async function resolveCoverUrlForSave(
  file: File | null,
  pastedUrl: string | null | undefined,
): Promise<{ ok: true; cover_url: string | null } | { ok: false; error: string }> {
  if (file) {
    const uploaded = await uploadPostCover(file);
    if (uploaded === null) return { ok: false, error: 'Falha no upload da imagem' };
    return { ok: true, cover_url: uploaded };
  }

  if (!pastedUrl) return { ok: true, cover_url: null };

  const normalized = normalizeCoverUrl(pastedUrl);
  if (isMirroredCoverUrl(normalized) || !isProxyableCoverUrl(normalized)) {
    return { ok: true, cover_url: normalized };
  }

  const mirrored = await mirrorCoverToStorage(normalized);
  // Keep the pasted CDN URL if mirroring fails (e.g. expired signature) so the
  // admin can still save and replace the cover later via file upload.
  return { ok: true, cover_url: mirrored ?? normalized };
}

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
    is_active: parseIsActive(formData),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const cover = fileFromFormData(formData, 'cover_file');
  const resolved = await resolveCoverUrlForSave(cover, parsed.data.cover_url);
  if (!resolved.ok) return resolved;

  const { error } = await supabase.from('posts').insert({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    network: parsed.data.network,
    original_url: parsed.data.original_url,
    published_at: new Date(parsed.data.published_at).toISOString(),
    cover_url: resolved.cover_url,
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
    is_active: parseIsActive(formData),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const cover = fileFromFormData(formData, 'cover_file');
  const resolved = await resolveCoverUrlForSave(cover, parsed.data.cover_url);
  if (!resolved.ok) return resolved;

  const { error } = await supabase.from('posts').update({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    network: parsed.data.network,
    original_url: parsed.data.original_url,
    published_at: new Date(parsed.data.published_at).toISOString(),
    cover_url: resolved.cover_url,
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