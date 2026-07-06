<!-- generated-by: gsd-doc-writer -->

# Testing

This document covers the test framework, conventions, and commands used in the SEBRAEIERS project.

## Test framework and setup

The project uses [Vitest](https://vitest.dev/) `1.6.0` as its test runner, with the following configuration in `vitest.config.ts`:

- **Environment:** `happy-dom` (lightweight DOM emulation for React component tests)
- **Setup file:** `./tests/setup.ts`
- **Globals:** enabled (`describe`, `it`, `expect`, `vi`, `beforeEach` are available without imports)
- **JSX transform:** automatic (`esbuild.jsx: 'automatic'`)
- **Path aliases:**
  - `@` → project root
  - `server-only` → `./tests/__mocks__/server-only.ts` (stubbed because the real module throws at import time outside Next.js)

The setup file registers `@testing-library/jest-dom/vitest` matchers (e.g., `toBeInTheDocument`, `toBeDisabled`) and stubs React's `cache` so it acts as a pass-through in tests.

**Supporting libraries (devDependencies):**

| Package | Version | Purpose |
| --- | --- | --- |
| `vitest` | `1.6.0` | Test runner |
| `@vitest/ui` | `1.6.0` | Browser-based test UI |
| `@testing-library/react` | `16.0.1` | Render and query React components |
| `@testing-library/jest-dom` | `6.5.0` | Custom DOM matchers |
| `@testing-library/user-event` | `14.5.2` | Realistic user interactions |
| `happy-dom` | `15.7.4` | DOM environment |

Before running tests for the first time, install dependencies with your package manager (this project uses `pnpm`, see README).

## Running tests

All test commands are defined in `package.json` under `scripts`:

| Command | Description |
| --- | --- |
| `pnpm test` | Run the full test suite once (CI mode) — alias for `vitest run` |
| `pnpm test:watch` | Run tests in watch mode, re-running on file changes — alias for `vitest` |
| `pnpm test:ui` | Launch the Vitest UI for browsing and debugging tests — alias for `vitest --ui` |

```bash
pnpm test           # one-off run
pnpm test:watch     # interactive watch
pnpm test:ui        # browser UI
```

To run a single file or a name filter, pass positional arguments to Vitest:

```bash
pnpm vitest run tests/lib/utils.test.ts
pnpm vitest run -t "formatPoints"
```

## Test file layout

All tests live under the top-level `tests/` directory (mirroring `lib/` and `components/` from the source tree):

```
tests/
├── setup.ts                       # global setup: jest-dom + React.cache stub
├── __mocks__/
│   └── server-only.ts             # stub for the server-only module
├── components/
│   └── button.test.tsx
├── lib/
│   ├── auth.test.ts
│   ├── ranking.test.ts
│   ├── utils.test.ts
│   ├── actions/                   # Server-action tests (mock Supabase clients)
│   │   ├── auth.test.ts
│   │   ├── checkins.test.ts
│   │   ├── checkins-admin.test.ts
│   │   ├── posts.test.ts
│   │   ├── profile.test.ts
│   │   ├── social.test.ts
│   │   └── users.test.ts
│   └── sync/                      # Google Sheets sync pipeline tests
│       ├── execute-sheet-sync.test.ts
│       ├── index.test.ts
│       ├── og-image.test.ts
│       └── sheets.test.ts
```

**Naming convention:** every test file ends with `.test.ts` for plain TS modules or `.test.tsx` for files that import JSX/React components.

## Writing new tests

Follow the patterns established in existing tests:

### Pure-function tests (lib utilities)

For pure logic, import the function directly and assert on its return value. Globals are enabled, so `describe`, `it`, and `expect` do not need to be imported — though existing tests import them for explicitness.

```ts
import { describe, it, expect } from 'vitest';
import { formatPoints, initials, cn } from '@/lib/utils';

describe('formatPoints', () => {
  it('formats with pt-BR thousands separator', () => {
    expect(formatPoints(1234)).toBe('1.234');
  });
});
```

### Component tests

Use `@testing-library/react` to render components and query the DOM. Prefer user-visible queries (`getByRole`, `getByText`) over test-id selectors.

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders children and applies variant class', () => {
    render(<Button variant="destructive">Excluir</Button>);
    expect(screen.getByRole('button', { name: 'Excluir' })).toHaveClass('bg-state-error');
  });
});
```

### Server-action and data-layer tests

Server actions depend on Supabase server/admin clients and Next.js routing helpers. Tests mock these modules **at the top of the file** with `vi.mock(...)`, then construct lightweight chainable mocks that match the Supabase client's query shape.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((u: string) => {
    throw new Error('NEXT_REDIRECT:' + u);
  }),
  revalidatePath: vi.fn(),
}));

const getUserMock = vi.fn();
const fromMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: getUserMock }, from: fromMock }),
}));

import { createPostAction } from '@/app/actions/posts';

describe('createPostAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates post as admin', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    // ...mock the from() chain...
    const fd = new FormData();
    fd.set('title', 'Teste');
    // ...
    await expect(createPostAction(null, fd)).rejects.toThrow('NEXT_REDIRECT:/admin/posts');
  });
});
```

