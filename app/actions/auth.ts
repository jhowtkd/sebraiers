'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signupSchema, loginSchema } from '@/lib/validation';
import { isAdminEmail } from '@/lib/auth';

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
  const isAdmin = isAdminEmail(email);

  const { error } = await supabase.auth.signUp({
    email, password,
    options: {
      data: {
        full_name, username,
        // Server-side hint; cliente não pode forjar porque vem do server action
        ...(isAdmin ? { admin_email_hint: email } : {}),
      },
    },
  });
  if (error) return { ok: false, error: error.message };
  redirect('/perfil');
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
  redirect('/timeline');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
