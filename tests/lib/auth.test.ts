import { describe, expect, it } from 'vitest';
import { AGENCY_ADMIN_EMAIL_DOMAIN, isAgencyAdminEmail } from '@/lib/auth';

describe('isAgencyAdminEmail', () => {
  it('accepts @conteudoedu.com.br emails', () => {
    expect(isAgencyAdminEmail('gestor@conteudoedu.com.br')).toBe(true);
    expect(isAgencyAdminEmail('Gestor@ConteudoEdu.com.br')).toBe(true);
  });

  it('rejects other domains', () => {
    expect(isAgencyAdminEmail('admin@sebrae.com.br')).toBe(false);
    expect(isAgencyAdminEmail('user@conteudoedu.com')).toBe(false);
    expect(isAgencyAdminEmail('')).toBe(false);
    expect(isAgencyAdminEmail(null)).toBe(false);
  });

  it('exports agency domain constant', () => {
    expect(AGENCY_ADMIN_EMAIL_DOMAIN).toBe('@conteudoedu.com.br');
  });
});
