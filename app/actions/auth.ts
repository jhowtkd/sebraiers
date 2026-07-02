'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signupSchema, loginSchema } from '@/lib/validation';

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function signUpAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    full_name: formData.get('full_name'),
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const { full_name, username, email, password } = parsed.data;

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email, password,
    options: {
      data: { full_name, username },
    },
  });
  if (error) return { ok: false, error: error.message };
  redirect('/perfil');
}

/** Validates a post-login redirect path: must be relative, not an auth route. */
function safeRedirectPath(next: string | null | undefined): string {
  if (!next) return '/timeline';
  // Must be an absolute path (starts with /) but not a protocol-relative URL (//evil.com).
  if (!next.startsWith('/') || next.startsWith('//')) return '/timeline';
  // Avoid redirect loops: never allow landing back on auth pages.
  if (next === '/login' || next === '/signup' || next.startsWith('/auth/')) return '/timeline';
  return next;
}

export async function signInAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { ok: false, error: 'Email ou senha inválidos' };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: 'Email ou senha inválidos' };
  redirect(safeRedirectPath(formData.get('next') as string | null));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
