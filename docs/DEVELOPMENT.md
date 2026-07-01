<!-- generated-by: gsd-doc-writer -->

# Development

Local development workflow for the SEBRAEIERS Next.js 15 / Cloudflare Workers / Supabase stack.

## Local setup

This guide assumes you have completed the prerequisites and first-run steps in [GETTING-STARTED.md](./GETTING-STARTED.md) (Node.js >= 20, pnpm, Docker for local Supabase, `.env.local` populated). After `pnpm install` finishes:

1. **Make sure Supabase is running.** Local Supabase must be up before you boot the dev server — `middleware.ts` and the server-side admin client need a reachable database. If it has stopped, restart it:

   ```bash
   pnpm dlx supabase start
   ```

2. **Apply migrations after pulling changes.** Whenever you pull new migrations or seed updates, reset the local database:

   ```bash
   pnpm dlx supabase db reset
   ```

   This reruns everything in `supabase/migrations/` and `supabase/seed.sql` deterministically.

3. **Verify `.env.local` points at the local instance.** During local development, `NEXT_PUBLIC_SUPABASE_URL` must be the URL printed by `supabase start` (typically `http://127.0.0.1:54321`) — not a hosted project. Restart `pnpm dev` after editing `.env.local`.

4. **Generate Cloudflare environment types** when bindings in `wrangler.jsonc` change:

   ```bash
   pnpm cf-typegen
   ```

   This generates `cloudflare-env.d.ts` (gitignored, not committed) so the Worker's `env` is fully typed.

5. **Start the dev server:**

   ```bash
   pnpm dev
   ```

   Visit `http://localhost:3000` — visitors land on `/login`, authenticated users go to `/timeline`, and admins (auto-promoted for `@conteudoedu.com.br` emails at signup, per `supabase/migrations/0009_agency_admin_domain.sql`) can access `/admin`.

### Recommended dev tools

