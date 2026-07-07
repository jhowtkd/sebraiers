# Onboarding Tours (user + admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add in-app onboarding tours (driver.js) for new collaborators and admins. Tours are non-blocking overlays that auto-trigger on first visit (`/timeline` for collaborators, `/admin/*` for admins), can be skipped, persist via `profiles.onboarded_at` / `admin_onboarded_at`, and can be replayed via a "Rever tour" button.

**Architecture:** Server decides flag → client provider runs driver.js with declarative step arrays → server actions mark/reset flags. `data-tour` attributes on existing components act as the contract between steps and DOM. No new routes, no new tables, no new RLS policies.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + RLS), TypeScript, Vitest, driver.js (new dep), Tailwind tokens.

## Global Constraints

- Node ≥ 20, pnpm 10.32.1 (from `package.json` engines + packageManager).
- Branch: `feature/onboarding-tours` (created during execution, not in this plan).
- TypeScript strict; no `any` in new code.
- Commit messages: `feat/fix/refactor/test/docs: scope` (matches repo history).
- pt-BR copy is direct, no double exclamations, no emoji decorative — matches `PRODUCT.md`.
- All RLS-aware code: never bypass server actions with direct client writes to `profiles.onboarded_at` / `admin_onboarded_at`.
- Test framework: Vitest 1.6 + `@testing-library/react 16.0.1` + `happy-dom 15.7.4` (already installed).
- No new npm dependency other than `driver.js`.
- Mobile-first: tour popover uses `width: calc(100vw - 32px)` under 640px viewport (driver.js theme CSS).

## File Structure

**New files:**

```
supabase/migrations/0014_onboarding_flags.sql

lib/onboarding/
  types.ts
  tours.ts
  user-tour.ts
  admin-tour.ts
  onboarding-theme.css       ← tokens.css-aligned driver.js theme
  onboarding-provider.tsx
  use-onboarding.ts
  onboarding-host.tsx        ← thin wrapper, lives in components/ (below)

app/actions/onboarding.ts

components/onboarding/
  onboarding-host.tsx
  tour-replay-button.tsx

tests/onboarding/
  tours.spec.ts
  onboarding-provider.spec.tsx
  use-onboarding.spec.ts
  actions-onboarding.spec.ts
```

**Modified files:**

```
package.json                                         ← add driver.js dep
app/(app)/layout.tsx                                 ← wraps children in provider
app/(admin)/admin/layout.tsx                         ← wraps children in provider, reads profile
app/(app)/meu-desempenho/page.tsx                    ← adds <TourReplayButton role="user">
app/(admin)/admin/page.tsx                           ← adds <TourReplayButton role="admin">

components/posts/post-card.tsx                       ← data-tour="timeline-card"
components/posts/checkin-buttons.tsx                 ← data-tour="declare-actions" wrapper
components/layout/header.tsx                         ← data-tour on nav links
components/layout/admin-nav.tsx                      ← data-tour on nav links
components/admin/metrics-cards.tsx                   ← data-tour="admin-metrics" wrapper
docs/TESTING.md                                      ← add E2E manual procedure
```

`lib/onboarding/onboarding-theme.css` is co-located with the lib code (provider imports it from JS via `import './onboarding-theme.css'`).

---

## Task 1: Add driver.js dependency

**Files:**
- Modify: `package.json` (via `pnpm add`)
- Modify: `pnpm-lock.yaml` (auto)

**Interfaces:**
- Consumes: nothing
- Produces: `driver.js` importable as `import { driver } from 'driver.js'` and `'driver.js/dist/driver.css'`.

- [ ] **Step 1: Install driver.js**

Run: `pnpm add driver.js`
Expected: `package.json` adds `"driver.js": "^0.9.0"` (or current stable) under `dependencies`. `pnpm-lock.yaml` updates. No peer warnings.

- [ ] **Step 2: Verify typecheck still passes**

Run: `pnpm typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add driver.js for onboarding tours"
```

---

## Task 2: Migration — add onboarding flag columns

**Files:**
- Create: `supabase/migrations/0014_onboarding_flags.sql`

**Interfaces:**
- Consumes: existing `profiles` table from `0001_init.sql`.
- Produces: `profiles.onboarded_at timestamptz null` and `profiles.admin_onboarded_at timestamptz null`.

**Important context confirmed during planning:** `0001_init.sql` lines 181–185 already define `profiles_update_self` with `using (auth.uid() = id)` and `with check (auth.uid() = id)`. Migration 0002's trigger `protect_admin_fields` blocks self-update of `is_admin`/`is_active` regardless of policy. **Therefore no new RLS policy is needed** — only adding the two columns.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0014_onboarding_flags.sql`:

```sql
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
```

- [ ] **Step 2: Commit migration**

```bash
git add supabase/migrations/0014_onboarding_flags.sql
git commit -m "feat(db): add onboarding flag columns to profiles"
```

> **Note for the implementer:** The actual DB apply (running `supabase db push` or equivalent against the dev/prod environment) is out of scope of this code plan. That step is executed by the operator after the PR is merged.

---

## Task 3: Tour types and step arrays

