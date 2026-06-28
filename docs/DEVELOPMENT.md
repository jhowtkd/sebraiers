<!-- generated-by: gsd-doc-writer -->

# Development

Guide for setting up and working on SEBRAEIERS locally. For environment variable details, see [CONFIGURATION.md](./CONFIGURATION.md). For system design, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Local setup

1. **Fork and clone** the repository:

   ```bash
   git clone https://github.com/jhowtkd/sebraiers.git
   cd sebraiers
   ```

2. **Install dependencies** with pnpm (lockfile: `pnpm-lock.yaml`):

   ```bash
   pnpm install
   ```

3. **Configure environment variables** — copy the example file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   At minimum, set the Supabase variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Add your email to `ADMIN_EMAILS` to bootstrap the first admin account. See [CONFIGURATION.md](./CONFIGURATION.md) for the full variable reference.

4. **Start Supabase locally** and apply migrations:

   ```bash
   pnpm dlx supabase start
   pnpm dlx supabase db reset
   ```

   Migration files live in `supabase/migrations/`. Seed data is in `supabase/seed.sql` and `supabase/seed-demo.sql`.

5. **Run the dev server**:

   ```bash
   pnpm dev
   ```

   Open http://localhost:3000. Authenticated users are routed to `/timeline`; unauthenticated visitors are redirected to `/login`.

6. **Create your first admin** — with your email in `ADMIN_EMAILS`, sign up at `/signup`. Server-side provisioning sets `is_admin=true` automatically.

### Cloudflare preview (optional)

To test the OpenNext + Cloudflare Workers build locally:

```bash
pnpm preview
```

Configure Worker secrets (Supabase keys, `CRON_SECRET`, etc.) via the Cloudflare dashboard or `wrangler secret put`. See [CONFIGURATION.md](./CONFIGURATION.md) for `wrangler.jsonc` bindings.

## Build commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the Next.js development server on port 3000 |
| `pnpm build` | Production build via `next build` |
| `pnpm start` | Serve the production build locally |
| `pnpm lint` | Run ESLint via `next lint` |
| `pnpm typecheck` | Type-check the project with `tsc --noEmit` (strict mode) |
| `pnpm test` | Run the Vitest suite once (`vitest run`) |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm test:ui` | Open the Vitest UI |
| `pnpm preview` | Build with OpenNext and preview on Cloudflare Workers locally |
| `pnpm deploy` | Build with OpenNext and deploy to Cloudflare Workers |
| `pnpm upload` | Build with OpenNext and upload assets to Cloudflare |
| `pnpm cf-typegen` | Generate Cloudflare environment types into `cloudflare-env.d.ts` |

## Code style

**ESLint** — configured in `.eslintrc.json`, extending `next/core-web-vitals` and `next/typescript`. Run with:

```bash
pnpm lint
```

**TypeScript** — strict mode enabled in `tsconfig.json` (`"strict": true`). Path alias `@/*` maps to the project root. Run type checking with:

```bash
pnpm typecheck
```

**Tailwind CSS** — utility classes via Tailwind 3.4. Configuration in `tailwind.config.ts` and `postcss.config.mjs`.

No Prettier, Biome, or `.editorconfig` is configured in this repository.

## Branch conventions

Default branch: `main`.

No branch naming convention is documented in the repository (no `CONTRIBUTING.md` or pull request template). Use descriptive branch names (for example, `feat/timeline-filters`, `fix/sync-timeout`).

## PR process

No `.github/` workflows or pull request templates are present in the repository. When submitting changes:

- Branch from `main` and open a pull request against `main`
- Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` before requesting review
- Run `pnpm build` if your changes affect routing, server actions, or the Cloudflare deployment path
- Describe what changed and how to verify it (steps to reproduce, screenshots for UI changes)
- Keep commits focused; reference related issues when applicable
