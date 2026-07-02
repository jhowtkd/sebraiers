import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({ redirect: vi.fn((url: string) => { throw new Error('NEXT_REDIRECT:' + url); }) }));

const signUpMock = vi.fn();
const signInMock = vi.fn();
const getUserMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { signUp: signUpMock, signInWithPassword: signInMock, getUser: getUserMock } }),
}));

import { signUpAction, signInAction } from '@/app/actions/auth';

describe('signUpAction', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('rejects invalid data', async () => {
    const fd = new FormData();
    fd.set('full_name', 'A');
    fd.set('username', 'ab');
    fd.set('email', 'bad');
    fd.set('password', 'short');
    const res = await signUpAction(null, fd);
    expect(res.ok).toBe(false);
  });

  it('does not pass forgeable admin metadata on signup', async () => {
    signUpMock.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set('full_name', 'Admin User');
    fd.set('username', 'adminuser');
    fd.set('email', 'gestor@conteudoedu.com.br');
    fd.set('password', 'supersecret');
    await expect(signUpAction(null, fd)).rejects.toThrow('NEXT_REDIRECT:/perfil');
    expect(signUpMock).toHaveBeenCalledWith({
      email: 'gestor@conteudoedu.com.br',
      password: 'supersecret',
      options: {
        data: {
          full_name: 'Admin User',
          username: 'adminuser',
        },
      },
    });
  });

  it('returns supabase error', async () => {
    signUpMock.mockResolvedValue({ error: { message: 'Email already registered' } });
    const fd = new FormData();
    fd.set('full_name', 'Test User');
    fd.set('username', 'testuser');
    fd.set('email', 'test@sebrae.com.br');
    fd.set('password', 'supersecret');
    const res = await signUpAction(null, fd);
    expect(res).toEqual({ ok: false, error: 'Email already registered' });
  });
});

describe('signInAction', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns error on bad creds', async () => {
    signInMock.mockResolvedValue({ error: { message: 'Invalid' } });
    const fd = new FormData();
    fd.set('email', 'user@sebrae.com.br');
    fd.set('password', 'wrongpass1');
    const res = await signInAction(null, fd);
    expect(res.ok).toBe(false);
  });

  it('falls back to /timeline when next is missing', async () => {
    signInMock.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set('email', 'user@sebrae.com.br');
    fd.set('password', 'rightpass1');
    await expect(signInAction(null, fd)).rejects.toThrow('NEXT_REDIRECT:/timeline');
  });

  it('uses next when it is a valid relative path', async () => {
    signInMock.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set('email', 'user@sebrae.com.br');
    fd.set('password', 'rightpass1');
    fd.set('next', '/post/abc');
    await expect(signInAction(null, fd)).rejects.toThrow('NEXT_REDIRECT:/post/abc');
  });

  it('rejects protocol-relative URLs (open redirect)', async () => {
    signInMock.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set('email', 'user@sebrae.com.br');
    fd.set('password', 'rightpass1');
    fd.set('next', '//evil.com');
    await expect(signInAction(null, fd)).rejects.toThrow('NEXT_REDIRECT:/timeline');
  });

  it('rejects auth routes to avoid loops', async () => {
    signInMock.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set('email', 'user@sebrae.com.br');
    fd.set('password', 'rightpass1');
    fd.set('next', '/login');
    await expect(signInAction(null, fd)).rejects.toThrow('NEXT_REDIRECT:/timeline');
  });
});