- **Wrangler** (already a `devDependency`) for previewing the OpenNext build locally before deploy:

  ```bash
  pnpm preview
  ```

  This runs `opennextjs-cloudflare build && opennextjs-cloudflare preview` and uses `.dev.vars` (gitignored) for Worker secrets — see [CONFIGURATION.md](./CONFIGURATION.md#per-environment-overrides).

- **Supabase CLI** via `pnpm dlx supabase …` for migrations, types, and the local stack.

- **Vitest UI** for visually inspecting failing tests:

  ```bash
  pnpm test:ui
  ```

## Build commands

All commands are defined in `package.json` and use `pnpm` (the repo ships a `pnpm-lock.yaml`):

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the Next.js dev server on port 3000 with HMR. |
| `pnpm build` | Production Next.js build (`next build`). |
| `pnpm start` | Serve the production build locally (`next start`). |
| `pnpm typecheck` | Type-check the project without emitting (`tsc --noEmit`). Run before pushing. |
| `pnpm lint` | ESLint via `next lint` (extends `next/core-web-vitals` and `next/typescript`). |
| `pnpm test` | Run the full Vitest suite once (`vitest run`). |
| `pnpm test:watch` | Vitest in watch mode for TDD loops. |
| `pnpm test:ui` | Launch the Vitest UI for debugging failing specs. |
| `pnpm preview` | Build with OpenNext and start a local Cloudflare Worker preview via Wrangler. |
| `pnpm upload` | Build with OpenNext and upload the bundle (no deploy). |
| `pnpm deploy` | Build with OpenNext and deploy to Cloudflare Workers. |
| `pnpm cf-typegen` | Regenerate `cloudflare-env.d.ts` (gitignored, not committed) from `wrangler.jsonc` using `wrangler types`. |

### Typical inner loop

```bash
pnpm dev          # leave running
pnpm typecheck    # in another shell
pnpm lint         # before opening a PR
pnpm test:watch   # while iterating on a feature
```

### Pre-deploy smoke

```bash
pnpm typecheck && pnpm lint && pnpm test
```

If everything is green and you want to verify the production bundle locally before pushing:

```bash
pnpm build
pnpm preview      # exercise the OpenNext Worker build via Wrangler
```

## Code style

The project relies on the Next.js + TypeScript ESLint presets and Prettier (via editor). There is no Prettier config file in the repo; formatting follows the IDE defaults or whatever Prettier/editor extension the contributor uses.

### Linting

- **Tool:** ESLint `^8.57.1`
- **Config:** `.eslintrc.json`

  ```json
  {
    "extends": ["next/core-web-vitals", "next/typescript"]
  }
  ```

- **Run:** `pnpm lint` (wrapper for `next lint`)

The two extends bundles cover Next.js's React/a11y rules and the recommended TypeScript rule set (including ban on `any`, consistent type imports, and unused-variable detection).

### TypeScript

- **Config:** `tsconfig.json`
  - `strict: true`
  - `target: ES2022`
  - `moduleResolution: bundler`
  - `jsx: preserve`
  - `paths: { "@/*": ["./*"] }` — the `@/` alias points at the project root and is used across the codebase (e.g., `@/lib/supabase/server`, `@/components/ui/button`)
- **Run:** `pnpm typecheck` (`tsc --noEmit`)

Server-only modules under `lib/sync/*` and `lib/queries/*` are guarded by `import 'server-only'` so they cannot accidentally be bundled into client code. The build enforces this. (Note: `lib/supabase/server.ts` and `lib/supabase/admin.ts` are not currently guarded with `import 'server-only'` — they rely on Next.js conventions such as `cookies()` and the service-role key being absent from client bundles.)

### Editor settings

No `.editorconfig` is committed. Match the existing style: 2-space indent, single quotes, trailing commas where valid, semicolons.

### Tailwind

Use the design tokens defined in `app/tokens.css` and surfaced through `tailwind.config.ts`. Prefer the semantic classes (`text-state-error`, `bg-brand-azul`, `border-tier-ouro`) over raw colors. See `docs/brand/02-colors.md` for the canonical palette and `docs/brand/` for typography, components, and voice guidelines.

## Branch conventions

There is no `CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md`, or `.github/workflows/` directory in this repository, so no branch naming policy is formally documented. The repo uses a single default branch; coordinate via commits and code review.

In practice:

- Work directly on the default branch for small changes.
- Use short-lived feature branches for non-trivial work and merge once CI passes.
- Keep commit messages descriptive (imperative present tense: "add checkin admin queue", "fix ranking tie-break").

## PR process

The repository does not yet define a `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/`, or `CONTRIBUTING.md`. Until those exist, follow these baseline practices when opening a PR or merge:

- **Run the local checks** before requesting review:

  ```bash
  pnpm typecheck && pnpm lint && pnpm test
  ```

- **Keep PRs focused** — one feature, fix, or refactor per PR. Split unrelated cleanups into follow-ups.

- **Update docs in the same PR.** If you change an env var, add a server action, add a Supabase table, modify a UI primitive, or change the deploy flow, update the relevant doc under `docs/` (`CONFIGURATION.md`, `ARCHITECTURE.md`, `API.md`, `DEPLOYMENT.md`) or `docs/brand/` in the same PR.

- **Migrations go in `supabase/migrations/`** with the next sequential number (current files run `0001` through `0011`). Add a new numbered SQL file; never edit a committed migration — create a follow-up instead.

- **Add tests** for any new logic in `lib/`, server actions, or components (see [TESTING.md](./TESTING.md) for conventions).

- **Server-only safety.** Anything that touches the service-role Supabase client or the cron secret must `import 'server-only'` and live under `lib/` (not in `components/`).

- **No secrets in commits.** `.env`, `.env.local`, `.dev.vars`, and any `*.pem` or credential files must never be staged. The `.gitignore` already excludes `.env*`, `.dev.vars*`, and `*.pem`.

- **Reviewer focus areas:** RLS implications of any new table, Zod validation on every server action entry point, `revalidatePath()` calls after mutations, and the sync cron (`/api/sync` + `cloudflare/worker.mjs`) when changing ingestion paths.

## Issue reporting

No `.github/ISSUE_TEMPLATE/` is present in the repository. Until one is added, file issues through your usual channel and include:

- **Steps to reproduce** the bug or the user story for the feature.
- **Expected vs. actual behavior.**
- **Environment:** Node version, pnpm version, Supabase CLI version, whether you are using local Docker Supabase or a hosted project, Cloudflare preview vs. local `pnpm dev`.
- **Logs:** `pnpm dev` output, browser console, or Wrangler/Cloudflare logs (if reproducing in the Worker).
- **Screenshots or screen recordings** for UI issues (timeline, ranking, admin dashboards).
- **Database state** when relevant — the affected table, the row you expected, and what you observed. Migrations that may be missing locally.

For security issues, do **not** open a public issue — report privately to the maintainers so RLS, auth, and the cron secret can be patched before disclosure.