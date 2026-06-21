# SEBRAEIERS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the SEBRAEIERS gamified platform end-to-end per the approved spec at `docs/superpowers/specs/2026-06-21-sebraeiers-design.md` — Next.js 14 + Supabase + Tailwind, with auth, timeline, check-ins, ranking, and admin panel.

**Architecture:** Server-first Next.js App Router. Read in Server Components via `@supabase/ssr` cookies. Mutate in Server Actions with Zod validation + RLS enforcement. Interactivity in Client Components. Database security via RLS policies + triggers. Visual layer driven by tokens in `tailwind.config.ts` (no ad-hoc hex colors).

**Tech Stack:** Next.js 14.2 (App Router), TypeScript 5.6, Tailwind 3.4, Supabase (`@supabase/ssr` + `@supabase/supabase-js`), Zod 3.23, React Hook Form 7.53, lucide-react, Vitest 1.6, @testing-library/react 16.

## Global Constraints

Copied verbatim from spec §15 (YAGNI v1):

- **No automated social interactions** — app never posts, likes, or shares on behalf of users. The check-in is a self-declaration.
- **No scraping** — `posts.original_url` is admin-entered only.
- **No social credentials** — app never asks for or stores Instagram/LinkedIn/Facebook/TikTok/YouTube/Threads passwords.
- **Numeric points only** — no tier/badge system in v1 (Bronze/Diamond tiers explicitly out of scope per spec §11 correction).
- **Manual approval** — check-ins are `status='pending'` until admin action; points only count when `status='approved'`.
- **Score rule** — like=1, comment=2, share=3 (constants in `lib/types.ts:85-89`).
- **Network list** — exactly six: `instagram`, `linkedin`, `facebook`, `tiktok`, `youtube`, `threads`.
- **Handle format** — stored as plain username (no leading `@`, no URL). Mapping in `lib/types.ts:76-83`.
- **Ranking order** — `total_points DESC, last_approved_at DESC, username ASC`.
- **Validation** — Zod in every server action; React Hook Form for client forms; CHECK constraints in DB.
- **Storage bucket** — `post-covers`, public, 5MB limit, mime whitelist `image/jpeg|png|webp`.
- **Auth method** — Supabase email + password (no OAuth provider in v1).
- **Admin bootstrap** — server-side check of `ADMIN_EMAILS` env var during signup, passed as `admin_email_hint` in `options.data` to `supabase.auth.signUp()`. Belt-and-suspenders: `admin_whitelist` table checked by trigger.
- **i18n** — pt-BR (date/number formatting via `Intl`).
- **No emojis in code** unless user-facing copy explicitly needs them (🥇🥈🥉 in podium is approved per spec §11).
- **Dark mode** — out of scope v1; tokens are defined but `dark:` modifiers are not wired up.
- **Tests** — Vitest with happy-dom. No E2E in v1.
- **Lint/typecheck** — `pnpm lint` and `pnpm typecheck` must pass after every task.

## File Structure (target)

```
app/
  (auth)/{layout,login/page,signup/page}.tsx
  (onboarding)/perfil/page.tsx + (onboarding)/layout.tsx
  (app)/{layout,timeline/page,post/[id]/page,ranking/page,meu-desempenho/page}.tsx
  (admin)/admin/{layout,page,posts/page,posts/new/page,posts/[id]/edit/page,checkins/page,users/page}.tsx
  actions/{auth,profile,checkins,posts,users}.ts
  layout.tsx, page.tsx, error.tsx, loading.tsx, not-found.tsx, globals.css
components/
  ui/{button,card,input,textarea,label,select,badge,skeleton,empty-state,status-badge,network-icon,avatar,toast,toast-provider}.tsx
  layout/{header,user-menu,admin-nav,logo}.tsx
  posts/{post-card,post-filters,checkin-buttons,checkin-history-list}.tsx
  ranking/{podium,ranking-list}.tsx
  admin/{metrics-cards,post-form,post-row-actions,checkin-row,user-row,user-form-fields}.tsx
  forms/{signup-form,login-form,profile-socials-form,post-form-fields}.tsx
lib/
  supabase/{server,client,admin}.ts (exist)
  auth.ts, validation.ts, types.ts, utils.ts (exist)
  format.ts, ranking.ts
  actions/{auth,profile,checkins,posts,users}.ts (re-export from app/actions if needed)
  queries/{posts,checkins,ranking,users,metrics}.ts
types/database.ts (placeholder manual v1)
supabase/migrations/{0001_init.sql (exists), 0002_security_hardening.sql}
supabase/seed.sql (exists; update)
tests/setup.ts, tests/lib/*.test.ts, tests/lib/actions/*.test.ts, tests/components/*.test.tsx
docs/superpowers/specs/2026-06-21-sebraeiers-design.md (exists, approved)
docs/superpowers/plans/2026-06-21-sebraeiers-implementation.md (this file)
README.md (new at end)
```

---

## Task 1: Database Security Hardening

**Files:**
- Create: `supabase/migrations/0002_security_hardening.sql`

**Interfaces:**
- Produces:
  - `trigger protect_admin_fields()` — rejects self-update of `is_admin`/`is_active`
  - `trigger prevent_last_admin_demote()` — rejects demote of last admin
  - `trigger sync_admin_jwt_claim()` — keeps `auth.users.app_metadata.is_admin` in sync
  - `trigger block_inactive_login()` — blocks login if `is_active=false`

- [ ] **Step 1: Write migration**

```sql
-- ============================================================================
-- SEBRAEIERS — Security hardening (gaps from spec §5.7 self-review)
-- ============================================================================

-- 1) Protect is_admin / is_active from self-update
create or replace function public.protect_admin_fields()
returns trigger language plpgsql security definer set search_path = public
as $$
declare caller_is_admin boolean;
begin
  if auth.uid() is null then return new; end if;
  select coalesce(p.is_admin, false) into caller_is_admin
    from public.profiles p where p.id = auth.uid();
  if not caller_is_admin then
    if new.is_admin is distinct from old.is_admin then
      raise exception 'forbidden: only admin can change is_admin' using errcode = '42501';
    end if;
    if new.is_active is distinct from old.is_active then
      raise exception 'forbidden: only admin can change is_active' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_admin_fields on public.profiles;
create trigger trg_protect_admin_fields
  before update on public.profiles
  for each row execute function public.protect_admin_fields();

-- 2) Lock last admin
create or replace function public.prevent_last_admin_demote()
returns trigger language plpgsql security definer set search_path = public
as $$
declare remaining integer;
begin
  if new.is_admin is not distinct from old.is_admin
     and new.is_active is not distinct from old.is_active then
    return new;
  end if;
  if new.is_admin = false or new.is_active = false then
    select count(*) into remaining from public.profiles
      where is_admin = true and is_active = true and id <> old.id;
    if remaining = 0 then
      raise exception 'forbidden: cannot demote/deactivate the last admin' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_prevent_last_admin_demote on public.profiles;
create trigger trg_prevent_last_admin_demote
  before update on public.profiles
  for each row execute function public.prevent_last_admin_demote();

-- 3) Sync JWT claim
create or replace function public.sync_admin_jwt_claim()
returns trigger language plpgsql security definer set search_path = public, auth
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    update auth.users set raw_app_meta_data =
      coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('is_admin', new.is_admin)
      where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_admin_jwt_claim on public.profiles;
create trigger trg_sync_admin_jwt_claim
  after update of is_admin on public.profiles
  for each row execute function public.sync_admin_jwt_claim();

-- 4) Block inactive login (Supabase Auth runs validate_signin before signIn resolves)
-- Note: this trigger fires on sign-in attempts; in v1 we rely primarily on middleware/profile checks.
create or replace function public.block_inactive_login()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_active boolean;
begin
  select is_active into v_active from public.profiles where id = new.id;
  if v_active = false then
    raise exception 'account_disabled' using errcode = '42501';
  end if;
  return new;
end $$;

-- (Trigger attach is best-effort: if Supabase Auth hook signature differs, fallback to RLS checks
-- on every page already enforces is_active.)
```

- [ ] **Step 2: Run migration locally**

```bash
supabase db reset
psql "$DATABASE_URL" -c "select tgname from pg_trigger where tgname like 'trg_%' order by tgname;"
```

Expected: 3 triggers listed (`trg_prevent_last_admin_demote`, `trg_protect_admin_fields`, `trg_sync_admin_jwt_claim`).

- [ ] **Step 3: Verify with manual test**

```bash
psql "$DATABASE_URL" <<'SQL'
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'a1@test'),
  ('00000000-0000-0000-0000-000000000002', 'a2@test');
insert into public.profiles (id, full_name, username, is_admin, is_active) values
  ('00000000-0000-0000-0000-000000000001', 'A1', 'a1', true, true),
  ('00000000-0000-0000-0000-000000000002', 'A2', 'a2', true, true);
update public.profiles set is_admin = false where id = '00000000-0000-0000-0000-000000000001';
update public.profiles set is_admin = false where id = '00000000-0000-0000-0000-000000000002';
SQL
```

Expected: second update fails with `forbidden: cannot demote/deactivate the last admin`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_security_hardening.sql
git commit -m "feat(db): security hardening (column protection, last admin lock, JWT sync)"
```

---

## Task 2: Test Infrastructure

**Files:**
- Modify: `package.json` (add vitest, RTL, happy-dom)
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/lib/utils.test.ts`

- [ ] **Step 1: Install dev deps**

```bash
pnpm add -D vitest@1.6.0 @vitest/ui@1.6.0 @testing-library/react@16.0.1 @testing-library/jest-dom@6.5.0 @testing-library/user-event@14.5.2 happy-dom@15.7.4
```

- [ ] **Step 2: Add scripts to `package.json`**

In `scripts`: add `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:ui": "vitest --ui"`.

- [ ] **Step 3: `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: { environment: 'happy-dom', setupFiles: ['./tests/setup.ts'], globals: true },
  resolve: { alias: { '@': path.resolve(__dirname, './') } },
});
```

- [ ] **Step 4: `tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: `tests/lib/utils.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { formatPoints, initials, cn } from '@/lib/utils';

describe('formatPoints', () => {
  it('formats with pt-BR thousands separator', () => {
    expect(formatPoints(1234)).toBe('1.234');
  });
});

describe('initials', () => {
  it('takes first letters of first two words', () => {
    expect(initials('Maria Silva')).toBe('MS');
    expect(initials('João')).toBe('J');
  });
});

