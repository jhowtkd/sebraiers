import 'server-only';
import { createClient } from '@/lib/supabase/server';
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