Conventions observed across the suite:

- Mock `next/navigation` (redirect/revalidatePath) and `next/cache` (revalidatePath) so server actions don't touch the Next.js runtime.
- `redirect()` is mocked to throw, so tests assert on `rejects.toThrow('NEXT_REDIRECT:...')`.
- Supabase clients are mocked as a chainable `from()` table; you only need to mock the calls your action exercises.
- Use `beforeEach(() => vi.clearAllMocks())` to reset mock state between tests.
- Use `vi.mock('server-only', ...)` via the alias in `vitest.config.ts` if you import code that pulls in the `server-only` marker.

## RPC smoke tests

The atomic toggle RPCs introduced in `supabase/migrations/0013_toggle_reaction_rpc.sql` (`toggle_post_reaction`, `toggle_checkin_reaction`) are covered by unit tests in `tests/lib/actions/social.test.ts` (which mock `.rpc()`). To verify the SQL itself behaves correctly at the database level, run this smoke test against a local Supabase.

**Prerequisites:** a running local Supabase with all migrations applied.

```bash
supabase start
supabase db reset
```

### Procedure

Run the queries below from the Supabase Studio SQL editor or `supabase mui psql`. Substitute `<post-id>` and `<user-id>` with real IDs from your local seed data (find one of each with `select id from public.posts limit 1;` and `select id from auth.users limit 1;`).

```sql
-- 1. Set a reaction (first time) → expect 'set'
select toggle_post_reaction('<post-id>', '<user-id>', 'fire');

-- 2. Toggle the same reaction off → expect 'removed'
select toggle_post_reaction('<post-id>', '<user-id>', 'fire');

-- 3. Multi-reaction: set 'fire', then set 'clap' → both 'set'
--    (the composite PK (post_id, user_id, reaction) allows multiple
--    DISTINCT reactions per user per post, so fire + clap coexist)
select toggle_post_reaction('<post-id>', '<user-id>', 'fire');
select toggle_post_reaction('<post-id>', '<user-id>', 'clap');

-- 4. Toggling 'fire' leaves the existing 'clap' untouched → fire 'removed'
select toggle_post_reaction('<post-id>', '<user-id>', 'fire');
```

**Expected results:** `set`, `removed`, `set`, `set`, `removed` respectively. Step 4 demonstrates independent per-kind toggling.

The same flow applies to `toggle_checkin_reaction('<checkin-id>', '<user-id>', 'clap')`, noting that `checkin_reactions` only accepts the `clap` kind (CHECK constraint).

> These RPCs are `SECURITY DEFINER` and validate `p_user_id = auth.uid()` internally, so execute them while authenticated as the user whose `id` you pass. To test against the DB directly (bypassing RLS), use the service-role connection from `supabase mui psql`.

## Coverage requirements

No coverage threshold is configured. The project does not include `coverageThreshold` in `vitest.config.ts`, and there is no `.nycrc`, `c8` config, or equivalent in `package.json`. Run Vitest with the `--coverage` flag if you need a one-off coverage report:

```bash
pnpm vitest run --coverage
```

## CI integration

Pull requests and pushes to `main` run `.github/workflows/ci.yml` on GitHub Actions:

1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm test`

Run the same sequence locally before pushing if you want to mirror CI.

## Linting and type-checking alongside tests

These checks are not part of the test runner but are commonly run together with tests in pre-commit or pre-push pipelines:

| Command | Description |
| --- | --- |
| `pnpm typecheck` | Runs `tsc --noEmit` to verify TypeScript types across the project |
| `pnpm lint` | Runs `next lint` (ESLint with `eslint-config-next`) |

## Next steps

- See [`README.md`](../README.md) for project overview and quick start.
- See [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) for the system architecture and where each module fits.
- See [`docs/CONFIGURATION.md`](./CONFIGURATION.md) for environment variables required by tests that hit Supabase or external services.