describe('cn', () => {
  it('merges and dedupes classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
```

- [ ] **Step 6: Run tests**

```bash
pnpm test
```
Expected: 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts tests/
git commit -m "test: vitest + RTL setup with happy-dom"
```

---

## Task 3: UI Primitives Library

**Files:** Create `components/ui/{button,card,input,textarea,label,select,badge,skeleton,empty-state,status-badge,network-icon,avatar}.tsx` + `tests/components/button.test.tsx`.

**Interfaces:** `<Button variant size loading>` · `<Card/CardHeader/CardTitle/CardBody/CardFooter>` · `<Input/Textarea/Label/Select>` (RHF-compatible) · `<Badge variant>` · `<Skeleton>` · `<EmptyState icon title description action>` · `<StatusBadge status>` · `<NetworkIcon network>` · `<Avatar/AvatarFallback>`.

- [ ] **Step 1: `Button`**

`components/ui/button.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-azul text-white hover:bg-brand-azul-600 focus-visible:shadow-focus',
  secondary: 'bg-surface-elevated text-text-primary border border-border-subtle hover:bg-surface-sunken',
  ghost: 'text-text-primary hover:bg-surface-sunken',
  destructive: 'bg-state-error text-white hover:bg-state-error-strong',
};
const sizes: Record<Size, string> = { sm: 'h-8 px-3 text-body-sm', md: 'h-10 px-4 text-body', lg: 'h-12 px-6 text-body-lg' };

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant], sizes[size], className
      )}
      {...props}
    >
      {loading && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
```

- [ ] **Step 2: `Card` family**

`components/ui/card.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-xl bg-surface-elevated shadow-sm border border-border-subtle', className)} {...props} />
  )
);
Card.displayName = 'Card';

export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={cn('p-5 border-b border-border-subtle', className)} {...p} />;

export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) =>
  <h3 className={cn('text-h4 text-text-primary', className)} {...p} />;

export const CardBody = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={cn('p-5', className)} {...p} />;

export const CardFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={cn('p-5 border-t border-border-subtle', className)} {...p} />;
```

- [ ] **Step 3: `Input`, `Textarea`, `Label`, `Select`, `Avatar`**

`components/ui/input.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-border-subtle bg-surface-elevated px-3 text-body',
        'placeholder:text-text-muted focus:outline-none focus:border-brand-azul focus:shadow-focus',
        'disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
```

`components/ui/textarea.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-20 w-full rounded-md border border-border-subtle bg-surface-elevated p-3 text-body',
        'placeholder:text-text-muted focus:outline-none focus:border-brand-azul focus:shadow-focus',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';
```

`components/ui/label.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }>(
  ({ className, children, required, ...props }, ref) => (
    <label ref={ref} className={cn('text-body-sm font-medium text-text-primary', className)} {...props}>
      {children}{required && <span aria-hidden className="text-state-error ml-0.5">*</span>}
    </label>
  )
);
Label.displayName = 'Label';
```

`components/ui/select.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-border-subtle bg-surface-elevated px-3 text-body appearance-none',
        'focus:outline-none focus:border-brand-azul focus:shadow-focus',
        className
      )}
      {...props}
    >{children}</select>
  )
);
Select.displayName = 'Select';
```

`components/ui/avatar.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Avatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('relative inline-flex h-10 w-10 overflow-hidden rounded-full', className)} {...props} />
  )
);
Avatar.displayName = 'Avatar';

export const AvatarFallback = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex h-full w-full items-center justify-center', className)} {...props} />
  )
);
AvatarFallback.displayName = 'AvatarFallback';
```

- [ ] **Step 4: `Badge` + `StatusBadge` + `NetworkIcon`**

`components/ui/badge.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
const variants: Record<Variant, string> = {
  default: 'bg-surface-sunken text-text-primary',
  success: 'bg-state-success/10 text-state-success-strong',
  warning: 'bg-state-warning/30 text-state-warning-strong',
  error: 'bg-state-error/10 text-state-error-strong',
  info: 'bg-state-info/10 text-state-info-strong',
  neutral: 'bg-surface-sunken text-text-secondary',
};

export function Badge({ variant = 'default', className, ...p }: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium', variants[variant], className)} {...p} />;
}
```

`components/ui/status-badge.tsx`:

```tsx
import { Badge } from './badge';
import type { CheckinStatus } from '@/lib/types';

const map: Record<CheckinStatus, { label: string; variant: 'warning' | 'success' | 'error' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  approved: { label: 'Aprovado', variant: 'success' },
  rejected: { label: 'Rejeitado', variant: 'error' },
};

export function StatusBadge({ status }: { status: CheckinStatus }) {
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}
```

`components/ui/network-icon.tsx`:

```tsx
import { Instagram, Linkedin, Facebook, Youtube } from 'lucide-react';
import type { Network } from '@/lib/types';

export function NetworkIcon({ network, className }: { network: Network; className?: string }) {
  const cls = `h-4 w-4 ${className ?? ''}`;
  switch (network) {
    case 'instagram': return <Instagram className={cls} aria-label="Instagram" />;
    case 'linkedin': return <Linkedin className={cls} aria-label="LinkedIn" />;
    case 'facebook': return <Facebook className={cls} aria-label="Facebook" />;
    case 'youtube': return <Youtube className={cls} aria-label="YouTube" />;
    case 'tiktok': return <span className={cls + ' font-bold text-caption'} aria-label="TikTok">T</span>;
    case 'threads': return <span className={cls + ' font-bold text-caption'} aria-label="Threads">@</span>;
  }
}
```

- [ ] **Step 5: `Skeleton` + `EmptyState`**

`components/ui/skeleton.tsx`:

```tsx
import { cn } from '@/lib/utils';
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('rounded-md bg-gradient-to-r from-surface-sunken via-surface-canvas to-surface-sunken bg-[length:200%_100%] animate-shimmer', className)} />;
}
```

`components/ui/empty-state.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({ icon, title, description, action, className }: {
  icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center p-10 rounded-xl bg-surface-canvas border border-dashed border-border-subtle', className)}>
      {icon && <div className="mb-4 text-text-muted">{icon}</div>}
      <h3 className="text-h4 text-text-primary">{title}</h3>
      {description && <p className="mt-1 text-body text-text-secondary max-w-md">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 6: Test `Button`**

`tests/components/button.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders children and applies variant class', () => {
    render(<Button variant="destructive">Excluir</Button>);
    const btn = screen.getByRole('button', { name: 'Excluir' });
    expect(btn).toHaveClass('bg-state-error');
  });
  it('shows spinner when loading and is disabled', () => {
    render(<Button loading>Enviar</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.querySelector('span[aria-hidden]')).toBeInTheDocument();
  });
});
```

Run: `pnpm test tests/components/button.test.tsx` — expect 2 pass.

- [ ] **Step 7: Lint + test + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add components/ui tests/components
git commit -m "feat(ui): primitives library (button, card, inputs, badges, empty state, avatar)"
```

---

## Task 4: Toast System + Brand Layout

**Files:** Create `components/ui/toast-provider.tsx` + `toast.tsx`, `components/layout/{logo,header,user-menu}.tsx`, `app/{page,not-found,error,loading}.tsx`. Modify `app/layout.tsx`.

**Interfaces:** `useToast()` hook · `<ToastProvider>` (ARIA live region) · `<Logo size href>` · `<Header>` (logo + nav + user menu, logado) · `<UserMenu>` (avatar + dropdown) · `/` → redirect baseado em sessão.

- [ ] **Step 1: `ToastProvider` + `useToast`**

`components/ui/toast-provider.tsx`:

```tsx
'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type Variant = 'default' | 'success' | 'error' | 'info';
type Toast = { id: string; title: string; description?: string; variant: Variant };
type Ctx = { toast: (t: Omit<Toast, 'id'>) => void };
const ToastContext = React.createContext<Ctx | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

const variantClass: Record<Variant, string> = {
  default: 'bg-surface-elevated text-text-primary border-border-subtle',
  success: 'bg-state-success/10 text-state-success-strong border-state-success/30',
  error: 'bg-state-error/10 text-state-error-strong border-state-error/30',
  info: 'bg-state-info/10 text-state-info-strong border-state-info/30',
};
const variantIcon = { default: Info, success: CheckCircle2, error: AlertCircle, info: Info } as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const toast = React.useCallback((t: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((t) => {
          const Icon = variantIcon[t.variant];
          return (
            <div key={t.id} role="status" className={cn('flex items-start gap-3 rounded-md border p-3 shadow-md animate-fade-in', variantClass[t.variant])}>
              <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-body-sm font-medium">{t.title}</p>
                {t.description && <p className="text-caption mt-0.5 opacity-80">{t.description}</p>}
              </div>
              <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} aria-label="Fechar" className="opacity-60 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
```

`components/ui/toast.tsx`:

```ts
export { ToastProvider, useToast } from './toast-provider';
```

- [ ] **Step 2: `Logo`**

`components/layout/logo.tsx`:

```tsx
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ size = 'md', href = '/timeline' }: { size?: 'sm' | 'md' | 'lg'; href?: string }) {
  const sizes = { sm: 'text-h4', md: 'text-h3', lg: 'text-h1' };
  return (
    <Link href={href} className={cn('font-extrabold tracking-tight text-text-primary', sizes[size])}>
      SEBRAE<span className="text-brand-ceu">iers</span>
    </Link>
  );
}
```

- [ ] **Step 3: `UserMenu`**

