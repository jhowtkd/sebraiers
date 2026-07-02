import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

type AdminGuardResult = {
  supabase: SupabaseClient;
  user: { id: string } | null;
  profile: { is_admin: boolean } | null;
};

/**
 * Fetches the session and admin profile in one shot.
 * Returns user: null when unauthenticated, profile.is_admin falsy when not admin.
 * Callers must check both before proceeding.
 */
export async function requireAdminOrFail(): Promise<AdminGuardResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null } as const;
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  return { supabase, user, profile };
}

/** Returns a File from FormData only if present and non-empty, else null. */
export function fileFromFormData(formData: FormData, key: string): File | null {
  const v = formData.get(key);
  return v instanceof File && v.size > 0 ? v : null;
}

/**
 * Uploads a post cover image to the post-covers bucket and returns its public URL.
 * Returns null if the upload fails (caller surfaces a generic error).
 */
export async function uploadPostCover(file: File): Promise<string | null> {
  const admin = getAdminClient();
  const ext = file.name.split('.').pop();
  const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await admin.storage.from('post-covers').upload(path, file, { contentType: file.type });
  if (upErr) return null;
  const { data: pub } = admin.storage.from('post-covers').getPublicUrl(path);
  return pub.publicUrl;
}
