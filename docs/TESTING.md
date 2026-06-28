<!-- generated-by: gsd-doc-writer -->

# Testing

## Test framework and setup

The project uses **Vitest** `1.6.0` as the test runner with **happy-dom** `15.7.4` as the DOM environment. Component tests use **@testing-library/react** `16.0.1` with **@testing-library/jest-dom** `6.5.0` matchers and **@testing-library/user-event** `14.5.2` for interaction simulation.

Configuration lives in `vitest.config.ts`:

- **Environment:** `happy-dom` (lightweight DOM for React component tests)
- **Setup file:** `tests/setup.ts` (imports `@testing-library/jest-dom/vitest`)
- **Globals:** enabled (`describe`, `it`, `expect`, `vi` available without imports, though most tests import explicitly)
- **Path aliases:** `@/` resolves to the project root; `server-only` is stubbed to `tests/__mocks__/server-only.ts` so server-only modules can be imported in unit tests

Install dependencies before running tests:

```bash
pnpm install
```

## Running tests

| Command | Description |
|---------|-------------|
| `pnpm test` | Run the full suite once (`vitest run`) |
| `pnpm test:watch` | Run tests in watch mode (`vitest`) |
| `pnpm test:ui` | Open the Vitest UI (`vitest --ui`) |

Run a single file:

```bash
pnpm test tests/lib/ranking.test.ts
```

Run tests matching a name pattern:

```bash
pnpm vitest run -t "sortRanking"
```

## Writing new tests

### File location and naming

Place test files under `tests/`, mirroring the source layout:

| Source area | Test directory |
|-------------|----------------|
| `app/actions/*` | `tests/lib/actions/*.test.ts` |
| `lib/sync/*` | `tests/lib/sync/*.test.ts` |
| `lib/ranking.ts` | `tests/lib/ranking.test.ts` |
| `lib/utils.ts` | `tests/lib/utils.test.ts` |
| `components/*` | `tests/components/*.test.tsx` |

Use the `*.test.ts` or `*.test.tsx` suffix. Vitest discovers all files matching this pattern under the project.

### Patterns

**Pure logic tests** — import the module under test and assert on return values:

```typescript
import { describe, it, expect } from 'vitest';
import { sortRanking } from '@/lib/ranking';

describe('sortRanking', () => {
  it('orders by total_points desc', () => {
    const out = sortRanking([/* ... */]);
    expect(out[0].user_id).toBe('b');
  });
});
```

**Server action tests** — mock Next.js navigation and Supabase before importing the action:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error('NEXT_REDIRECT:' + url); }),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { /* mocked methods */ } }),
}));

import { signUpAction } from '@/app/actions/auth';
```

**Component tests** — render with Testing Library and query by role or accessible name:

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

render(<Button variant="destructive">Excluir</Button>);
expect(screen.getByRole('button', { name: 'Excluir' })).toHaveClass('bg-state-error');
```

**Environment variables** — use `vi.stubEnv` / `vi.unstubAllEnvs` in `beforeEach` / `afterEach` when testing code that reads `process.env`.

**Global fetch** — stub with `vi.stubGlobal('fetch', fetchMock)` for sync and HTTP-dependent tests.

### Shared helpers

| File | Purpose |
|------|---------|
| `tests/setup.ts` | Global setup; registers jest-dom matchers |
| `tests/__mocks__/server-only.ts` | Empty stub so `server-only` imports do not throw in tests |

## Coverage requirements

No coverage threshold is configured. The `coverage/` directory is listed in `.gitignore` but coverage collection is not enabled in `vitest.config.ts` or `package.json` scripts.

To collect coverage manually:

```bash
pnpm vitest run --coverage
```

(Requires installing a coverage provider such as `@vitest/coverage-v8` — not currently a project dependency.)

## CI integration

No CI/CD pipeline detected in `.github/workflows/`. Tests are run locally via `pnpm test`. Before opening a pull request, run the full suite along with `pnpm typecheck` and `pnpm lint`.