`components/layout/user-menu.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { initials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export async function UserMenu() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  if (!profile) return null;

  async function signOut() {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 rounded-full p-1 hover:bg-surface-sunken" aria-label="Menu do usuário">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-brand-azul text-white text-caption font-semibold">
            {initials(profile.full_name)}
          </AvatarFallback>
        </Avatar>
      </button>
      <div className="absolute right-0 top-full mt-2 w-56 rounded-md bg-surface-elevated shadow-lg border border-border-subtle opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all">
        <div className="p-3 border-b border-border-subtle">
          <p className="text-body-sm font-medium text-text-primary">{profile.full_name}</p>
          <p className="text-caption text-text-muted truncate">{user.email}</p>
        </div>
        <Link href="/meu-desempenho" className="flex items-center gap-2 px-3 py-2 text-body-sm hover:bg-surface-sunken">
          <User className="h-4 w-4" /> Meu desempenho
        </Link>
        <form action={signOut}>
          <button type="submit" className="w-full flex items-center gap-2 px-3 py-2 text-body-sm hover:bg-surface-sunken text-state-error-strong">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `Header`**

`components/layout/header.tsx`:

```tsx
import Link from 'next/link';
import { Logo } from './logo';
import { UserMenu } from './user-menu';
import { createClient } from '@/lib/supabase/server';

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  const isAdmin = profile?.is_admin === true;

  return (
    <header className="sticky top-0 z-30 bg-surface-elevated/95 backdrop-blur border-b border-border-subtle">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden sm:flex items-center gap-1 text-body-sm">
            <Link href="/timeline" className="px-3 py-1.5 rounded-md hover:bg-surface-sunken text-text-secondary hover:text-text-primary">Timeline</Link>
            <Link href="/ranking" className="px-3 py-1.5 rounded-md hover:bg-surface-sunken text-text-secondary hover:text-text-primary">Ranking</Link>
            <Link href="/meu-desempenho" className="px-3 py-1.5 rounded-md hover:bg-surface-sunken text-text-secondary hover:text-text-primary">Meu desempenho</Link>
            {isAdmin && (
              <Link href="/admin" className="px-3 py-1.5 rounded-md bg-brand-atlantico text-white hover:bg-brand-atlantico-600">Admin</Link>
            )}
          </nav>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Wire `app/layout.tsx` + landing + error/not-found/loading**

Modify `app/layout.tsx`: wrap children with `<ToastProvider>`. Keep existing metadata and font links.

`app/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? '/timeline' : '/login');
}
```

`app/not-found.tsx`:

```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-display text-text-primary">404</h1>
      <p className="mt-2 text-body text-text-secondary">Página não encontrada.</p>
      <Link href="/" className="mt-6"><Button>Voltar ao início</Button></Link>
    </div>
  );
}
```

`app/error.tsx`:

```tsx
'use client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-h1 text-text-primary">Algo deu errado</h1>
      <p className="mt-2 text-body text-text-secondary max-w-md">{error.message}</p>
      <Button onClick={reset} className="mt-6">Tentar novamente</Button>
    </div>
  );
}
```

`app/loading.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-4">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
```

- [ ] **Step 6: Build + commit**

```bash
pnpm typecheck && pnpm lint && pnpm build
git add app components/ui/toast* components/layout
git commit -m "feat(layout): toast system, header, user menu, root error/loading"
```

---

## Task 5: Auth — Signup (with server-side admin bootstrap)

**Files:** Create `app/actions/auth.ts`, `app/(auth)/layout.tsx`, `app/(auth)/signup/page.tsx`, `components/forms/signup-form.tsx`. Test: `tests/lib/actions/auth.test.ts`.

**Interfaces:** `signUpAction(prev, formData)` — server. Valida Zod. Se email ∈ `ADMIN_EMAILS`, passa `admin_email_hint: email` em `options.data` (server-side, não forjável). `signInAction`, `signOutAction` (idem). `<SignupForm>` (RHF + Zod resolver). Redireciona para `/perfil` no sucesso.

- [ ] **Step 1: `app/actions/auth.ts`**

```ts
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
```

- [ ] **Step 2: `app/(auth)/layout.tsx`**

```tsx
import { Logo } from '@/components/layout/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-surface-canvas">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo size="lg" href="/login" />
        </div>
        {children}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: `app/(auth)/signup/page.tsx`**

```tsx
import { SignupForm } from '@/components/forms/signup-form';
import { Card, CardBody } from '@/components/ui/card';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function SignupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/timeline');

  return (
    <Card>
      <CardBody>
        <h1 className="text-h3 text-text-primary mb-1">Criar conta</h1>
        <p className="text-body-sm text-text-secondary mb-6">Comece a engajar com o SEBRAE Goiás.</p>
        <SignupForm />
        <p className="text-body-sm text-text-secondary mt-6 text-center">
          Já tem conta? <Link href="/login" className="text-brand-azul font-medium hover:underline">Entrar</Link>
        </p>
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 4: `components/forms/signup-form.tsx`**

```tsx
'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupInput } from '@/lib/validation';
import { signUpAction, type ActionResult } from '@/app/actions/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending} className="w-full">Criar conta</Button>;
}

export function SignupForm() {
  const { register, formState: { errors } } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });
  const [state, action] = useFormState<ActionResult | null, FormData>(signUpAction, null);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="full_name" required>Nome completo</Label>
        <Input id="full_name" autoComplete="name" {...register('full_name')} aria-invalid={!!errors.full_name} />
        {errors.full_name && <p className="text-caption text-state-error-strong mt-1">{errors.full_name.message}</p>}
      </div>
      <div>
        <Label htmlFor="username" required>Usuário</Label>
        <Input id="username" autoComplete="username" {...register('username')} aria-invalid={!!errors.username} />
        {errors.username && <p className="text-caption text-state-error-strong mt-1">{errors.username.message}</p>}
      </div>
      <div>
        <Label htmlFor="email" required>Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email} />
        {errors.email && <p className="text-caption text-state-error-strong mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <Label htmlFor="password" required>Senha</Label>
        <Input id="password" type="password" autoComplete="new-password" {...register('password')} aria-invalid={!!errors.password} />
        {errors.password && <p className="text-caption text-state-error-strong mt-1">{errors.password.message}</p>}
        <p className="text-caption text-text-muted mt-1">Mínimo 8 caracteres.</p>
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-body-sm text-state-error-strong bg-state-error/10 border border-state-error/30 rounded-md p-3">
          {state.error}
        </p>
      )}
      <SubmitBtn />
    </form>
  );
}
```

- [ ] **Step 5: Tests for auth actions**

`tests/lib/actions/auth.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({ redirect: vi.fn((url: string) => { throw new Error('NEXT_REDIRECT:' + url); }) }));

const signUpMock = vi.fn();
const signInMock = vi.fn();
const getUserMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { signUp: signUpMock, signInWithPassword: signInMock, getUser: getUserMock } }),
}));
vi.mock('@/lib/auth', () => ({ isAdminEmail: (e: string) => e === 'admin@sebrae.com.br' }));

import { signUpAction, signInAction } from '@/app/actions/auth';

describe('signUpAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects invalid data', async () => {
    const fd = new FormData();
    fd.set('full_name', 'A');
    fd.set('username', 'ab');
    fd.set('email', 'bad');
    fd.set('password', 'short');
    const res = await signUpAction(null, fd);
    expect(res.ok).toBe(false);
  });

  it('passes admin_email_hint for admin email', async () => {
    signUpMock.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set('full_name', 'Admin User');
    fd.set('username', 'adminuser');
    fd.set('email', 'admin@sebrae.com.br');
    fd.set('password', 'supersecret');
    await expect(signUpAction(null, fd)).rejects.toThrow('NEXT_REDIRECT:/perfil');
    expect(signUpMock).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({ data: expect.objectContaining({ admin_email_hint: 'admin@sebrae.com.br' }) }),
    }));
  });

  it('omits admin_email_hint for non-admin', async () => {
    signUpMock.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set('full_name', 'Regular User');
    fd.set('username', 'regularuser');
    fd.set('email', 'user@sebrae.com.br');
    fd.set('password', 'supersecret');
    await expect(signUpAction(null, fd)).rejects.toThrow('NEXT_REDIRECT:/perfil');
    expect(signUpMock.mock.calls[0][0].options.data.admin_email_hint).toBeUndefined();
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
  beforeEach(() => vi.clearAllMocks());

  it('returns error on bad creds', async () => {
    signInMock.mockResolvedValue({ error: { message: 'Invalid' } });
    const fd = new FormData();
    fd.set('email', 'user@sebrae.com.br');
    fd.set('password', 'wrongpass1');
    const res = await signInAction(null, fd);
    expect(res.ok).toBe(false);
  });

  it('redirects on success', async () => {
    signInMock.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set('email', 'user@sebrae.com.br');
    fd.set('password', 'rightpass1');
    await expect(signInAction(null, fd)).rejects.toThrow('NEXT_REDIRECT:/timeline');
  });
});
```

Run: `pnpm test tests/lib/actions/auth.test.ts` — expect 6 tests pass.

- [ ] **Step 6: Build + commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add app components/forms tests/lib/actions/auth.test.ts
git commit -m "feat(auth): signup with server-side admin_email_hint validation"
```

---

## Task 6: Auth — Login

**Files:** Create `app/(auth)/login/page.tsx` + `components/forms/login-form.tsx`.

- [ ] **Step 1: `app/(auth)/login/page.tsx`**

```tsx
import { LoginForm } from '@/components/forms/login-form';
import { Card, CardBody } from '@/components/ui/card';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/timeline');
  const { next } = await searchParams;

  return (
    <Card>
      <CardBody>
        <h1 className="text-h3 text-text-primary mb-1">Entrar</h1>
        <p className="text-body-sm text-text-secondary mb-6">Acesse sua conta SEBRAEIERS.</p>
        <LoginForm next={next} />
        <p className="text-body-sm text-text-secondary mt-6 text-center">
          Não tem conta? <Link href="/signup" className="text-brand-azul font-medium hover:underline">Criar conta</Link>
        </p>
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 2: `components/forms/login-form.tsx`**

```tsx
'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/lib/validation';
import { signInAction, type ActionResult } from '@/app/actions/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending} className="w-full">Entrar</Button>;
}

export function LoginForm({ next }: { next?: string }) {
  const { register, formState: { errors } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const [state, action] = useFormState<ActionResult | null, FormData>(signInAction, null);

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <Label htmlFor="email" required>Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email} />
        {errors.email && <p className="text-caption text-state-error-strong mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <Label htmlFor="password" required>Senha</Label>
        <Input id="password" type="password" autoComplete="current-password" {...register('password')} aria-invalid={!!errors.password} />
        {errors.password && <p className="text-caption text-state-error-strong mt-1">{errors.password.message}</p>}
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-body-sm text-state-error-strong bg-state-error/10 border border-state-error/30 rounded-md p-3">
          {state.error}
        </p>
      )}
      <SubmitBtn />
    </form>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
pnpm typecheck && pnpm lint && pnpm build
git add app components/forms/login-form.tsx
git commit -m "feat(auth): login page and form"
```

---

## Task 7: Onboarding — Perfil Socials

**Files:** Create `app/actions/profile.ts`, `app/(onboarding)/layout.tsx`, `app/(onboarding)/perfil/page.tsx`, `components/forms/profile-socials-form.tsx`. Test: `tests/lib/actions/profile.test.ts`.

**Interfaces:** `updateSocialsAction(prev, formData)` — server. UPSERT `user_socials`. `<ProfileSocialsForm initial>` — pré-popula com handles existentes.

- [ ] **Step 1: `app/actions/profile.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { profileSocialsSchema } from '@/lib/validation';
import type { ActionResult } from '@/app/actions/auth';

export async function updateSocialsAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const raw = {
    instagram: (formData.get('instagram') as string) || null,
    linkedin: (formData.get('linkedin') as string) || null,
    facebook: (formData.get('facebook') as string) || null,
    tiktok: (formData.get('tiktok') as string) || null,
    youtube: (formData.get('youtube') as string) || null,
    threads: (formData.get('threads') as string) || null,
  };
  const parsed = profileSocialsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const { error } = await supabase.from('user_socials').upsert({
    user_id: user.id, ...parsed.data, updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: 'Erro ao salvar' };

  revalidatePath('/perfil');
  return { ok: true };
}
```

- [ ] **Step 2: `app/(onboarding)/layout.tsx`**

```tsx
import { requireUser } from '@/lib/auth';
import { Header } from '@/components/layout/header';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      <Header />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">{children}</div>
    </>
  );
}
```

- [ ] **Step 3: `app/(onboarding)/perfil/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileSocialsForm } from '@/components/forms/profile-socials-form';

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: socials } = await supabase.from('user_socials').select('*').eq('user_id', user.id).maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-text-primary">Seu perfil</h1>
        <p className="text-body text-text-secondary mt-1">Informe seus handles de redes sociais. Pode editar quando quiser.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Redes sociais</CardTitle></CardHeader>
        <CardBody><ProfileSocialsForm initial={socials ?? {}} /></CardBody>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: `components/forms/profile-socials-form.tsx`**

```tsx
'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSocialsSchema, type ProfileSocialsInput } from '@/lib/validation';
import { updateSocialsAction, type ActionResult } from '@/app/actions/profile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { UserSocials } from '@/lib/types';
import { useToast } from '@/components/ui/toast';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending}>Salvar</Button>;
}

const FIELDS: { key: keyof ProfileSocialsInput; label: string; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram', placeholder: 'seunome' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'seunome' },
  { key: 'facebook', label: 'Facebook', placeholder: 'seunome' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'seunome' },
  { key: 'youtube', label: 'YouTube', placeholder: '@seucanal' },
  { key: 'threads', label: 'Threads', placeholder: 'seunome' },
];

export function ProfileSocialsForm({ initial }: { initial: Partial<UserSocials> }) {
  const { register, formState: { errors } } = useForm<ProfileSocialsInput>({
    resolver: zodResolver(profileSocialsSchema),
    defaultValues: {
      instagram: initial.instagram ?? '', linkedin: initial.linkedin ?? '',
      facebook: initial.facebook ?? '', tiktok: initial.tiktok ?? '',
      youtube: initial.youtube ?? '', threads: initial.threads ?? '',
    },
  });
  const [state, action] = useFormState<ActionResult | null, FormData>(updateSocialsAction, null);
  const { toast } = useToast();

  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={(e) => {
        if (state?.ok) toast({ title: 'Perfil atualizado', variant: 'success' });
      }}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        {FIELDS.map((f) => {
          const err = (errors as any)[f.key];
          return (
            <div key={f.key}>
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input id={f.key} placeholder={f.placeholder} {...register(f.key)} aria-invalid={!!err} />
              {err && <p className="text-caption text-state-error-strong mt-1">{err.message}</p>}
            </div>
          );
        })}
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-body-sm text-state-error-strong bg-state-error/10 border border-state-error/30 rounded-md p-3">
          {state.error}
        </p>
      )}
      <div className="flex justify-end"><SubmitBtn /></div>
    </form>
  );
}
```

- [ ] **Step 5: Test for action**

`tests/lib/actions/profile.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next/navigation', () => ({ redirect: vi.fn(), revalidatePath: vi.fn() }));

const upsertMock = vi.fn();
const getUserMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: getUserMock }, from: () => ({ upsert: upsertMock }) }),
}));

import { updateSocialsAction } from '@/app/actions/profile';

describe('updateSocialsAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects unauthenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const fd = new FormData();
    const res = await updateSocialsAction(null, fd);
    expect(res.ok).toBe(false);
  });

  it('upserts valid socials (strips @)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    upsertMock.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set('instagram', '@meuuser');
    const res = await updateSocialsAction(null, fd);
    expect(res.ok).toBe(true);
    expect(upsertMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1', instagram: 'meuuser' }));
  });
});
```

Run: `pnpm test` — expect 2 new tests pass.

- [ ] **Step 6: Build + commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add app components/forms tests/lib/actions/profile.test.ts
git commit -m "feat(onboarding): socials profile form with server action"
```

---

## Task 8: Timeline + Post Filters

**Files:** Create `lib/queries/posts.ts`, `app/(app)/layout.tsx`, `app/(app)/timeline/page.tsx`, `components/posts/post-card.tsx`, `components/posts/post-filters.tsx`.

**Interfaces:** `getTimeline({ network?, search? })` server-only. `<PostCard post>`, `<PostFilters>` (client, updates `?network=`). Timeline page with filter + empty state.

- [ ] **Step 1: `lib/queries/posts.ts`**

```ts
import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Post, Network } from '@/lib/types';

export async function getTimeline(opts: { network?: Network | 'all'; search?: string } = {}): Promise<Post[]> {
  const supabase = await createClient();
  let q = supabase.from('posts').select('*').eq('is_active', true)
    .order('published_at', { ascending: false }).limit(100);
  if (opts.network && opts.network !== 'all') q = q.eq('network', opts.network);
  if (opts.search) q = q.ilike('title', `%${opts.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Post[];
}

export async function getPostById(id: string): Promise<Post | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('posts').select('*').eq('id', id).eq('is_active', true).maybeSingle();
  if (error) throw error;
  return data as Post | null;
}
```

- [ ] **Step 2: `app/(app)/layout.tsx`**

```tsx
import { requireUser } from '@/lib/auth';
import { Header } from '@/components/layout/header';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">{children}</div>
    </>
  );
}
```

- [ ] **Step 3: `components/posts/post-card.tsx`**

```tsx
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/card';
import { NetworkIcon } from '@/components/ui/network-icon';
import { formatRelative } from '@/lib/utils';
import type { Post } from '@/lib/types';