**Files:**
- Create: `lib/onboarding/types.ts`
- Create: `lib/onboarding/tours.ts`
- Create: `lib/onboarding/user-tour.ts`
- Create: `lib/onboarding/admin-tour.ts`
- Test: `tests/onboarding/tours.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `OnboardingRole`, `TourStep` types; `userTourSteps`, `adminTourSteps` arrays.

- [ ] **Step 1: Write the failing test**

Create `tests/onboarding/tours.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { userTourSteps } from '@/lib/onboarding/user-tour';
import { adminTourSteps } from '@/lib/onboarding/admin-tour';

describe('onboarding tours', () => {
  it('userTourSteps has exactly 5 steps', () => {
    expect(userTourSteps).toHaveLength(5);
  });

  it('adminTourSteps has exactly 4 steps', () => {
    expect(adminTourSteps).toHaveLength(4);
  });

  it.each([
    ['userTourSteps', 'userTourSteps' as const],
    ['adminTourSteps', 'adminTourSteps' as const],
  ])('%s has valid step shape', (_name, source) => {
    const steps = source === 'userTourSteps' ? userTourSteps : adminTourSteps;
    for (const step of steps) {
      expect(step.selector).toBeTruthy();
      expect(step.selector).toMatch(/^\[data-tour="/);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.title.length).toBeLessThanOrEqual(60);
      expect(step.body.length).toBeGreaterThan(0);
      expect(step.body.length).toBeLessThanOrEqual(240);
    }
  });

  it('userTourSteps selectors are unique', () => {
    const selectors = userTourSteps.map((s) => s.selector);
    expect(new Set(selectors).size).toBe(selectors.length);
  });

  it('adminTourSteps selectors are unique', () => {
    const selectors = adminTourSteps.map((s) => s.selector);
    expect(new Set(selectors).size).toBe(selectors.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/onboarding/tours.spec.ts`
Expected: FAIL with "Cannot find module '@/lib/onboarding/user-tour'" (or similar module-not-found).

- [ ] **Step 3: Implement types**

Create `lib/onboarding/types.ts`:

```ts
export type OnboardingRole = 'user' | 'admin';

export interface TourStep {
  /** CSS selector of the target element. Must be unique inside its tour. */
  selector: string;
  /** Popover title (1 line, ≤ 60 chars). */
  title: string;
  /** Popover body (2-3 lines, ≤ 240 chars). */
  body: string;
  /** Preferred popover position relative to the target. */
  side?: 'top' | 'bottom' | 'left' | 'right';
}
```

- [ ] **Step 4: Implement user tour steps**

Create `lib/onboarding/user-tour.ts`:

```ts
import type { TourStep } from './types';

export const userTourSteps: TourStep[] = [
  {
    selector: '[data-tour="timeline-header"]',
    title: 'Bem-vindo ao SEBRAEIERS',
    body: 'Engajar as redes oficiais vira disputa saudável. Em 30 segundos por dia você soma pontos e sobe no ranking.',
  },
  {
    selector: '[data-tour="timeline-card"]',
    title: 'O feed',
    body: 'Cada card é uma publicação oficial. Curta, comente ou compartilhe na rede original primeiro — depois declare aqui.',
    side: 'bottom',
  },
  {
    selector: '[data-tour="declare-actions"]',
    title: 'Declare sua ação',
    body: 'Toque em Curti, Comentei ou Compartilhei. Sua declaração entra na fila do admin para aprovação.',
    side: 'top',
  },
  {
    selector: '[data-tour="ranking-link"]',
    title: 'Ranking semanal',
    body: 'Dispute posição com o time. Critério de desempate: quem engajou por último fica acima.',
    side: 'bottom',
  },
  {
    selector: '[data-tour="performance-link"]',
    title: 'Seu progresso',
    body: 'Acompanhe pontos, histórico e status (Bronze → Diamante). Configure seus handles em Perfil quando quiser.',
    side: 'bottom',
  },
];
```

- [ ] **Step 5: Implement admin tour steps**

Create `lib/onboarding/admin-tour.ts`:

```ts
import type { TourStep } from './types';

export const adminTourSteps: TourStep[] = [
  {
    selector: '[data-tour="admin-checkins"]',
    title: 'Fila de aprovações',
    body: 'Tudo que os colaboradores declaram cai aqui. Aprove ou rejeite com nota — a nota aparece para o colaborador.',
    side: 'bottom',
  },
  {
    selector: '[data-tour="admin-posts"]',
    title: 'Publicações',
    body: 'Crie, edite e desative posts do feed. URL original e capa são obrigatórios; rede social é uma das 6 suportadas.',
    side: 'bottom',
  },
  {
    selector: '[data-tour="admin-users"]',
    title: 'Usuários',
    body: 'Busque por nome, username ou email. Ative ou desative contas com cuidado — não é possível desativar o último admin.',
    side: 'bottom',
  },
  {
    selector: '[data-tour="admin-metrics"]',
    title: 'Métricas',
    body: 'Acompanhe aprovações pendentes, ranking agregado e uso por rede. Atualiza ao recarregar.',
    side: 'top',
  },
];
```

- [ ] **Step 6: Implement tours.ts barrel**

Create `lib/onboarding/tours.ts`:

```ts
import type { OnboardingRole } from './types';
import { userTourSteps } from './user-tour';
import { adminTourSteps } from './admin-tour';

export type { OnboardingRole, TourStep } from './types';

export function getStepsForRole(role: OnboardingRole) {
  return role === 'user' ? userTourSteps : adminTourSteps;
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm test tests/onboarding/tours.spec.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 8: Commit**

```bash
git add lib/onboarding/types.ts lib/onboarding/tours.ts lib/onboarding/user-tour.ts lib/onboarding/admin-tour.ts tests/onboarding/tours.spec.ts
git commit -m "feat(onboarding): tour types and declarative step arrays"
```

---

## Task 4: Server actions — markOnboarded and resetOnboarded

**Files:**
- Create: `app/actions/onboarding.ts`
- Test: `tests/onboarding/actions-onboarding.spec.ts`

**Interfaces:**
- Consumes: Supabase server client (`@/lib/supabase/server`), `getCurrentProfile` from `@/lib/auth`.
- Produces: `markOnboarded(role)`, `resetOnboarded(role)` server actions returning `{ok: true} | {ok: false; error: string}`.

- [ ] **Step 1: Write the failing test**

Create `tests/onboarding/actions-onboarding.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Supabase server client used by the action.
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

// Mock getCurrentProfile to control is_admin.
const mockGetCurrentProfile = vi.fn();
vi.mock('@/lib/auth', () => ({
  getCurrentProfile: mockGetCurrentProfile,
}));

describe('onboarding server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    // chain: from(table).update(values).eq(col, val)
    mockFrom.mockReturnValue({
      update: mockUpdate.mockReturnValue({
        eq: mockEq.mockResolvedValue({ error: null }),
      }),
    });
  });

  it('markOnboarded("user") updates only onboarded_at and succeeds', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'user-1', is_admin: false });
    const { markOnboarded } = await import('@/app/actions/onboarding');
    const res = await markOnboarded('user');
    expect(res).toEqual({ ok: true });
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith({ onboarded_at: expect.any(String) });
  });

  it('markOnboarded("admin") for non-admin returns forbidden', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'user-1', is_admin: false });
    const { markOnboarded } = await import('@/app/actions/onboarding');
    const res = await markOnboarded('admin');
    expect(res).toEqual({ ok: false, error: 'forbidden' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('markOnboarded("admin") for admin updates only admin_onboarded_at', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'user-1', is_admin: true });
    const { markOnboarded } = await import('@/app/actions/onboarding');
    const res = await markOnboarded('admin');
    expect(res).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({ admin_onboarded_at: expect.any(String) });
  });

  it('resetOnboarded("user") nulls onboarded_at and keeps admin flag intact', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'user-1', is_admin: false });
    const { resetOnboarded } = await import('@/app/actions/onboarding');
    const res = await resetOnboarded('user');
    expect(res).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({ onboarded_at: null });
  });

  it('returns unauthenticated when no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { markOnboarded } = await import('@/app/actions/onboarding');
    const res = await markOnboarded('user');
    expect(res).toEqual({ ok: false, error: 'unauthenticated' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/onboarding/actions-onboarding.spec.ts`
Expected: FAIL with module-not-found for `@/app/actions/onboarding`.

- [ ] **Step 3: Implement the server actions**

Create `app/actions/onboarding.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/onboarding/actions-onboarding.spec.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Run typecheck**

Run: `pnpm typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add app/actions/onboarding.ts tests/onboarding/actions-onboarding.spec.ts
git commit -m "feat(onboarding): server actions to mark and reset tour flags"
```

---

## Task 5: Onboarding hook and provider

**Files:**
- Create: `lib/onboarding/onboarding-provider.tsx`
- Create: `lib/onboarding/use-onboarding.ts`
- Test: `tests/onboarding/onboarding-provider.spec.tsx`
- Test: `tests/onboarding/use-onboarding.spec.ts`

**Interfaces:**
- Consumes: `markOnboarded` from `@/app/actions/onboarding`, `getStepsForRole` from `./tours`.
- Produces: `<OnboardingProvider>` (client) and `useOnboarding()` hook.

- [ ] **Step 1: Write the failing provider test**

Create `tests/onboarding/onboarding-provider.spec.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

// Mock the server action.
const mockMarkOnboarded = vi.fn().mockResolvedValue({ ok: true });
vi.mock('@/app/actions/onboarding', () => ({
  markOnboarded: mockMarkOnboarded,
}));

import { OnboardingProvider } from '@/lib/onboarding/onboarding-provider';
import { useOnboarding } from '@/lib/onboarding/use-onboarding';

beforeEach(() => {
  vi.clearAllMocks();
  mockMarkOnboarded.mockResolvedValue({ ok: true });
});

describe('useOnboarding', () => {
  it('throws when used outside a provider', () => {
    expect(() => renderHook(() => useOnboarding())).toThrow(/OnboardingProvider/);
  });
});

describe('OnboardingProvider', () => {
  function ReadProbe() {
    const ctx = useOnboarding();
    return (
      <div>
        <span data-testid="total">{ctx.total}</span>
        <span data-testid="current">{ctx.currentStep}</span>
        <span data-testid="active">{ctx.isActive ? 'yes' : 'no'}</span>
        <button data-testid="next" onClick={ctx.next}>next</button>
        <button data-testid="skip" onClick={ctx.skip}>skip</button>
      </div>
    );
  }

  it('renders 5 user steps and starts inactive when shouldStart=false', () => {
    render(
      <OnboardingProvider role="user" shouldStart={false}>
        <ReadProbe />
      </OnboardingProvider>,
    );
    expect(screen.getByTestId('total')).toHaveTextContent('5');
    expect(screen.getByTestId('current')).toHaveTextContent('0');
    expect(screen.getByTestId('active')).toHaveTextContent('no');
  });

  it('advances current step on next()', () => {
    render(
      <OnboardingProvider role="user" shouldStart={false}>
        <ReadProbe />
      </OnboardingProvider>,
    );
    act(() => screen.getByTestId('next').click());
    expect(screen.getByTestId('current')).toHaveTextContent('1');
    expect(screen.getByTestId('active')).toHaveTextContent('yes');
    expect(mockMarkOnboarded).not.toHaveBeenCalled();
  });

  it('calls markOnboarded and deactivates on skip()', async () => {
    render(
      <OnboardingProvider role="user" shouldStart={false}>
        <ReadProbe />
      </OnboardingProvider>,
    );
    await act(async () => screen.getByTestId('skip').click());
    expect(mockMarkOnboarded).toHaveBeenCalledWith('user');
    expect(screen.getByTestId('active')).toHaveTextContent('no');
  });

  it('calls markOnboarded when next() is invoked on the last step', async () => {
    render(
      <OnboardingProvider role="user" shouldStart={false}>
        <ReadProbe />
      </OnboardingProvider>,
    );
    for (let i = 0; i < 5; i++) {
      await act(async () => screen.getByTestId('next').click());
    }
    expect(mockMarkOnboarded).toHaveBeenCalledWith('user');
    expect(mockMarkOnboarded).toHaveBeenCalledTimes(1);
  });

  it('uses admin tour when role=admin', () => {
    render(
      <OnboardingProvider role="admin" shouldStart={false}>
        <ReadProbe />
      </OnboardingProvider>,
    );
    expect(screen.getByTestId('total')).toHaveTextContent('4');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/onboarding/onboarding-provider.spec.tsx`
Expected: FAIL with module-not-found for `@/lib/onboarding/onboarding-provider`.

- [ ] **Step 3: Implement the hook**

Create `lib/onboarding/use-onboarding.ts`:

```ts
'use client';

import { createContext, useContext } from 'react';
import type { OnboardingRole, TourStep } from './types';

export interface OnboardingContextValue {
  role: OnboardingRole;
  steps: TourStep[];
  currentStep: number;
  total: number;
  isActive: boolean;
  next: () => void;
  skip: () => void;
}

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within an OnboardingProvider');
  return ctx;
}
```

- [ ] **Step 4: Implement the provider**

Create `lib/onboarding/onboarding-provider.tsx`:

```tsx
'use client';

import * as React from 'react';
import { OnboardingContext, type OnboardingContextValue } from './use-onboarding';
import { getStepsForRole } from './tours';
import type { OnboardingRole } from './types';
import { markOnboarded } from '@/app/actions/onboarding';

interface OnboardingProviderProps {
  role: OnboardingRole;
  shouldStart: boolean;
  children: React.ReactNode;
}

export function OnboardingProvider({ role, shouldStart, children }: OnboardingProviderProps) {
  const steps = React.useMemo(() => getStepsForRole(role), [role]);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isActive, setIsActive] = React.useState(shouldStart);

  const finish = React.useCallback(async () => {
    setIsActive(false);
    await markOnboarded(role);
  }, [role]);

  const next = React.useCallback(() => {
    setCurrentStep((prev) => {
      const isLast = prev >= steps.length - 1;
      if (isLast) {
        void finish();
        return prev;
      }
      setIsActive(true);
      return prev + 1;
    });
  }, [finish, steps.length]);

  const skip = React.useCallback(() => {
    void finish();
  }, [finish]);

  const value: OnboardingContextValue = {
    role,
    steps,
    currentStep,
    total: steps.length,
    isActive,
    next,
    skip,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test tests/onboarding/onboarding-provider.spec.tsx tests/onboarding/use-onboarding.spec.ts`
Expected: PASS — all 6 tests green.

- [ ] **Step 6: Run typecheck**

Run: `pnpm typecheck`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add lib/onboarding/use-onboarding.ts lib/onboarding/onboarding-provider.tsx tests/onboarding/onboarding-provider.spec.tsx tests/onboarding/use-onboarding.spec.ts
git commit -m "feat(onboarding): provider context and hook with start/advance/skip"
```

---

## Task 6: driver.js host + theme

**Files:**
- Create: `lib/onboarding/onboarding-theme.css`
- Create: `components/onboarding/onboarding-host.tsx`

**Interfaces:**
- Consumes: `useOnboarding()` hook, `driver.js` import, `OnboardingRole`.
- Produces: `<OnboardingHost>` (client component) that mounts driver.js, reads current step from context, advances on next, and renders the popover with our token-aligned theme.

- [ ] **Step 1: Write the theme CSS**

Create `lib/onboarding/onboarding-theme.css`:

```css
/* driver.js theme aligned with tokens.css (azul Atlântico). */
.driver-popover.sebraiers-tour {
  background: hsl(var(--surface-elevated));
  color: hsl(var(--text-primary));
  border-radius: 14px;
  border: 1px solid hsl(var(--border-subtle));
  box-shadow:
    0 12px 32px -8px hsl(var(--brand-azul-700) / 0.18),
    0 4px 12px -4px hsl(0 0% 0% / 0.08);
  padding: 18px 20px 16px;
  max-width: 360px;
  font-family: 'Inter', system-ui, sans-serif;
}

.driver-popover.sebraiers-tour .driver-popover-title {
  font-family: 'Figtree', system-ui, sans-serif;
  font-weight: 700;
  font-size: 16px;
  line-height: 1.3;
  color: hsl(var(--text-primary));
  margin: 0 0 6px;
}

.driver-popover.sebraiers-tour .driver-popover-description {
  font-size: 14px;
  line-height: 1.5;
  color: hsl(var(--text-secondary));
  margin: 0;
}

.driver-popover.sebraiers-tour .driver-popover-progress-text {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: hsl(var(--text-muted));
  margin: 0 0 8px;
}

.driver-popover.sebraiers-tour button.driver-popover-next-btn,
.driver-popover.sebraiers-tour button.driver-popover-done-btn {
  background: hsl(var(--brand-azul-700));
  color: white;
  border: none;
  border-radius: 10px;
  padding: 8px 14px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.driver-popover.sebraiers-tour button.driver-popover-next-btn:hover,
.driver-popover.sebraiers-tour button.driver-popover-done-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px -2px hsl(var(--brand-azul-700) / 0.35);
}

.driver-popover.sebraiers-tour button.driver-popover-prev-btn {
  background: transparent;
  color: hsl(var(--text-secondary));
  border: none;
  padding: 8px 10px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}

.driver-popover.sebraiers-tour button.driver-popover-close-btn {
  color: hsl(var(--text-muted));
}

/* Skip link rendered as a ghost button left of "Próximo". */
.driver-popover.sebraiers-tour .driver-popover-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}

.driver-popover.sebraiers-tour [data-sebraiers-skip] {
  background: transparent;
  border: none;
  color: hsl(var(--text-secondary));
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  padding: 8px 10px;
}

.driver-popover.sebraiers-tour [data-sebraiers-skip]:hover {
  color: hsl(var(--text-primary));
}

/* Mobile: edge-to-edge with margin. */
@media (max-width: 640px) {
  .driver-popover.sebraiers-tour {
    width: calc(100vw - 32px);
    max-width: calc(100vw - 32px);
  }
  .driver-popover.sebraiers-tour .driver-popover-progress-text {
    margin-bottom: 4px;
  }
}

/* Reduced motion: kill transitions on driver-injected elements. */
@media (prefers-reduced-motion: reduce) {
  .driver-popover.sebraiers-tour,
  .driver-popover.sebraiers-tour * {
    transition: none !important;
    animation: none !important;
  }
}
```

- [ ] **Step 2: Implement the host**

Create `components/onboarding/onboarding-host.tsx`:

```tsx
'use client';

import * as React from 'react';
import { useOnboarding } from '@/lib/onboarding/use-onboarding';
import '@/lib/onboarding/onboarding-theme.css';

export function OnboardingHost() {
  const { steps, currentStep, isActive, next, skip } = useOnboarding();
  const driverRef = React.useRef<unknown>(null);

  React.useEffect(() => {
    if (!isActive) return;

    let cancelled = false;

    (async () => {
      const { driver } = await import('driver.js');
      if (cancelled) return;

      // Destroy any prior driver.
      const prior = driverRef.current as { destroy?: () => void } | null;
      prior?.destroy?.();

      const step = steps[currentStep];
      if (!step) return;

      const d = driver({
        showProgress: true,
        progressText: '{{current}} de {{total}}',
        animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        allowClose: true,
        onDestroyed: () => {
          // User closed via Esc or overlay click — treat as skip.
          void skip();
        },
        onNextClick: () => {
          void next();
        },
        steps: [
          {
            element: step.selector,
            popover: {
              className: 'sebraiers-tour',
              title: step.title,
              description: step.body,
              position: step.side ?? 'bottom',
              showButtons: ['next'],
              nextBtnText: currentStep === steps.length - 1 ? 'Concluir' : 'Próximo',
            },
          },
        ],
      });

      // Inject "Pular tour" link in the popover footer.
      setTimeout(() => {
        const popover = document.querySelector('.driver-popover.sebraiers-tour');
        if (!popover) return;
        if (popover.querySelector('[data-sebraiers-skip]')) return;
        const footer = popover.querySelector('.driver-popover-footer');
        if (!footer) return;
        const skipBtn = document.createElement('button');
        skipBtn.setAttribute('data-sebraiers-skip', '');
        skipBtn.type = 'button';
        skipBtn.textContent = 'Pular tour';
        skipBtn.addEventListener('click', () => {
          d.destroy();
        });
        footer.prepend(skipBtn);
      }, 0);

      d.drive();
      driverRef.current = d;
    })();

    return () => {
      cancelled = true;
      const prior = driverRef.current as { destroy?: () => void } | null;
      prior?.destroy?.();
    };
  }, [isActive, currentStep, steps, next, skip]);

  return null;
}
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: exit 0 (TS will accept the `unknown` cast — `driver.js` has no official types beyond what we use).

- [ ] **Step 4: Commit**

```bash
git add lib/onboarding/onboarding-theme.css components/onboarding/onboarding-host.tsx
git commit -m "feat(onboarding): driver.js host with token-aligned theme"
```

---

## Task 7: Add `data-tour` attributes to existing components

**Files:**
- Modify: `components/posts/post-card.tsx`
- Modify: `components/posts/checkin-buttons.tsx`
- Modify: `components/layout/header.tsx`
- Modify: `components/layout/admin-nav.tsx`
- Modify: `components/admin/metrics-cards.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `data-tour="..."` attributes on the correct DOM elements. Pure attribute additions, no behavior change.

- [ ] **Step 1: Add `data-tour="timeline-card"` to post-card root**

Open `components/posts/post-card.tsx`. Find the outermost `<article>` (or root) of the component. Add `data-tour="timeline-card"` to it. If the root is already wrapped, use the existing root; otherwise wrap as needed. **Don't restructure the component** — just add the attribute.

```tsx
// Example diff (exact root element depends on the file):
<article
  data-tour="timeline-card"
  className={cn(/* existing classes */)}
>
  {/* existing JSX */}
</article>
```

- [ ] **Step 2: Add `data-tour="declare-actions"` wrapper to checkin-buttons**

Open `components/posts/checkin-buttons.tsx`. Find the outer `<div className="grid sm:grid-cols-3 gap-3">` that wraps the 3 buttons. Add `data-tour="declare-actions"` to that wrapper:

```tsx
<div data-tour="declare-actions" className="grid sm:grid-cols-3 gap-3">
  {/* existing buttons */}
</div>
```

- [ ] **Step 3: Add `data-tour` attributes to header links**

Open `components/layout/header.tsx`. In the `<nav>` mapping over `[Timeline, Ranking, Meu desempenho]`, add `data-tour` to each `<Link>` based on `href`:

| href | data-tour |
|---|---|
| `/timeline` | (none — header itself is the `timeline-header` target via the page below) |
| `/ranking` | `data-tour="ranking-link"` |
| `/meu-desempenho` | `data-tour="performance-link"` |

Apply via the existing `<Link>` props:

```tsx
<Link
  href={href}
  data-tour={
    href === '/ranking' ? 'ranking-link'
    : href === '/meu-desempenho' ? 'performance-link'
    : undefined
  }
  className={cn(/* existing */)}
>
```

- [ ] **Step 4: Add `data-tour` to the timeline page heading**

Open `app/(app)/timeline/page.tsx` (or wherever the timeline `<h1>` lives — find it with `grep -n "h1\|timeline" app/(app)/timeline/page.tsx`). Add `data-tour="timeline-header"` to the `<h1>` element:

```tsx
<h1 data-tour="timeline-header" className="text-h1 text-text-primary">...</h1>
```

- [ ] **Step 5: Add `data-tour` to admin-nav links**

Open `components/layout/admin-nav.tsx`. The nav maps over `[{href:'/admin'}, {href:'/admin/posts'}, {href:'/admin/checkins'}, {href:'/admin/users'}]`. Add `data-tour` to each `<Link>`:

| href | data-tour |
|---|---|
| `/admin/posts` | `data-tour="admin-posts"` |
| `/admin/checkins` | `data-tour="admin-checkins"` |
| `/admin/users` | `data-tour="admin-users"` |

Apply via the existing `<Link>` props similarly to Step 3. `/admin` (Dashboard) and any `/admin/metrics` link do not get a `data-tour` (metrics uses a different target — see next step).

- [ ] **Step 6: Add `data-tour="admin-metrics"` to MetricsCards root**

Open `components/admin/metrics-cards.tsx`. Find the outermost `<div>` (or `<section>`) and add `data-tour="admin-metrics"`:

```tsx
<div data-tour="admin-metrics" className={/* existing */}>
  {/* existing cards */}
</div>
```

- [ ] **Step 7: Verify all selectors resolve**

Run a quick grep to confirm all 9 selectors exist exactly once in `app/` or `components/`:

```bash
for s in timeline-header timeline-card declare-actions ranking-link performance-link admin-checkins admin-posts admin-users admin-metrics; do
  echo "=== $s ==="
  grep -rn "data-tour=\"$s\"" app components
done
```

Expected: each `===` prints exactly one matching line.

- [ ] **Step 8: Run typecheck and tests**

Run: `pnpm typecheck && pnpm test`
Expected: typecheck exit 0; all tests still pass (this task adds no new tests).

- [ ] **Step 9: Commit**

```bash
git add app components
git commit -m "feat(onboarding): add data-tour attributes to layout anchors"
```

---

## Task 8: Wire provider into layouts

**Files:**
- Modify: `app/(app)/layout.tsx`
- Modify: `app/(admin)/admin/layout.tsx`

**Interfaces:**
- Consumes: `OnboardingProvider` from `@/lib/onboarding/onboarding-provider`, `OnboardingHost` from `@/components/onboarding/onboarding-host`, `getCurrentProfile` from `@/lib/auth`.
- Produces: app layout wraps children in `<OnboardingProvider role="user" shouldStart={...}>` and renders `<OnboardingHost />`; admin layout does the same for `role="admin"`.

- [ ] **Step 1: Update the app layout**

Replace `app/(app)/layout.tsx`:

```tsx
import { requireUser } from '@/lib/auth';
import { getCurrentProfile } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { OnboardingProvider } from '@/lib/onboarding/onboarding-provider';
import { OnboardingHost } from '@/components/onboarding/onboarding-host';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const profile = await getCurrentProfile();
  const shouldStart = profile?.onboarded_at == null;

  return (
    <OnboardingProvider role="user" shouldStart={shouldStart}>
      <Header />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">{children}</main>
      <OnboardingHost />
    </OnboardingProvider>
  );
}
```

- [ ] **Step 2: Update the admin layout**

Replace `app/(admin)/admin/layout.tsx`:

```tsx
import { requireAdmin } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { AdminNav } from '@/components/layout/admin-nav';
import { OnboardingProvider } from '@/lib/onboarding/onboarding-provider';
import { OnboardingHost } from '@/components/onboarding/onboarding-host';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();
  const shouldStart = profile.admin_onboarded_at == null;

  return (
    <OnboardingProvider role="admin" shouldStart={shouldStart}>
      <Header />
      <AdminNav />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">{children}</div>
      <OnboardingHost />
    </OnboardingProvider>
  );
}
```

> **Note:** `requireAdmin()` returns the profile (line 60 of `lib/auth.ts`), so we can read `admin_onboarded_at` from it without an extra query.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: exit 0.

- [ ] **Step 4: Smoke test manually**

Run: `pnpm dev`. Log in as a fresh test user (or seed via `supabase/seed-demo.sql`). Open `http://localhost:3000/timeline`. **Expected:** tour of 5 steps appears automatically. Click "Pular tour" → tour closes, page still functional. Reload → tour does NOT reappear.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/layout.tsx app/(admin)/admin/layout.tsx
git commit -m "feat(onboarding): mount provider and host in app and admin layouts"
```

---

## Task 9: Tour replay button

**Files:**
- Create: `components/onboarding/tour-replay-button.tsx`

**Interfaces:**
- Consumes: `resetOnboarded` from `@/app/actions/onboarding`.
- Produces: `<TourReplayButton role="user" | "admin" />` that, on click, calls `resetOnboarded(role)`, then `router.refresh()` to re-trigger the layout's `shouldStart` check.

- [ ] **Step 1: Implement the button**

Create `components/onboarding/tour-replay-button.tsx`:

```tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle } from 'lucide-react';
import { resetOnboarded } from '@/app/actions/onboarding';
import { cn } from '@/lib/utils';

interface TourReplayButtonProps {
  role: 'user' | 'admin';
  className?: string;
}

export function TourReplayButton({ role, className }: TourReplayButtonProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  async function handleClick() {
    if (!confirming) {
      setConfirming(true);
      window.setTimeout(() => setConfirming(false), 4000);
      return;
    }
    setPending(true);
    const res = await resetOnboarded(role);
    setPending(false);
    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-elevated px-3 py-1.5 text-caption font-semibold text-text-secondary hover:border-brand-azul/40 hover:text-brand-azul-700 transition-colors duration-base',
        confirming && 'border-state-warning text-state-warning-strong',
        className,
      )}
    >
      <HelpCircle className="h-3.5 w-3.5" />
      {pending ? 'Reabrindo…' : confirming ? 'Confirmar' : 'Rever tour'}
    </button>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/onboarding/tour-replay-button.tsx
git commit -m "feat(onboarding): tour replay button with confirm-then-reset"
```

---

## Task 10: Mount replay button on key pages

**Files:**
- Modify: `app/(app)/meu-desempenho/page.tsx`
- Modify: `app/(admin)/admin/page.tsx`

**Interfaces:**
- Consumes: `<TourReplayButton role="user" | "admin" />` from `@/components/onboarding/tour-replay-button`.
- Produces: a "Rever tour" button visible at the top of `/meu-desempenho` and at the top of the admin dashboard, next to each page's `<h1>`.

- [ ] **Step 1: Add replay button to meu-desempenho**

Open `app/(app)/meu-desempenho/page.tsx`. After the `<h1>` element (find via `grep -n "h1" app/(app)/meu-desempenho/page.tsx`), add the button next to it. Example final structure:

```tsx
<div className="flex items-start justify-between gap-4">
  <h1 className="text-h1 text-text-primary">Meu desempenho</h1>
  <TourReplayButton role="user" />
</div>
{/* existing content */}
```

Add the import at the top:

```tsx
import { TourReplayButton } from '@/components/onboarding/tour-replay-button';
```

- [ ] **Step 2: Add replay button to admin dashboard**

Open `app/(admin)/admin/page.tsx`. Replace the standalone `<h1>` line with a flex container:

```tsx
<div className="flex items-start justify-between gap-4">
  <h1 className="text-h1 text-text-primary">Painel administrativo</h1>
  <TourReplayButton role="admin" />
</div>
```

Add the import at the top:

```tsx
import { TourReplayButton } from '@/components/onboarding/tour-replay-button';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: exit 0.

- [ ] **Step 4: Manual smoke test**

Run: `pnpm dev`. Log in as a user who has already finished the user tour. Navigate to `/meu-desempenho`. Click "Rever tour" once → button text changes to "Confirmar". Click again → page refreshes; user tour should fire again on the next visit to `/timeline` (the replay button only resets the flag; the tour only triggers on the next layout render). Repeat for admin: visit `/admin` and use the replay button to re-trigger the admin tour.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/meu-desempenho/page.tsx app/(admin)/admin/page.tsx
git commit -m "feat(onboarding): mount tour replay buttons on key pages"
```

---

## Task 11: Documentation — manual test procedure

**Files:**
- Modify: `docs/TESTING.md`

**Interfaces:**
- Consumes: nothing new.
- Produces: a "Onboarding Tours" section appended to `docs/TESTING.md` with the manual smoke procedure from the spec.

- [ ] **Step 1: Inspect existing docs/TESTING.md structure**

Run: `grep -n "^##\|^###" docs/TESTING.md`
Expected: list of existing section headings. Pick a logical place to insert the new section (likely after the last section, before any "Rollback" footer).

- [ ] **Step 2: Append the new section**

Append (or insert) to `docs/TESTING.md`:

```markdown
## Onboarding Tours (manual smoke)

These steps verify the in-app tour flow for both roles. Run after any change
to `lib/onboarding/`, `components/onboarding/`, or `app/actions/onboarding.ts`.

### Collaborator tour

1. Sign up a fresh test user (or `psql -c "update profiles set onboarded_at = null where id = '<uuid>'"`).
2. Log in → land on `/timeline`.
3. **Expected:** tour appears with 5 steps in this order: timeline header → feed card → declare actions → ranking link → performance link. Step counter shows `N de 5`.
4. Click "Pular tour" → popover closes, page remains functional.
5. Reload `/timeline` → **no tour**.
6. Navigate to `/meu-desempenho` → click "Rever tour" → confirm → page refreshes.
7. Reload `/timeline` → tour fires again from step 1.

### Admin tour

1. Promote a test user to admin:
   ```sql
   insert into public.admin_whitelist (email) values ('test-admin@sebraiers.local')
   on conflict do nothing;
   update public.profiles set is_admin = true where id = '<uuid>';
   update public.profiles set admin_onboarded_at = null where id = '<uuid>';
   ```
2. Log in as that user → land on `/timeline` (admin lands here first).
3. Navigate to `/admin` (or any `/admin/*` route).
4. **Expected:** admin tour fires with 4 steps: checkins → posts → users → metrics.
5. Click "Pular tour" → popover closes.
6. Navigate back to `/admin` → **no tour**.
7. On `/admin` home, click "Rever tour" → confirm → page refreshes.
8. Reload `/admin` → admin tour fires again from step 1.

### Accessibility

- Lighthouse a11y ≥ 95 on `/timeline` and `/admin` while a tour is active.
- Tab cycle stays inside the popover while open.
- Esc closes the tour (treated as skip).
- With `prefers-reduced-motion: reduce` enabled in OS, transitions are instant.

### Mobile

- Resize viewport to 375px (Chrome DevTools).
- Open a tour step → popover uses full width minus 16px margin.
- Step counter stacks below the title.
- Body scroll works behind the overlay.
```

- [ ] **Step 3: Commit**

```bash
git add docs/TESTING.md
git commit -m "docs(testing): manual smoke procedure for onboarding tours"
```

---

## Task 12: End-to-end verification

**Files:** none modified.

**Interfaces:** Run all checks against the working tree.

- [ ] **Step 1: Typecheck**

Run: `pnpm typecheck`
Expected: exit 0.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: exit 0. Fix any lint errors before proceeding.

- [ ] **Step 3: All tests**

Run: `pnpm test`
Expected: all suites pass. Total added in this plan: 17 tests across 4 files.

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 5: Manual smoke (per docs/TESTING.md)**

Run: `pnpm dev`. Walk through both tour flows end-to-end (collaborator + admin), confirm "Pular tour" and "Rever tour" both work, confirm `prefers-reduced-motion` and mobile viewport behave per spec.

- [ ] **Step 6: Final commit if any cleanup happened**

If any of Steps 1-5 surfaced minor fixes:

```bash
git add -A
git commit -m "chore(onboarding): lint/cleanup after final verification"
```

---

## Spec coverage checklist

| Spec section | Task(s) |
|---|---|
| §3 Migration (2 colunas + backfill) | Task 2 |
| §4 Arquitetura (server decide, client executa) | Tasks 4, 5, 6, 8 |
| §5.1 Novos arquivos (lib/onboarding, components/onboarding, tests/onboarding, app/actions) | Tasks 3, 4, 5, 6, 9 |
| §5.2 Arquivos modificados (layouts, pages, components, package.json) | Tasks 1, 7, 8, 10 |
| §6.1 `TourStep` type | Task 3 |
| §6.2 Server actions (`markOnboarded`, `resetOnboarded`) | Task 4 |
| §6.3 Provider + hook | Task 5 |
| §6.4 Hook API | Task 5 |
| §7 Conteúdo dos tours | Tasks 3, 7 (selectors), 6 (theme) |
| §8 A11y | Task 6 (theme includes reduced-motion + mobile CSS), Task 11 (Lighthouse + Esc) |
| §9.1 Unit tests | Tasks 3, 5 |
| §9.2 Integration tests | Task 4 |
| §9.3 E2E manual procedure | Task 11 |
| §10 Rollback (migration down, git revert) | Out of plan scope (operator action) |
| §11 Escopo (YAGNI: nada além disso) | Confirmed — no extra features added |