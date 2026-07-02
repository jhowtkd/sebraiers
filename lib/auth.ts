import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

export const getSession = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSession();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  return data;
});

export type AuthHeaderContext = {
  user: User;
  fullName: string;
  username: string;
  isAdmin: boolean;
  avatarUrl: string | null;
};

/** Single auth + profile fetch for layout header (deduped per request via cache). */
export const getAuthHeaderContext = cache(async (): Promise<AuthHeaderContext | null> => {
  const user = await getSession();
  if (!user) return null;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username, is_admin, avatar_url')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile) return null;
  return {
    user,
    fullName: profile.full_name,
    username: profile.username,
    isAdmin: profile.is_admin === true,
    avatarUrl: profile.avatar_url ?? null,
  };
});

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