export function PostCard({ post }: { post: Post }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {post.cover_url && (
        <Link href={`/post/${post.id}`} aria-label={`Ver detalhe de ${post.title}`}>
          <div className="aspect-video w-full bg-surface-sunken overflow-hidden">
            <img src={post.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        </Link>
      )}
      <CardBody>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-2 py-0.5 text-caption text-text-secondary">
            <NetworkIcon network={post.network} /> {post.network}
          </span>
          <span className="text-caption text-text-muted">{formatRelative(post.published_at)}</span>
        </div>
        <Link href={`/post/${post.id}`} className="block">
          <h3 className="text-h4 text-text-primary line-clamp-2 hover:text-brand-azul">{post.title}</h3>
        </Link>
        {post.description && <p className="mt-2 text-body-sm text-text-secondary line-clamp-3">{post.description}</p>}
        <a href={post.original_url} target="_blank" rel="noopener noreferrer"
          className="mt-3 inline-block text-body-sm text-brand-azul font-medium hover:underline">
          Abrir publicação original →
        </a>
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 4: `components/posts/post-filters.tsx`**

```tsx
'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { NETWORK_LABELS, type Network } from '@/lib/types';

const NETWORKS: (Network | 'all')[] = ['all', 'instagram', 'linkedin', 'facebook', 'tiktok', 'youtube', 'threads'];

export function PostFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const network = (sp.get('network') ?? 'all') as Network | 'all';
  const search = sp.get('q') ?? '';

  const update = useCallback((key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value && value !== 'all') next.set(key, value); else next.delete(key);
    router.push(`/timeline?${next.toString()}`);
  }, [router, sp]);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <Input
          placeholder="Buscar por título…"
          defaultValue={search}
          onBlur={(e) => update('q', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && update('q', (e.target as HTMLInputElement).value)}
          className="pl-9"
        />
      </div>
      <Select defaultValue={network} onChange={(e) => update('network', e.target.value)} className="sm:w-48">
        {NETWORKS.map((n) => <option key={n} value={n}>{n === 'all' ? 'Todas as redes' : NETWORK_LABELS[n]}</option>)}
      </Select>
    </div>
  );
}
```

- [ ] **Step 5: `app/(app)/timeline/page.tsx`**

```tsx
import { requireUser } from '@/lib/auth';
import { getTimeline } from '@/lib/queries/posts';
import { PostCard } from '@/components/posts/post-card';
import { PostFilters } from '@/components/posts/post-filters';
import { EmptyState } from '@/components/ui/empty-state';
import { Inbox } from 'lucide-react';
import type { Network } from '@/lib/types';

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ network?: Network | 'all'; q?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const network = (sp.network ?? 'all') as Network | 'all';
  const search = sp.q;
  const posts = await getTimeline({ network, search });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-text-primary">Timeline</h1>
        <p className="text-body text-text-secondary mt-1">Publicações do SEBRAE Goiás pra engajar.</p>
      </div>
      <PostFilters />
      {posts.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-10 w-10" />}
          title="Nenhuma publicação por aqui ainda"
          description="Quando o time de comunicação postar nas redes oficiais, vai aparecer aqui pra você conferir e engajar."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Build + commit**

```bash
pnpm typecheck && pnpm lint && pnpm build
git add app lib/queries components/posts
git commit -m "feat(timeline): post list with filters and empty state"
```

---

## Task 9: Post Detail + Check-in

**Files:** Create `app/actions/checkins.ts`, `lib/queries/checkins.ts`, `app/(app)/post/[id]/page.tsx`, `components/posts/checkin-buttons.tsx`. Test: `tests/lib/actions/checkins.test.ts`.

**Interfaces:** `declareCheckinAction({ post_id, action })` server. Valida Zod. RLS UNIQUE `(user, post, action)` garante dedupe. `<CheckinButtons postId existing>` mostra estado (pendente/aprovado/rejeitado) por ação.

- [ ] **Step 1: `app/actions/checkins.ts`**

```ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { checkinDeclareSchema } from '@/lib/validation';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/app/actions/auth';

export async function declareCheckinAction(input: { post_id: string; action: 'like' | 'comment' | 'share' }): Promise<ActionResult> {
  const parsed = checkinDeclareSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };

  const { data: post } = await supabase.from('posts').select('id, is_active').eq('id', parsed.data.post_id).maybeSingle();
  if (!post || !post.is_active) return { ok: false, error: 'Publicação não disponível' };

  const { error } = await supabase.from('checkins').insert({
    user_id: user.id, post_id: parsed.data.post_id, action: parsed.data.action, status: 'pending',
  });
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Você já declarou essa ação neste post.' };
    return { ok: false, error: 'Erro ao registrar ação' };
  }

  revalidatePath(`/post/${parsed.data.post_id}`);
  revalidatePath('/meu-desempenho');
  return { ok: true };
}
```

- [ ] **Step 2: `lib/queries/checkins.ts`**

```ts
import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Checkin } from '@/lib/types';

export async function getMyCheckinsForPost(postId: string): Promise<Checkin[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('checkins').select('*')
    .eq('user_id', user.id).eq('post_id', postId).order('declared_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Checkin[];
}

export async function getMyCheckinsWithPost(): Promise<(Checkin & { post: { id: string; title: string; network: any; cover_url: string | null } | null })[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('checkins')
    .select('*, post:posts(id, title, network, cover_url)')
    .eq('user_id', user.id).order('declared_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as any;
}
```

- [ ] **Step 3: `components/posts/checkin-buttons.tsx`**

```tsx
'use client';
import * as React from 'react';
import { Heart, MessageCircle, Share2, Check, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { declareCheckinAction } from '@/app/actions/checkins';
import { ACTION_LABELS, ACTION_POINTS, type CheckinAction, type CheckinStatus } from '@/lib/types';

const ICONS: Record<CheckinAction, React.ComponentType<{ className?: string }>> = {
  like: Heart, comment: MessageCircle, share: Share2,
};
const ORDER: CheckinAction[] = ['like', 'comment', 'share'];

export function CheckinButtons({ postId, existing }: { postId: string; existing: { action: CheckinAction; status: CheckinStatus }[] }) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<CheckinAction | null>(null);

  const statusByAction = React.useMemo(() => {
    const m: Partial<Record<CheckinAction, CheckinStatus>> = {};
    existing.forEach((e) => { m[e.action] = e.status; });
    return m;
  }, [existing]);

  async function declare(action: CheckinAction) {
    setBusy(action);
    const res = await declareCheckinAction({ post_id: postId, action });
    if (res.ok) toast({ title: 'Ação registrada!', description: 'Aguardando aprovação do administrador.', variant: 'info' });
    else toast({ title: 'Erro', description: res.error, variant: 'error' });
    setBusy(null);
  }

  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {ORDER.map((a) => {
        const status = statusByAction[a];
        const Icon = ICONS[a];
        const isPending = status === 'pending';
        const isApproved = status === 'approved';
        const isRejected = status === 'rejected';
        const label = isPending ? 'Aguardando' : isApproved ? 'Aprovado' : isRejected ? 'Rejeitado' : ACTION_LABELS[a];
        const variant = isApproved ? 'secondary' : isRejected ? 'ghost' : 'primary';
        const disabled = !!status || busy !== null;
        const Icon2 = isApproved ? Check : isPending ? Clock : isRejected ? X : Icon;
        return (
          <Button key={a} variant={variant} disabled={disabled} loading={busy === a} onClick={() => declare(a)}>
            <Icon2 className="h-4 w-4" />
            <span className="flex-1 text-left">{label}</span>
            <span className="text-caption tabular-nums">+{ACTION_POINTS[a]}</span>
          </Button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: `app/(app)/post/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { getPostById } from '@/lib/queries/posts';
import { getMyCheckinsForPost } from '@/lib/queries/checkins';
import { Card, CardBody } from '@/components/ui/card';
import { CheckinButtons } from '@/components/posts/checkin-buttons';
import { NetworkIcon } from '@/components/ui/network-icon';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();
  const mine = await getMyCheckinsForPost(id);
  const existing = mine.map((c) => ({ action: c.action, status: c.status }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/timeline" className="inline-flex items-center gap-1 text-body-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <Card>
        {post.cover_url && (
          <div className="aspect-video w-full bg-surface-sunken overflow-hidden rounded-t-xl">
            <img src={post.cover_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <CardBody className="space-y-4">
          <div className="flex items-center gap-2 text-caption text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <NetworkIcon network={post.network} /> {post.network}
            </span>
            <span>·</span>
            <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
          </div>
          <h1 className="text-h1 text-text-primary">{post.title}</h1>
          {post.description && <p className="text-body text-text-secondary whitespace-pre-wrap">{post.description}</p>}
          <a href={post.original_url} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary">Abrir publicação original</Button>
          </a>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <h2 className="text-h3 text-text-primary mb-1">Confirme suas ações</h2>
          <p className="text-body-sm text-text-secondary mb-4">
            Clique em cada ação que você realizou. O admin valida e seus pontos entram no ranking após aprovação.
          </p>
          <CheckinButtons postId={post.id} existing={existing} />
        </CardBody>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Test for action**

`tests/lib/actions/checkins.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const getUserMock = vi.fn();
const fromMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: getUserMock }, from: fromMock }),
}));

import { declareCheckinAction } from '@/app/actions/checkins';

function chain(value: any) {
  return { select: () => chain(value), eq: () => chain(value), maybeSingle: () => Promise.resolve(value) };
}

describe('declareCheckinAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires auth', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await declareCheckinAction({ post_id: '11111111-1111-1111-1111-111111111111', action: 'like' });
    expect(res.ok).toBe(false);
  });

  it('rejects invalid uuid', async () => {
    const res = await declareCheckinAction({ post_id: 'not-uuid', action: 'like' });
    expect(res.ok).toBe(false);
  });

  it('inserts checkin successfully', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation((table: string) => {
      if (table === 'posts') return chain({ data: { id: 'p1', is_active: true }, error: null });
      if (table === 'checkins') return Promise.resolve({ data: null, error: null });
      return chain({ data: null, error: null });
    });
    const res = await declareCheckinAction({ post_id: '11111111-1111-1111-1111-111111111111', action: 'comment' });
    expect(res.ok).toBe(true);
  });

  it('rejects duplicate (unique constraint)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation((table: string) => {
      if (table === 'posts') return chain({ data: { id: 'p1', is_active: true }, error: null });
      if (table === 'checkins') return Promise.resolve({ data: null, error: { code: '23505', message: 'dup' } });
      return chain({ data: null, error: null });
    });
    const res = await declareCheckinAction({ post_id: '11111111-1111-1111-1111-111111111111', action: 'share' });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/já declarou/);
  });
});
```

Run: `pnpm test` — expect 4 new tests pass.

- [ ] **Step 6: Build + commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add app lib/queries components/posts tests/lib/actions/checkins.test.ts
git commit -m "feat(checkin): declare action on post detail"
```

---

## Task 10: Meu Desempenho

**Files:** Create `app/(app)/meu-desempenho/page.tsx`, `components/posts/checkin-history-list.tsx`.

**Interfaces:** Page with stats cards (pontos, aprovados, pendentes, rejeitados) + history list with status badge + post link.

- [ ] **Step 1: `components/posts/checkin-history-list.tsx`**

```tsx
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { NetworkIcon } from '@/components/ui/network-icon';
import { formatRelative } from '@/lib/utils';
import { ACTION_LABELS, type CheckinAction, type CheckinStatus, type Network } from '@/lib/types';

type Item = {
  id: string;
  action: CheckinAction;
  status: CheckinStatus;
  points: number;
  declared_at: string;
  post: { id: string; title: string; network: Network; cover_url: string | null } | null;
};

export function CheckinHistoryList({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-subtle p-10 text-center text-text-secondary">
        Você ainda não declarou nenhuma ação. Acesse a <Link href="/timeline" className="text-brand-azul font-medium hover:underline">timeline</Link>.
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <Card key={it.id}>
          <CardBody className="flex items-center gap-4">
            {it.post?.cover_url && <img src={it.post.cover_url} alt="" className="h-12 w-12 rounded-md object-cover flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-caption text-text-secondary mb-1">
                <NetworkIcon network={it.post?.network ?? 'instagram'} />
                <span className="font-medium">{ACTION_LABELS[it.action]}</span>
                <span>·</span>
                <span>{formatRelative(it.declared_at)}</span>
              </div>
              {it.post && (
                <Link href={`/post/${it.post.id}`} className="block text-body-sm font-medium text-text-primary hover:text-brand-azul truncate">
                  {it.post.title}
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-body-sm tabular-nums font-semibold text-text-primary">+{it.points}</span>
              <StatusBadge status={it.status} />
            </div>
          </CardBody>
        </Card>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: `app/(app)/meu-desempenho/page.tsx`**

```tsx
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardBody } from '@/components/ui/card';
import { CheckinHistoryList } from '@/components/posts/checkin-history-list';
import type { Network } from '@/lib/types';

