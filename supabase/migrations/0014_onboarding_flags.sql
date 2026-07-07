-- Onboarding tour completion flags.
-- Each user has two independent flags: one for the collaborator tour and
-- one for the admin tour. NULL means "not yet seen (or skipped)".
--
-- RLS coverage already exists:
--   - 0001_init.sql: profiles_update_self (auth.uid() = id)
--   - 0002_security_hardening.sql: protect_admin_fields trigger blocks
--     self-update of is_admin/is_active, leaving onboarded_at
--     freely updatable by the owning user.

alter table public.profiles
  add column if not exists onboarded_at timestamptz null,
  add column if not exists admin_onboarded_at timestamptz null;

comment on column public.profiles.onboarded_at is
  'When the user completed or skipped the collaborator tour. NULL = not seen yet.';
comment on column public.profiles.admin_onboarded_at is
  'When the user completed or skipped the admin tour. NULL = not seen yet (only relevant when is_admin=true).';

-- Backfill: existing users (pre-deploy) should not see the tour on first login
-- after this migration. Treat them as "already onboarded".
update public.profiles
  set onboarded_at = coalesce(onboarded_at, now())
  where onboarded_at is null;

update public.profiles
  set admin_onboarded_at = coalesce(admin_onboarded_at, now())
  where is_admin = true and admin_onboarded_at is null;
