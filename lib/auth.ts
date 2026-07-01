import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { IS_MOCK, mockGetAuthHeaderContext, mockGetCurrentProfile } from '@/lib/mock/db';
import type { Profile } from '@/lib/types';

export const getSession = cache(async (): Promise<User | null> => {
  if (IS_MOCK) {
    const ctx = mockGetAuthHeaderContext();
    return ctx.user as unknown as User;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  if (IS_MOCK) {
    return mockGetCurrentProfile();
  }
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
  if (IS_MOCK) {
    return mockGetAuthHeaderContext();
  }
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
  if (IS_MOCK) {
    const ctx = mockGetAuthHeaderContext();
    return ctx.user as unknown as User;
  }
  const user = await getSession();
  if (!user) redirect('/login');
  return user;
}

export async function requireAdmin() {
  if (IS_MOCK) {
    return mockGetCurrentProfile();
  }
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