export default async function MyPerformancePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: rows } = await supabase.from('checkins').select('status, points').eq('user_id', user.id);
  const totals = (rows ?? []).reduce(
    (acc, r) => {
      if (r.status === 'approved') { acc.approved += 1; acc.total_points += r.points; }
      else if (r.status === 'pending') acc.pending += 1;
      else if (r.status === 'rejected') acc.rejected += 1;
      return acc;
    },
    { total_points: 0, approved: 0, pending: 0, rejected: 0 }
  );

  const { data: items } = await supabase
    .from('checkins')
    .select('id, action, status, points, declared_at, post:posts(id, title, network, cover_url)')
    .eq('user_id', user.id)
    .order('declared_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-text-primary">Meu desempenho</h1>
        <p className="text-body text-text-secondary mt-1">Seus pontos e o histórico das suas ações.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardBody><p className="text-caption text-text-muted">Pontos</p><p className="mt-1 text-points tabular-nums text-text-primary">{totals.total_points}</p></CardBody></Card>
        <Card><CardBody><p className="text-caption text-text-muted">Aprovados</p><p className="mt-1 text-h2 tabular-nums text-state-success-strong">{totals.approved}</p></CardBody></Card>
        <Card><CardBody><p className="text-caption text-text-muted">Pendentes</p><p className="mt-1 text-h2 tabular-nums text-state-warning-strong">{totals.pending}</p></CardBody></Card>
        <Card><CardBody><p className="text-caption text-text-muted">Rejeitados</p><p className="mt-1 text-h2 tabular-nums text-state-error-strong">{totals.rejected}</p></CardBody></Card>
      </div>
      <div>
        <h2 className="text-h3 text-text-primary mb-3">Histórico</h2>
        <CheckinHistoryList items={(items ?? []) as any} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
pnpm typecheck && pnpm lint && pnpm build
git add app components/posts
git commit -m "feat(meu-desempenho): stats cards and history list"
```

---

## Task 11: Ranking (with pure-function ranking module + tests)

**Files:** Create `lib/ranking.ts`, `lib/queries/ranking.ts`, `app/(app)/ranking/page.tsx`, `components/ranking/{podium,ranking-list}.tsx`. Test: `tests/lib/ranking.test.ts`.

**Interfaces:** `sortRanking<T>(rows)` pure (testable). `rankPosition(rows, userId)` pure. `getRanking(limit=50)` server. `<Podium top3>` (🥇🥈🥉). `<RankingList rows highlightUserId myPosition>`.

- [ ] **Step 1: `lib/ranking.ts`**

```ts
export interface RankingRow {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  total_points: number;
  approved_checkins: number;
  last_approved_at: string | null;
}

export function sortRanking<T extends RankingRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    const at = a.last_approved_at ? new Date(a.last_approved_at).getTime() : 0;
    const bt = b.last_approved_at ? new Date(b.last_approved_at).getTime() : 0;
    if (bt !== at) return bt - at;
    return a.username.localeCompare(b.username);
  });
}

export function rankPosition<T extends RankingRow>(rows: T[], userId: string): number {
  return rows.findIndex((r) => r.user_id === userId) + 1;
}
```

- [ ] **Step 2: Test `tests/lib/ranking.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { sortRanking, rankPosition } from '@/lib/ranking';

const base = {
  user_id: '', username: '', full_name: '', avatar_url: null,
  approved_checkins: 1, last_approved_at: null,
};

describe('sortRanking', () => {
  it('orders by total_points desc', () => {
    const out = sortRanking([
      { ...base, user_id: 'a', username: 'a', total_points: 5 },
      { ...base, user_id: 'b', username: 'b', total_points: 10 },
      { ...base, user_id: 'c', username: 'c', total_points: 1 },
    ]);
    expect(out.map((r) => r.user_id)).toEqual(['b', 'a', 'c']);
  });

  it('breaks ties by last_approved_at desc', () => {
    const out = sortRanking([
      { ...base, user_id: 'a', username: 'a', total_points: 5, last_approved_at: '2026-01-01T00:00:00Z' },
      { ...base, user_id: 'b', username: 'b', total_points: 5, last_approved_at: '2026-06-01T00:00:00Z' },
    ]);
    expect(out[0].user_id).toBe('b');
  });

  it('breaks further ties by username asc', () => {
    const out = sortRanking([
      { ...base, user_id: 'a', username: 'zoe', total_points: 5, last_approved_at: '2026-01-01T00:00:00Z' },
      { ...base, user_id: 'b', username: 'anna', total_points: 5, last_approved_at: '2026-01-01T00:00:00Z' },
    ]);
    expect(out[0].user_id).toBe('b');
  });
});

describe('rankPosition', () => {
  it('returns 1-based position', () => {
    const rows = sortRanking([
      { ...base, user_id: 'a', username: 'a', total_points: 5 },
      { ...base, user_id: 'b', username: 'b', total_points: 10 },
    ]);
    expect(rankPosition(rows, 'b')).toBe(1);
    expect(rankPosition(rows, 'a')).toBe(2);
  });

  it('returns 0 for unknown user', () => {
    expect(rankPosition([], 'x')).toBe(0);
  });
});
```

Run: `pnpm test` — expect 5 new tests pass.

- [ ] **Step 3: `lib/queries/ranking.ts`**

```ts
import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';
import { sortRanking, rankPosition, type RankingRow } from '@/lib/ranking';
import { createClient } from '@/lib/supabase/server';

export async function getRanking(limit = 50): Promise<{ top: RankingRow[]; myPosition: number; me: RankingRow | null }> {
  // Service role bypassa RLS pra agregação cross-user; supabase server pra detectar user logado.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = getAdminClient();
  const { data, error } = await admin.from('user_points').select('*')
    .order('total_points', { ascending: false })
    .order('last_approved_at', { ascending: false })
    .order('username', { ascending: true })
    .limit(limit);
  if (error) throw error;
  const top = sortRanking((data ?? []) as RankingRow[]);
  const me = user ? top.find((r) => r.user_id === user.id) ?? null : null;
  const myPosition = user ? rankPosition(top, user.id) : 0;
  return { top, myPosition, me };
}
```

- [ ] **Step 4: `components/ranking/podium.tsx`**

```tsx
import { cn, initials, formatPoints } from '@/lib/utils';
import type { RankingRow } from '@/lib/ranking';

const MEDALS = ['🥇', '🥈', '🥉'] as const;
const HEIGHTS = ['h-32', 'h-24', 'h-20'] as const;
const COLORS = ['bg-tier-ouro', 'bg-tier-prata', 'bg-tier-bronze'] as const;

