import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  return data;
}

export async function requireUser() {
  const user = await getSession();
  if (!user) redirect('/login');
  return user;
}

export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  if (!profile.is_admin) redirect('/timeline');
  return profile;
}

export const AGENCY_ADMIN_EMAIL_DOMAIN = '@conteudoedu.com.br';

export function isAgencyAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(AGENCY_ADMIN_EMAIL_DOMAIN);
}