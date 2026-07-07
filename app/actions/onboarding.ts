'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth';

export type ActionResult = { ok: true } | { ok: false; error: string };

type Role = 'user' | 'admin';

export async function markOnboarded(role: Role): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };

  if (role === 'admin') {
    const profile = await getCurrentProfile();
    if (!profile?.is_admin) return { ok: false, error: 'forbidden' };
  }

  const patch =
    role === 'user'
      ? { onboarded_at: new Date().toISOString() }
      : { admin_onboarded_at: new Date().toISOString() };

  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function resetOnboarded(role: Role): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const patch = role === 'user' ? { onboarded_at: null } : { admin_onboarded_at: null };
  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}