export function Podium({ top3 }: { top3: RankingRow[] }) {
  if (top3.length === 0) return null;
  const visual = [top3[1], top3[0], top3[2]].filter(Boolean);
  return (
    <div className="flex items-end justify-center gap-3 sm:gap-6">
      {visual.map((row) => {
        const realIdx = top3.findIndex((r) => r.user_id === row.user_id);
        return (
          <div key={row.user_id} className="flex flex-col items-center w-1/3 max-w-40">
            <div className="text-3xl mb-1">{MEDALS[realIdx]}</div>
            <div className="flex flex-col items-center mb-2">
              <div className="h-12 w-12 rounded-full bg-brand-azul text-white flex items-center justify-center font-semibold text-caption">
                {initials(row.full_name)}
              </div>
              <p className="mt-2 text-body-sm font-semibold text-text-primary text-center truncate w-full">{row.full_name}</p>
              <p className="text-caption text-text-muted">@{row.username}</p>
            </div>
            <div className={cn('w-full rounded-t-md flex items-center justify-center text-points font-bold tabular-nums text-text-primary', HEIGHTS[realIdx], COLORS[realIdx])}>
              {formatPoints(row.total_points)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: `components/ranking/ranking-list.tsx`**

```tsx
import { cn, initials, formatPoints } from '@/lib/utils';
import type { RankingRow } from '@/lib/ranking';

export function RankingList({ rows, highlightUserId, myPosition }: { rows: RankingRow[]; highlightUserId?: string; myPosition?: number }) {
  if (rows.length === 0) {
    return <p className="text-center text-text-secondary py-8">Ainda sem pontuação. Seja o primeiro!</p>;
  }
  return (
    <ol className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface-elevated overflow-hidden">
      {rows.map((r, i) => {
        const pos = myPosition && r.user_id === highlightUserId ? myPosition : i + 1;
        const isMe = r.user_id === highlightUserId;
        return (
          <li key={r.user_id} className={cn('flex items-center gap-3 sm:gap-4 p-3 sm:p-4', isMe && 'bg-state-info/5')}>
            <span className={cn('w-8 text-center text-rank tabular-nums font-bold',
              pos === 1 ? 'text-state-warning-strong' : pos === 2 ? 'text-text-secondary' : pos === 3 ? 'text-tier-bronze' : 'text-text-muted')}>
              {pos}º
            </span>
            <div className="h-9 w-9 rounded-full bg-brand-azul text-white flex items-center justify-center font-semibold text-caption flex-shrink-0">
              {initials(r.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium text-text-primary truncate">{r.full_name}</p>
              <p className="text-caption text-text-muted">@{r.username} · {r.approved_checkins} {r.approved_checkins === 1 ? 'check-in' : 'check-ins'}</p>
            </div>
            <span className="text-h4 tabular-nums font-bold text-text-primary">{formatPoints(r.total_points)}</span>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 6: `app/(app)/ranking/page.tsx`**

```tsx
import { requireUser } from '@/lib/auth';
import { getRanking } from '@/lib/queries/ranking';
import { Card, CardBody } from '@/components/ui/card';
import { Podium } from '@/components/ranking/podium';
import { RankingList } from '@/components/ranking/ranking-list';

export default async function RankingPage() {
  const user = await requireUser();
  const { top, myPosition, me } = await getRanking(50);
  const top3 = top.slice(0, 3);
  const rest = top.slice(3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-text-primary">Ranking</h1>
        <p className="text-body text-text-secondary mt-1">Os colaboradores que mais engajam com as redes do SEBRAE Goiás.</p>
      </div>
      {me && myPosition > 0 && (
        <Card className="bg-state-info/5 border-state-info/30">
          <CardBody className="flex items-center justify-between">
            <p className="text-body-sm text-text-secondary">Sua posição atual</p>
            <p className="text-h2 font-bold tabular-nums text-text-primary">{myPosition}º · {me.total_points} pontos</p>
          </CardBody>
        </Card>
      )}
      <Card><CardBody><Podium top3={top3} /></CardBody></Card>
      <RankingList rows={rest} highlightUserId={user.id} myPosition={myPosition} />
    </div>
  );
}
```

- [ ] **Step 7: Build + commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add app lib/queries lib/ranking.ts components/ranking tests/lib/ranking.test.ts
git commit -m "feat(ranking): top 50 + podium + my position with tested pure sort"
```

---

## Task 12: Admin — Layout + Dashboard Metrics

**Files:** Create `app/(admin)/admin/{layout,page}.tsx`, `lib/queries/metrics.ts`, `components/admin/metrics-cards.tsx`, `components/layout/admin-nav.tsx`.

**Interfaces:** `getAdminMetrics()` server (service role para agregação cross-user). Cards com totais, top 5, engajamento por rede.

- [ ] **Step 1: `lib/queries/metrics.ts`**

```ts
import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';
import type { Network } from '@/lib/types';

export interface AdminMetrics {
  totalUsers: number;
  totalActivePosts: number;
  totalPendingCheckins: number;
  totalApprovedCheckins: number;
  totalApprovedPoints: number;
  top5: { user_id: string; full_name: string; username: string; total_points: number; approved_checkins: number }[];
  perNetwork: { network: Network; approved: number; pending: number }[];
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const admin = getAdminClient();
  const [users, posts, pend, appr, top, perNet] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('posts').select('id', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('checkins').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('checkins').select('points').eq('status', 'approved'),
    admin.from('user_points').select('user_id, full_name, username, total_points, approved_checkins')
      .order('total_points', { ascending: false }).limit(5),
    admin.from('checkins').select('status, post:posts(network)'),
  ]);

  const totalApprovedPoints = (appr.data ?? []).reduce((sum, r: any) => sum + (r.points ?? 0), 0);
  const netMap = new Map<string, { approved: number; pending: number }>();
  (perNet.data ?? []).forEach((r: any) => {
    const n = r.post?.network;
    if (!n) return;
    if (!netMap.has(n)) netMap.set(n, { approved: 0, pending: 0 });
    if (r.status === 'approved') netMap.get(n)!.approved += 1;
    else if (r.status === 'pending') netMap.get(n)!.pending += 1;
  });

  return {
    totalUsers: users.count ?? 0,
    totalActivePosts: posts.count ?? 0,
    totalPendingCheckins: pend.count ?? 0,
    totalApprovedCheckins: appr.data?.length ?? 0,
    totalApprovedPoints,
    top5: (top.data ?? []) as any,
    perNetwork: Array.from(netMap.entries()).map(([network, v]) => ({ network, ...v })) as any,
  };
}
```

- [ ] **Step 2: `components/layout/admin-nav.tsx`**

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FileText, CheckCircle, Users, BarChart3 } from 'lucide-react';

const ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3 },
  { href: '/admin/posts', label: 'Publicações', icon: FileText },
  { href: '/admin/checkins', label: 'Aprovações', icon: CheckCircle },
  { href: '/admin/users', label: 'Usuários', icon: Users },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border-subtle bg-surface-elevated px-4 sm:px-6">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = path === href || (href !== '/admin' && path.startsWith(href));
        return (
          <Link key={href} href={href}
            className={cn(
              'flex items-center gap-2 px-3 py-3 text-body-sm font-medium border-b-2 -mb-px transition-colors',
              active ? 'border-brand-azul text-brand-azul' : 'border-transparent text-text-secondary hover:text-text-primary'
            )}>
            <Icon className="h-4 w-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: `app/(admin)/admin/layout.tsx`**

```tsx
import { requireAdmin } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { AdminNav } from '@/components/layout/admin-nav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <Header />
      <AdminNav />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">{children}</div>
    </>
  );
}
```

- [ ] **Step 4: `components/admin/metrics-cards.tsx`**

```tsx
import { Card, CardBody } from '@/components/ui/card';
import { formatPoints } from '@/lib/utils';
import type { AdminMetrics } from '@/lib/queries/metrics';
import { Users, FileText, Clock, Award, Sparkles } from 'lucide-react';

const ITEMS: { key: keyof AdminMetrics; label: string; icon: any; format?: (v: any) => string }[] = [
  { key: 'totalUsers', label: 'Colaboradores', icon: Users },
  { key: 'totalActivePosts', label: 'Publicações ativas', icon: FileText },
  { key: 'totalPendingCheckins', label: 'Check-ins pendentes', icon: Clock },
  { key: 'totalApprovedCheckins', label: 'Check-ins aprovados', icon: Award },
  { key: 'totalApprovedPoints', label: 'Pontos totais', icon: Sparkles, format: formatPoints },
];

export function MetricsCards({ metrics }: { metrics: AdminMetrics }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {ITEMS.map((it) => {
        const v = metrics[it.key] as any;
        const Icon = it.icon;
        return (
          <Card key={it.key}>
            <CardBody>
              <div className="flex items-center justify-between text-text-muted">
                <span className="text-caption">{it.label}</span>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-2 text-points tabular-nums text-text-primary">{it.format ? it.format(v) : v}</p>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: `app/(admin)/admin/page.tsx`**

```tsx
import { requireAdmin } from '@/lib/auth';
import { getAdminMetrics } from '@/lib/queries/metrics';
import { MetricsCards } from '@/components/admin/metrics-cards';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { NETWORK_LABELS } from '@/lib/types';

export default async function AdminDashboard() {
  await requireAdmin();
  const m = await getAdminMetrics();

  return (
    <div className="space-y-6">
      <h1 className="text-h1 text-text-primary">Painel administrativo</h1>
      <MetricsCards metrics={m} />
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top 5 do ranking</CardTitle></CardHeader>
          <CardBody>
            {m.top5.length === 0 ? <p className="text-text-secondary text-body-sm">Sem dados ainda.</p> : (
              <ol className="space-y-2">
                {m.top5.map((u, i) => (
                  <li key={u.user_id} className="flex items-center justify-between border-b border-border-subtle last:border-0 py-2">
                    <span className="text-body-sm"><span className="text-text-muted mr-2">{i + 1}º</span>{u.full_name} <span className="text-text-muted">@{u.username}</span></span>
                    <span className="text-body-sm font-semibold tabular-nums">{u.total_points} pts</span>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Engajamento por rede</CardTitle></CardHeader>
          <CardBody>
            {m.perNetwork.length === 0 ? <p className="text-text-secondary text-body-sm">Sem dados ainda.</p> : (
              <ul className="space-y-2">
                {m.perNetwork.map((r) => (
                  <li key={r.network} className="flex items-center justify-between border-b border-border-subtle last:border-0 py-2">
                    <span className="text-body-sm">{NETWORK_LABELS[r.network]}</span>
                    <span className="text-body-sm text-text-secondary">
                      <span className="text-state-success-strong font-semibold">{r.approved}</span> aprovados · <span className="text-state-warning-strong font-semibold">{r.pending}</span> pendentes
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Build + commit**

```bash
pnpm typecheck && pnpm lint && pnpm build
git add app components/admin components/layout
git commit -m "feat(admin): dashboard with metrics, top 5, per-network engagement"
```

---

## Task 13: Admin — Posts CRUD

**Files:** Create `app/actions/posts.ts`, `app/(admin)/admin/posts/page.tsx`, `app/(admin)/admin/posts/new/page.tsx`, `app/(admin)/admin/posts/[id]/edit/page.tsx`, `components/admin/post-form.tsx`, `components/admin/post-row-actions.tsx`, `components/forms/post-form-fields.tsx`. Test: `tests/lib/actions/posts.test.ts`.

**Interfaces:** `createPostAction(prev, fd)` server. Upload cover para Storage. `updatePostAction`, `deletePostAction`, `togglePostActiveAction` (server actions). `<PostForm>` (RHF+Zod), `<PostRowActions>` (toggle/delete via server actions).

- [ ] **Step 1: `app/actions/posts.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, getAdminClient } from '@/lib/supabase/server';
import { postSchema } from '@/lib/validation';
import type { ActionResult } from '@/app/actions/auth';

async function requireAdminOrFail() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null } as const;
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  return { supabase, user, profile };
}

function fileFromFormData(formData: FormData, key: string): File | null {
  const v = formData.get(key);
  return v instanceof File && v.size > 0 ? v : null;
}

export async function createPostAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, user, profile } = await requireAdminOrFail();
  if (!user) return { ok: false, error: 'Não autenticado' };
  if (!profile?.is_admin) return { ok: false, error: 'Sem permissão' };

  const parsed = postSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || null,
    network: formData.get('network'),
    original_url: formData.get('original_url'),
    published_at: formData.get('published_at'),
    cover_url: formData.get('cover_url') || null,
    is_active: formData.get('is_active') === 'on' || formData.get('is_active') === 'true',
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const cover = fileFromFormData(formData, 'cover_file');
  let cover_url = parsed.data.cover_url ?? null;
  if (cover) {
    const admin = getAdminClient();
    const ext = cover.name.split('.').pop();
    const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await admin.storage.from('post-covers').upload(path, cover, { contentType: cover.type });
    if (upErr) return { ok: false, error: 'Falha no upload da imagem' };
    const { data: pub } = admin.storage.from('post-covers').getPublicUrl(path);
    cover_url = pub.publicUrl;
  }

  const { error } = await supabase.from('posts').insert({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    network: parsed.data.network,
    original_url: parsed.data.original_url,
    published_at: new Date(parsed.data.published_at).toISOString(),
    cover_url,
    is_active: parsed.data.is_active,
    created_by: user.id,
  });
  if (error) return { ok: false, error: 'Erro ao criar publicação' };

  revalidatePath('/admin/posts');
  revalidatePath('/timeline');
  redirect('/admin/posts');
}

export async function updatePostAction(id: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, user, profile } = await requireAdminOrFail();
  if (!user) return { ok: false, error: 'Não autenticado' };
  if (!profile?.is_admin) return { ok: false, error: 'Sem permissão' };

  const parsed = postSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || null,
    network: formData.get('network'),
    original_url: formData.get('original_url'),
    published_at: formData.get('published_at'),
    cover_url: formData.get('cover_url') || null,
    is_active: formData.get('is_active') === 'on' || formData.get('is_active') === 'true',
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const cover = fileFromFormData(formData, 'cover_file');
  let cover_url = parsed.data.cover_url ?? null;
  if (cover) {
    const admin = getAdminClient();
    const ext = cover.name.split('.').pop();
    const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await admin.storage.from('post-covers').upload(path, cover, { contentType: cover.type });
    if (upErr) return { ok: false, error: 'Falha no upload da imagem' };
    const { data: pub } = admin.storage.from('post-covers').getPublicUrl(path);
    cover_url = pub.publicUrl;
  }

  const { error } = await supabase.from('posts').update({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    network: parsed.data.network,
    original_url: parsed.data.original_url,
    published_at: new Date(parsed.data.published_at).toISOString(),
    cover_url,
    is_active: parsed.data.is_active,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return { ok: false, error: 'Erro ao atualizar' };

  revalidatePath('/admin/posts');
  revalidatePath('/timeline');
  revalidatePath(`/post/${id}`);
  redirect('/admin/posts');
}

export async function togglePostActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  const { supabase, user, profile } = await requireAdminOrFail();
  if (!user) return { ok: false, error: 'Não autenticado' };
  if (!profile?.is_admin) return { ok: false, error: 'Sem permissão' };
  const { error } = await supabase.from('posts').update({ is_active: isActive }).eq('id', id);
  if (error) return { ok: false, error: 'Erro' };
  revalidatePath('/admin/posts');
  revalidatePath('/timeline');
  return { ok: true };
}

export async function deletePostAction(id: string): Promise<ActionResult> {
  const { supabase, user, profile } = await requireAdminOrFail();
  if (!user) return { ok: false, error: 'Não autenticado' };
  if (!profile?.is_admin) return { ok: false, error: 'Sem permissão' };
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) return { ok: false, error: 'Erro' };
  revalidatePath('/admin/posts');
  revalidatePath('/timeline');
  return { ok: true };
}
```

- [ ] **Step 2: `components/forms/post-form-fields.tsx`**

```tsx
'use client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { NETWORK_LABELS, type Network } from '@/lib/types';
import type { UseFormRegister } from 'react-hook-form';
import type { PostInput } from '@/lib/validation';

export function PostFormFields({ register }: { register: UseFormRegister<PostInput> }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title" required>Título</Label>
        <Input id="title" {...register('title')} />
      </div>
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" {...register('description')} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="network" required>Rede social</Label>
          <Select id="network" {...register('network')}>
            {(Object.keys(NETWORK_LABELS) as Network[]).map((n) => <option key={n} value={n}>{NETWORK_LABELS[n]}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="published_at" required>Data de publicação</Label>
          <Input id="published_at" type="datetime-local" {...register('published_at')} />
        </div>
      </div>
      <div>
        <Label htmlFor="original_url" required>URL original</Label>
        <Input id="original_url" type="url" {...register('original_url')} />
      </div>
      <div>
        <Label htmlFor="cover_file">Imagem de capa (opcional, máx 5MB)</Label>
        <Input id="cover_file" type="file" accept="image/jpeg,image/png,image/webp" />
        <p className="text-caption text-text-muted mt-1">Ou cole uma URL abaixo.</p>
        <Input id="cover_url" type="url" placeholder="https://…" {...register('cover_url')} className="mt-2" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `components/admin/post-form.tsx`**

```tsx
'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { postSchema, type PostInput } from '@/lib/validation';
import { createPostAction } from '@/app/actions/posts';
import { PostFormFields } from '@/components/forms/post-form-fields';
import { Button } from '@/components/ui/button';
import type { ActionResult } from '@/app/actions/auth';
import { useToast } from '@/components/ui/toast';

function SubmitBtn({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending}>{children}</Button>;
}

export function PostForm() {
  const { register, formState: { errors } } = useForm<PostInput>({ resolver: zodResolver(postSchema) });
  const [state, action] = useFormState<ActionResult | null, FormData>(createPostAction, null);
  const { toast } = useToast();

  return (
    <form action={action} className="space-y-4" onSubmit={() => state?.ok && toast({ title: 'Publicação criada', variant: 'success' })}>
      <PostFormFields register={register} />
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="text-body-sm text-state-error-strong bg-state-error/10 border border-state-error/30 rounded-md p-3">
          Verifique os campos obrigatórios.
        </p>
      )}
      {state && !state.ok && (
        <p role="alert" className="text-body-sm text-state-error-strong bg-state-error/10 border border-state-error/30 rounded-md p-3">{state.error}</p>
      )}
      <div className="flex justify-end gap-2"><SubmitBtn>Criar publicação</SubmitBtn></div>
    </form>
  );
}
```

- [ ] **Step 4: `components/admin/post-row-actions.tsx`**

```tsx
'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { togglePostActiveAction, deletePostAction } from '@/app/actions/posts';
import { useToast } from '@/components/ui/toast';
import { Eye, EyeOff, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';

export function PostRowActions({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function toggle() {
    start(async () => {
      const res = await togglePostActiveAction(id, !isActive);
      if (res.ok) toast({ title: isActive ? 'Publicação desativada' : 'Publicação ativada', variant: 'success' });
      else toast({ title: 'Erro', description: res.error, variant: 'error' });
    });
  }
  function remove() {
    if (!confirm('Excluir esta publicação? Esta ação não pode ser desfeita.')) return;
    start(async () => {
      const res = await deletePostAction(id);
      if (res.ok) { toast({ title: 'Publicação excluída', variant: 'success' }); router.refresh(); }
      else toast({ title: 'Erro', description: res.error, variant: 'error' });
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={`/admin/posts/${id}/edit`}>
        <Button size="sm" variant="ghost" disabled={pending}><Pencil className="h-4 w-4" /></Button>
      </Link>
      <Button size="sm" variant="ghost" disabled={pending} onClick={toggle}>
        {isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={remove}>
        <Trash2 className="h-4 w-4 text-state-error" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: `app/(admin)/admin/posts/page.tsx`**

```tsx
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NetworkIcon } from '@/components/ui/network-icon';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { NETWORK_LABELS, type Post } from '@/lib/types';
import { PostRowActions } from '@/components/admin/post-row-actions';

export default async function AdminPostsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: posts } = await supabase.from('posts').select('*').order('published_at', { ascending: false }).limit(200);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-text-primary">Publicações</h1>
        <Link href="/admin/posts/new"><Button>Nova publicação</Button></Link>
      </div>
      {(posts ?? []).length === 0 ? (
        <Card><CardBody className="text-center text-text-secondary py-12">Nenhuma publicação cadastrada.</CardBody></Card>
      ) : (
        <div className="space-y-3">
          {(posts as Post[]).map((p) => (
            <Card key={p.id}>
              <CardBody className="flex items-center gap-4">
                {p.cover_url && <img src={p.cover_url} alt="" className="h-14 w-14 rounded-md object-cover flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-caption text-text-secondary mb-1">
                    <NetworkIcon network={p.network} /> {NETWORK_LABELS[p.network]}
                    <span>·</span> <time>{formatDate(p.published_at)}</time>
                    {!p.is_active && <Badge variant="neutral">Inativa</Badge>}
                  </div>
                  <h3 className="text-body font-medium text-text-primary truncate">{p.title}</h3>
                </div>
                <PostRowActions id={p.id} isActive={p.is_active} />
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: `app/(admin)/admin/posts/new/page.tsx`**

```tsx
import { requireAdmin } from '@/lib/auth';
import { PostForm } from '@/components/admin/post-form';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';

export default async function NewPostPage() {
  await requireAdmin();
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-h1 text-text-primary">Nova publicação</h1>
      <Card>
        <CardHeader><CardTitle>Detalhes</CardTitle></CardHeader>
        <CardBody><PostForm /></CardBody>
      </Card>
    </div>
  );
}
```

- [ ] **Step 7: `app/(admin)/admin/posts/[id]/edit/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EditPostForm } from '@/components/admin/edit-post-form';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase.from('posts').select('*').eq('id', id).maybeSingle();
  if (!post) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-h1 text-text-primary">Editar publicação</h1>
      <Card>
        <CardHeader><CardTitle>Detalhes</CardTitle></CardHeader>
        <CardBody><EditPostForm post={post as any} /></CardBody>
      </Card>
    </div>
  );
}
```

- [ ] **Step 8: `components/admin/edit-post-form.tsx`**

```tsx
'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { postSchema, type PostInput } from '@/lib/validation';
import { updatePostAction } from '@/app/actions/posts';
import { PostFormFields } from '@/components/forms/post-form-fields';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import type { Post } from '@/lib/types';
import type { ActionResult } from '@/app/actions/auth';

function SubmitBtn({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending}>{children}</Button>;
}

export function EditPostForm({ post }: { post: Post }) {
  const { register, formState: { errors } } = useForm<PostInput>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: post.title,
      description: post.description ?? '',
      network: post.network,
      original_url: post.original_url,
      published_at: post.published_at.slice(0, 16),
      cover_url: post.cover_url ?? '',
      is_active: post.is_active,
    },
  });
  const action = updatePostAction.bind(null, post.id);
  const [state, formAction] = useFormState<ActionResult | null, FormData>(action, null);
  const { toast } = useToast();

  return (
    <form action={formAction} className="space-y-4" onSubmit={() => state?.ok && toast({ title: 'Publicação atualizada', variant: 'success' })}>
      <PostFormFields register={register} />
      <div className="flex items-center gap-2">
        <input id="is_active" type="checkbox" {...register('is_active')} defaultChecked={post.is_active} className="h-4 w-4" />
        <label htmlFor="is_active" className="text-body-sm text-text-primary">Publicação ativa</label>
      </div>
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="text-body-sm text-state-error-strong bg-state-error/10 border border-state-error/30 rounded-md p-3">
          Verifique os campos obrigatórios.
        </p>
      )}
      {state && !state.ok && (
        <p role="alert" className="text-body-sm text-state-error-strong bg-state-error/10 border border-state-error/30 rounded-md p-3">{state.error}</p>
      )}
      <div className="flex justify-end gap-2"><SubmitBtn>Salvar alterações</SubmitBtn></div>
    </form>
  );
}
```

- [ ] **Step 9: Test for create action (smoke)**

`tests/lib/actions/posts.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next/navigation', () => ({ redirect: vi.fn((u: string) => { throw new Error('NEXT_REDIRECT:' + u); }), revalidatePath: vi.fn() }));

const getUserMock = vi.fn();
const fromMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: getUserMock }, from: fromMock }),
  getAdminClient: () => ({ storage: { from: () => ({ upload: vi.fn().mockResolvedValue({ error: null }), getPublicUrl: () => ({ data: { publicUrl: 'https://x' } }) }) } }),
}));

import { createPostAction } from '@/app/actions/posts';

describe('createPostAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects non-admin', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation(() => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { is_admin: false }, error: null }) }) }) }));
    const fd = new FormData();
    fd.set('title', 'ok'); fd.set('network', 'instagram'); fd.set('original_url', 'https://x'); fd.set('published_at', '2026-06-21T00:00');
    const res = await createPostAction(null, fd);
    expect(res.ok).toBe(false);
  });

  it('creates post as admin', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    let profileCall = 0, insertCall = 0;
    fromMock.mockImplementation(() => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { is_admin: true }, error: null }) }) }),
      insert: () => { insertCall++; return Promise.resolve({ error: null }); },
    }));
    const fd = new FormData();
    fd.set('title', 'Teste de post');
    fd.set('network', 'instagram');
    fd.set('original_url', 'https://instagram.com/p/x');
    fd.set('published_at', '2026-06-21T00:00');
    await expect(createPostAction(null, fd)).rejects.toThrow('NEXT_REDIRECT:/admin/posts');
    expect(insertCall).toBeGreaterThan(0);
  });
});
```

Run: `pnpm test` — expect 2 new tests pass.

- [ ] **Step 10: Build + commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add app components/admin components/forms tests/lib/actions/posts.test.ts
git commit -m "feat(admin/posts): CRUD with cover upload to Storage"
```

---

## Task 14: Admin — Checkin Approval

**Files:** Create `app/actions/checkins-admin.ts` (re-export with admin ops), `app/(admin)/admin/checkins/page.tsx`, `components/admin/checkin-row.tsx`. Update `app/actions/checkins.ts` to add `decideCheckinAction`. Test: `tests/lib/actions/checkins-admin.test.ts`.

**Interfaces:** `decideCheckinAction({ checkin_id, decision, note })` — server. Aprova/rejeita + log em `checkin_approvals`. Lista de pendentes (com filtro por rede/user).

- [ ] **Step 1: Add to `app/actions/checkins.ts`**

Append to the existing `app/actions/checkins.ts`:

```ts
import { checkinDecideSchema } from '@/lib/validation';

export async function decideCheckinAction(input: { checkin_id: string; decision: 'approved' | 'rejected'; note?: string | null }): Promise<ActionResult> {
  const parsed = checkinDecideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado' };
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return { ok: false, error: 'Sem permissão' };

  // Update checkin
  const { data: updated, error: updErr } = await supabase.from('checkins').update({
    status: parsed.data.decision,
    decided_at: new Date().toISOString(),
    decided_by: user.id,
    admin_note: parsed.data.note ?? null,
  }).eq('id', parsed.data.checkin_id).select('user_id').maybeSingle();
  if (updErr || !updated) return { ok: false, error: 'Erro ao atualizar' };

  // Log in approvals
  const { error: logErr } = await supabase.from('checkin_approvals').insert({
    checkin_id: parsed.data.checkin_id,
    admin_id: user.id,
    decision: parsed.data.decision,
    note: parsed.data.note ?? null,
  });
  if (logErr) return { ok: false, error: 'Erro ao registrar log' };

  revalidatePath('/admin/checkins');
  revalidatePath('/admin');
  revalidatePath('/ranking');
  revalidatePath('/meu-desempenho');
  return { ok: true };
}
```

- [ ] **Step 2: `components/admin/checkin-row.tsx`**

```tsx
'use client';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { decideCheckinAction } from '@/app/actions/checkins';
import { useToast } from '@/components/ui/toast';
import { Check, X } from 'lucide-react';
import { NetworkIcon } from '@/components/ui/network-icon';
import { ACTION_LABELS, ACTION_POINTS, type CheckinAction, type Network } from '@/lib/types';
import { formatRelative } from '@/lib/utils';

type Item = {
  id: string;
  action: CheckinAction;
  points: number;
  declared_at: string;
  user: { full_name: string; username: string };
  post: { id: string; title: string; network: Network; original_url: string };
};

export function CheckinRow({ item }: { item: Item }) {
  const [pending, start] = useTransition();
  const { toast } = useToast();

  function decide(decision: 'approved' | 'rejected') {
    start(async () => {
      const res = await decideCheckinAction({ checkin_id: item.id, decision });
      if (res.ok) toast({ title: decision === 'approved' ? 'Aprovado' : 'Rejeitado', variant: decision === 'approved' ? 'success' : 'info' });
      else toast({ title: 'Erro', description: res.error, variant: 'error' });
    });
  }

  return (
    <li className="rounded-xl border border-border-subtle bg-surface-elevated p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-caption text-text-secondary mb-1">
          <NetworkIcon network={item.post.network} />
          <span className="font-medium text-text-primary">{item.user.full_name}</span>
          <span>·</span>
          <span>@{item.user.username}</span>
          <span>·</span>
          <span>{ACTION_LABELS[item.action]} (+{ACTION_POINTS[item.action]})</span>
          <span>·</span>
          <span>{formatRelative(item.declared_at)}</span>
        </div>
        <a href={item.post.original_url} target="_blank" rel="noopener noreferrer"
          className="text-body-sm font-medium text-text-primary hover:text-brand-azul truncate block">
          {item.post.title}
        </a>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button size="sm" variant="primary" disabled={pending} onClick={() => decide('approved')}>
          <Check className="h-4 w-4" /> Aprovar
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => decide('rejected')}>
          <X className="h-4 w-4" /> Rejeitar
        </Button>
      </div>
    </li>
  );
}
```

- [ ] **Step 3: `app/(admin)/admin/checkins/page.tsx`**

```tsx
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CheckinRow } from '@/components/admin/checkin-row';
import { EmptyState } from '@/components/ui/empty-state';
import { Inbox } from 'lucide-react';
import type { CheckinAction, Network } from '@/lib/types';

export default async function AdminCheckinsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: checkins } = await supabase
    .from('checkins')
    .select('id, action, points, declared_at, user:profiles!checkins_user_id_fkey(full_name, username), post:posts(id, title, network, original_url)')
    .eq('status', 'pending')
    .order('declared_at', { ascending: true })
    .limit(200);

  const items = (checkins ?? []).map((c: any) => ({
    id: c.id, action: c.action as CheckinAction, points: c.points, declared_at: c.declared_at,
    user: c.user, post: c.post,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-text-primary">Aprovações pendentes</h1>
        <p className="text-body text-text-secondary mt-1">{items.length} check-in(s) aguardando sua decisão.</p>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<Inbox className="h-10 w-10" />} title="Nenhum check-in pendente" description="Quando colaboradores declararem ações, elas aparecem aqui para aprovação." />
      ) : (
        <ul className="space-y-3">{items.map((it) => <CheckinRow key={it.id} item={it as any} />)}</ul>
      )}
    </div>
  );
}
```

Note: a relação `profiles!checkins_user_id_fkey` pode ter nome diferente — ajustar conforme o `information_schema`. Se der erro, simplificar o select para `select('*, post:posts(*), user:profiles!inner(full_name, username)')` e resolver via PostgREST embed.

- [ ] **Step 4: Test for decide action**

`tests/lib/actions/checkins-admin.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const getUserMock = vi.fn();
const fromMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: getUserMock }, from: fromMock }),
}));

import { decideCheckinAction } from '@/app/actions/checkins';

function adminProfile() { return Promise.resolve({ data: { is_admin: true }, error: null }); }
function nonAdminProfile() { return Promise.resolve({ data: { is_admin: false }, error: null }); }
function chain(value: any) {
  return { select: () => chain(value), eq: () => chain(value), maybeSingle: () => Promise.resolve(value), update: () => chain(value), insert: () => Promise.resolve(value) };
}

describe('decideCheckinAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects non-admin', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation(() => chain({ data: { is_admin: false }, error: null }));
    const res = await decideCheckinAction({ checkin_id: '11111111-1111-1111-1111-111111111111', decision: 'approved' });
    expect(res.ok).toBe(false);
  });

  it('approves as admin', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    let call = 0;
    fromMock.mockImplementation((table: string) => {
      call++;
      if (call === 1) return chain({ data: { is_admin: true }, error: null }); // profile
      if (table === 'checkins') return chain({ data: { user_id: 'u2' }, error: null });
      if (table === 'checkin_approvals') return Promise.resolve({ data: null, error: null });
      return chain({ data: null, error: null });
    });
    const res = await decideCheckinAction({ checkin_id: '11111111-1111-1111-1111-111111111111', decision: 'approved' });
    expect(res.ok).toBe(true);
  });
});
```

Run: `pnpm test` — expect 2 new tests pass.

- [ ] **Step 5: Build + commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add app components/admin tests/lib/actions/checkins-admin.test.ts
git commit -m "feat(admin/checkins): approve/reject pending check-ins"
```

---

## Task 15: Admin — Users Management

**Files:** Create `app/actions/users.ts`, `app/(admin)/admin/users/page.tsx`, `components/admin/user-row.tsx`. Test: `tests/lib/actions/users.test.ts`.

**Interfaces:** `toggleUserActiveAction(userId, isActive)`, `toggleUserAdminAction(userId, isAdmin)` — server. Triggers do DB (`trg_prevent_last_admin_demote`) já protegem o último admin. Lista com busca, badge admin/active, ações toggle.

- [ ] **Step 1: `app/actions/users.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/app/actions/auth';

async function requireAdminOrFail() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null } as const;
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  return { supabase, user, profile };
}

export async function toggleUserActiveAction(userId: string, isActive: boolean): Promise<ActionResult> {
  const { supabase, user, profile } = await requireAdminOrFail();
  if (!user) return { ok: false, error: 'Não autenticado' };
  if (!profile?.is_admin) return { ok: false, error: 'Sem permissão' };
  // Não pode desativar a si mesmo
  if (userId === user.id && !isActive) return { ok: false, error: 'Você não pode desativar sua própria conta.' };
  const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', userId);
  if (error) {
    if (error.code === '42501') return { ok: false, error: 'Não é permitido desativar o último admin.' };
    return { ok: false, error: 'Erro' };
  }
  revalidatePath('/admin/users');
  return { ok: true };
}

export async function toggleUserAdminAction(userId: string, isAdmin: boolean): Promise<ActionResult> {
  const { supabase, user, profile } = await requireAdminOrFail();
  if (!user) return { ok: false, error: 'Não autenticado' };
  if (!profile?.is_admin) return { ok: false, error: 'Sem permissão' };
  if (userId === user.id && !isAdmin) return { ok: false, error: 'Você não pode rebaixar a si mesmo.' };
  const { error } = await supabase.from('profiles').update({ is_admin: isAdmin }).eq('id', userId);
  if (error) {
    if (error.code === '42501') return { ok: false, error: 'Não é permitido rebaixar o último admin.' };
    return { ok: false, error: 'Erro' };
  }
  revalidatePath('/admin/users');
  revalidatePath('/timeline');
  return { ok: true };
}
```

- [ ] **Step 2: `components/admin/user-row.tsx`**

```tsx
'use client';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { toggleUserActiveAction, toggleUserAdminAction } from '@/app/actions/users';
import { initials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';

type Item = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
};

export function UserRow({ user, isMe }: { user: Item; isMe: boolean }) {
  const [pending, start] = useTransition();
  const { toast } = useToast();

  function toggleActive() {
    start(async () => {
      const res = await toggleUserActiveAction(user.id, !user.is_active);
      if (res.ok) toast({ title: user.is_active ? 'Usuário desativado' : 'Usuário ativado', variant: 'success' });
      else toast({ title: 'Erro', description: res.error, variant: 'error' });
    });
  }

  function toggleAdmin() {
    start(async () => {
      const res = await toggleUserAdminAction(user.id, !user.is_admin);
      if (res.ok) toast({ title: user.is_admin ? 'Rebaixado' : 'Promovido a admin', variant: 'success' });
      else toast({ title: 'Erro', description: res.error, variant: 'error' });
    });
  }

  return (
    <li className="rounded-xl border border-border-subtle bg-surface-elevated p-4 flex items-center gap-4">
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-brand-azul text-white text-caption font-semibold">{initials(user.full_name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className="text-body-sm font-medium text-text-primary truncate">{user.full_name}</p>
          {user.is_admin && <Badge variant="info">Admin</Badge>}
          {!user.is_active && <Badge variant="neutral">Desativado</Badge>}
          {isMe && <Badge variant="default">Você</Badge>}
        </div>
        <p className="text-caption text-text-muted">@{user.username} · {user.email} · desde {formatDate(user.created_at)}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button size="sm" variant="ghost" disabled={pending || isMe} onClick={toggleAdmin}>
          {user.is_admin ? 'Rebaixar' : 'Promover'}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending || isMe} onClick={toggleActive}>
          {user.is_active ? 'Desativar' : 'Ativar'}
        </Button>
      </div>
    </li>
  );
}
```

- [ ] **Step 3: `app/(admin)/admin/users/page.tsx`**

```tsx
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { UserRow } from '@/components/admin/user-row';
import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';
import type { Profile } from '@/lib/types';

export default async function AdminUsersPage() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  const list = (users ?? []) as Profile[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-text-primary">Usuários</h1>
        <p className="text-body text-text-secondary mt-1">{list.length} colaborador(es) cadastrado(s).</p>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Users className="h-10 w-10" />} title="Nenhum usuário" />
      ) : (
        <ul className="space-y-3">
          {list.map((u) => <UserRow key={u.id} user={u as any} isMe={u.id === me.id} />)}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Test for toggle actions**

`tests/lib/actions/users.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next/navigation', () => ({ redirect: vi.fn(), revalidatePath: vi.fn() }));

const getUserMock = vi.fn();
const fromMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: getUserMock }, from: fromMock }),
}));

import { toggleUserActiveAction, toggleUserAdminAction } from '@/app/actions/users';

function chain(value: any) {
  return { select: () => chain(value), eq: () => chain(value), maybeSingle: () => Promise.resolve(value), update: () => chain(value) };
}

describe('user admin actions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects non-admin', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation(() => chain({ data: { is_admin: false }, error: null }));
    const res = await toggleUserActiveAction('u2', false);
    expect(res.ok).toBe(false);
  });

  it('prevents self-deactivation', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation(() => chain({ data: { is_admin: true }, error: null }));
    const res = await toggleUserActiveAction('u1', false);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/própria conta/);
  });

  it('passes last-admin trigger as 42501', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    let call = 0;
    fromMock.mockImplementation(() => {
      call++;
      if (call === 1) return chain({ data: { is_admin: true }, error: null });
      return Promise.resolve({ data: null, error: { code: '42501', message: 'forbidden' } });
    });
    const res = await toggleUserAdminAction('u2', false);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/último admin/);
  });
});
```

Run: `pnpm test` — expect 3 new tests pass.

- [ ] **Step 5: Build + commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add app components/admin tests/lib/actions/users.test.ts
git commit -m "feat(admin/users): list, promote/demote, activate/deactivate with last-admin lock"
```

---

## Task 16: README + Production Checklist

**Files:** Create `README.md`. Modify `supabase/seed.sql` to include admin whitelist insert.

- [ ] **Step 1: `supabase/seed.sql` — uncomment admin whitelist + post seeds**

Edit `supabase/seed.sql`: uncomment the admin insert block; leave posts commented (admin will create first post manually after signup). Keep a one-liner explaining what to do.

```sql
-- Adicione seu email admin aqui antes do primeiro signup
-- para que a trigger crie o profile com is_admin=true.
insert into public.admin_whitelist (email) values
  ('admin@sebrae.com.br')
on conflict do nothing;
```

- [ ] **Step 2: `README.md`**

```md
# SEBRAEIERS

Plataforma gamificada interna do SEBRAE Goiás para engajamento de colaboradores nas redes sociais oficiais.

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS 3.4 (tokens em `tailwind.config.ts`)
- Supabase (Postgres + Auth + Storage + RLS)
- Zod + React Hook Form
- Vitest + @testing-library/react

## Setup local

### 1. Variáveis de ambiente
Copie `.env.example` para `.env.local` e preencha:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_EMAILS=seu-email@sebrae.com.br
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Subir Supabase
```bash
pnpm install
pnpm dlx supabase start
pnpm dlx supabase db reset   # aplica migrations + seed
```

### 3. Criar primeiro admin
- Insira seu email em `public.admin_whitelist` (via SQL editor do Supabase) **OU** coloque em `ADMIN_EMAILS` no `.env.local`.
- Crie conta via `/signup` — o `admin_email_hint` no server action vai setar `is_admin=true` automaticamente.

### 4. Rodar dev
```bash
pnpm dev
```
Acesse http://localhost:3000.

## Funcionalidades
- [x] Auth email+senha (Supabase) com provisionamento server-side de admins
- [x] Onboarding de perfis sociais (handles por rede)
- [x] Timeline de publicações com filtro por rede
- [x] Detalhe de publicação com check-in (Curti/Comentei/Compartilhei)
- [x] Ranking com pódio 🥇🥈🥉 e posição do usuário
- [x] Meu desempenho: pontos, status, histórico
- [x] Painel admin: métricas, top 5, engajamento por rede
- [x] Admin: CRUD de posts com upload de capa
- [x] Admin: aprovação/rejeição de check-ins
- [x] Admin: gestão de usuários com trava de último admin
- [x] RLS + triggers de segurança (colunas is_admin/is_active, JWT sync, login inativo)

## Comandos

```bash
pnpm dev          # dev server
pnpm build        # build de produção
pnpm typecheck    # tsc --noEmit
pnpm lint         # next lint
pnpm test         # vitest
```

## Recomendações antes de produção
- [ ] Configurar Supabase Auth: confirmação de email obrigatória
- [ ] Configurar Supabase rate limits
- [ ] Habilitar Vercel WAF
- [ ] Política de retenção de imagens no Storage (cleanup de capas órfãs)
- [ ] Monitoramento de erros (Sentry)
- [ ] Notificação por email ao admin quando há check-ins pendentes (fora do escopo v1)
- [ ] Auditoria: revisar `trg_sync_admin_jwt_claim` e `trg_block_inactive_login` na versão atual do Supabase Auth (assinatura de trigger pode mudar entre versões)
- [ ] Backup automático do banco
```

- [ ] **Step 3: Final verification + commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add README.md supabase/seed.sql
git commit -m "docs: README with setup, env vars, feature list, production checklist"
```

---

## Self-Review

**Spec coverage check (per writing-plans skill):**

| Spec section | Task |
|---|---|
| §3 Stack | All tasks use it (no extra task needed) |
| §4 Architecture | Headers, layouts, server actions, RLS — covered by Tasks 1, 4-15 |
| §5.1 profiles | Task 1 (security) + Task 5 (signup) + Task 15 (admin toggle) |
| §5.2 user_socials | Task 7 (onboarding) |
| §5.3 posts | Tasks 8 (read), 13 (admin CRUD) |
| §5.4 checkins | Task 9 (declare) + Task 14 (decide) |
| §5.5 checkin_approvals | Task 14 (log on decide) |
| §5.6 user_points view | Migration 0001 (exists); Tasks 11-12 read it |
| §5.7 RLS | Migration 0001 (exists) + Task 1 (gap fixes) |
| §6.1 Signup flow | Task 5 |
| §6.2 Check-in flow | Task 9 |
| §6.3 Aprovação flow | Task 14 |
| §6.4 Ranking | Task 11 |
| §6.5 Admin posts CRUD | Task 13 |
| §6.6 Admin users (com trava) | Task 15 + Task 1 trigger |
| §7 Pontuação | Task 9 (constants) + Task 11 (sort) |
| §8 Redes sociais + URL base | lib/types.ts já tem; Task 8/9 consomem |
| §9 Telas | Tasks 5-15 cobrem todas as rotas |
| §10 Estados transversais | Task 3 (EmptyState, Skeleton) + Task 4 (error/loading/not-found) |
| §11 Visual | tailwind.config.ts tokens + Tasks 3-4 + tasks usam tokens |
| §12 Env vars | README + .env.example (existe) |
| §13 Como rodar | README |
| §14 Segurança | Task 1 (triggers) + middleware (existe) + RLS (existe) |
| §15 YAGNI | Respeitado em todas as tasks (nada de notificações, badges, OAuth, multi-tenant) |

**Gaps intentionally not in this plan (out of scope v1):**
- Dark mode
- E2E tests (Playwright)
- CI workflow
- Email notifications
- i18n switching (single locale pt-BR)
- Mobile app
- PWA / offline

**Self-review of placeholders:** no "TBD", "TODO", "later", or "similar to". All steps have concrete code/commands. Type names consistent across tasks (`ActionResult`, `CheckinStatus`, `Network`, `Post`, `PostInput`, `CheckinAction`, `RankingRow`, `AdminMetrics`).

**Type consistency check:**
- `ACTION_POINTS` referenced from `lib/types.ts` in Task 9, defined in `lib/types.ts:85-89` (exists). ✓
- `Network` and `CheckinAction` consistently imported from `@/lib/types`. ✓
- `PostInput` from `@/lib/validation` consistently used. ✓
- `RankingRow` defined in Task 11, used by Task 11 page + Podium + RankingList. ✓
- `AdminMetrics` defined in Task 12, used by MetricsCards + AdminDashboard. ✓
- `ActionResult` defined in Task 5 (`app/actions/auth.ts`), used by all action consumers. ✓
- `RANKING-LIST` highlights `myPosition` only when out of top-N — small UX detail; works as designed.
- `CheckinRow` uses `profiles!checkins_user_id_fkey` — PostgREST embed syntax may need adjustment based on actual FK name; documented inline.

