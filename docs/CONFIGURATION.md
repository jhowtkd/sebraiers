<!-- generated-by: gsd-doc-writer -->

# Configuration

This document describes environment variables, Cloudflare Worker bindings, and configuration files for SEBRAEIERS.

## Environment variables

Copy `.env.example` to `.env.local` for local development. Next.js loads `.env.local` automatically and never commits it (see `.gitignore`). Production secrets are configured on the Cloudflare Worker via `wrangler secret put` or the dashboard.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | — | Supabase project URL. Used by browser client (`lib/supabase/client.ts`), server client (`lib/supabase/server.ts`), middleware (`middleware.ts`), and admin client (`lib/supabase/admin.ts`). Found in Supabase → Settings → API → Project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | — | Supabase anonymous (public) API key. Safe to expose to the browser. Found in Supabase → Settings → API → Project API keys. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** (server) | — | Supabase service role key. **Server-only** — used by `getAdminClient()` in `lib/supabase/admin.ts` for privileged operations (sheet sync, admin actions). Never expose to the client. |
| `SHEET_ID` | **Yes** (sync) | — | Google Spreadsheet ID from the sheet URL (`docs.google.com/spreadsheets/d/{ID}/edit`). Required for any sheet sync (cron or manual). |
| `SHEET_GID` | Optional | `0` | Google Sheet tab GID. `0` is the first tab. |
| `SHEET_COL_MAP` | Optional | Built-in alias map (see [Defaults](#defaults)) | Override column header mapping. Format: `canonical=SheetHeader,canonical=SheetHeader` (comma-separated `key=value` pairs). Parsed by `parseColMap()` in `lib/sync/sheets.ts`. |
| `CRON_SECRET` | **Yes** (cron sync) | — | Shared secret for `/api/sync`. Accepted via `x-cron-secret` header or `Authorization: Bearer <secret>`. Verified by `verifyCronSecret()` in `lib/sync/execute-sheet-sync.ts`. Generate with `openssl rand -hex 32`. |
| `NEXT_PUBLIC_APP_URL` | Optional | `http://localhost:3000` (in `.env.example`) | Documented in `.env.example` for deployment reference. Not currently read by application code. |
| `NEXT_PUBLIC_APP_NAME` | Optional | `SEBRAEIERS` (in `.env.example`) | Documented in `.env.example`. App title is hardcoded in `app/layout.tsx` metadata; this variable is not read by application code. |

### Supabase

All three Supabase variables are required for the app to function. Without `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, auth middleware and client components cannot connect. Without `SUPABASE_SERVICE_ROLE_KEY`, server-side admin operations and automated sheet sync fail when `getAdminClient()` is called.

### Google Sheets sync

Sync requires `SHEET_ID` at minimum. Automated sync (Cloudflare cron `POST /api/sync` or HTTP scheduler `GET /api/sync`) additionally requires `CRON_SECRET`. The sheet must be publicly readable (export or publish-to-web) for the sync fetch in `lib/sync/sheets.ts` to succeed.

The cron author (`created_by` for imported posts) is resolved at runtime by the `get_oldest_agency_admin_profile_id()` SQL function (`supabase/migrations/0009_agency_admin_domain.sql`) — it returns the oldest active admin whose email matches `@conteudoedu.com.br`. No env var is required; the cron handler fails with `500` (`no agency admin found`) if no matching admin exists.

### Admin bootstrap

Admin promotion is handled by the database trigger `handle_new_user` (see `supabase/migrations/0009_agency_admin_domain.sql` and `supabase/migrations/0010_security_sync_hardening.sql`), not by an env var. A user is auto-promoted to `is_admin=true` when any of these are true at signup:

- The email ends with `@conteudoedu.com.br` (function `public.is_agency_admin_email`).
- The email appears in `public.admin_whitelist`.

The legacy `admin_email_hint` flow was removed in migration `0010_security_sync_hardening.sql` because the client could forge it. If no matching admin exists, `/admin` access must be granted manually via `public.admin_whitelist` or by updating `profiles.is_admin` directly in the database.

## Config file format

### `wrangler.jsonc`

Cloudflare Workers configuration for OpenNext deployment. Key sections:

```jsonc
{
  "main": "cloudflare/worker.mjs",
  "name": "sebraiers",
  "compatibility_date": "2026-06-22",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
  "services": [{ "binding": "WORKER_SELF_REFERENCE", "service": "sebraiers" }],
  "r2_buckets": [{
    "binding": "NEXT_INC_CACHE_R2_BUCKET",
    "bucket_name": "sebraiers-opennext-cache"
  }],
  "images": { "binding": "IMAGES" },
  "triggers": { "crons": ["0 */6 * * *"] },
  "observability": { "enabled": true }
}
```

| Key | Purpose |
|-----|---------|
| `main` | Worker entry point (`cloudflare/worker.mjs`) — wraps OpenNext and adds scheduled sync |
| `assets` | Static assets from OpenNext build, bound as `ASSETS` |
| `services` | Self-reference binding `WORKER_SELF_REFERENCE` so the cron handler can call `/api/sync` internally |
| `r2_buckets` | R2 bucket `sebraiers-opennext-cache` for Next.js incremental cache (`NEXT_INC_CACHE_R2_BUCKET`) |
| `images` | Cloudflare Images binding |
| `triggers.crons` | Runs sheet sync every 6 hours (`0 */6 * * *`) |
| `observability` | Enables Cloudflare Workers observability |

The R2 bucket name `sebraiers-opennext-cache` must exist in your Cloudflare account before the first deploy. Create it in the Cloudflare dashboard under **R2 → Create bucket** (any region is fine for this cache use case). See [DEPLOYMENT.md](./DEPLOYMENT.md#pre-deploy-checklist) for the full pre-deploy checklist.

### `open-next.config.ts`

Configures OpenNext for Cloudflare with R2-backed incremental cache:

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
```

### `next.config.mjs`

Standard Next.js config (React strict mode, image remote patterns for Supabase and Unsplash). No `initOpenNextCloudflareForDev()` call: the file is a plain Next config with no OpenNext dev shim. Local Cloudflare-compatible development is handled by `pnpm preview`, which runs Wrangler against the OpenNext build (see [Local Cloudflare preview](#local-cloudflare-preview-pnpm-preview)). `experimental.typedRoutes` is `false`; `optimizePackageImports` covers `lucide-react` and `@icons-pack/react-simple-icons`.

### `tsconfig.json`

TypeScript compiler options for the app: `target: ES2022`, `strict: true`, `moduleResolution: bundler`, `jsx: preserve`, and the `@/*` path alias mapped to the project root. Plugins include the Next.js type plugin. `next-env.d.ts` and `.next/types/**/*.ts` are included automatically.

### `tailwind.config.ts`

Defines the design tokens consumed by Tailwind classes throughout the app. Notable sections:

- `content` — scans `./app/**`, `./components/**`, `./lib/**` for class names.
- `theme.extend.colors` — brand palette (`brand-azul`, `brand-atlantico`, `brand-ceu`, …), tier colors (`tier-bronze`, `tier-prata`, `tier-ouro`, `tier-platina`, `tier-diamante`), gamification palette (`begonia`, `manaca`, `jacaranda`, …), semantic state colors (`state-success`, `state-error`, `state-warning`, `state-info`, `state-neutral`), surface colors, text and border tokens. See `docs/brand/02-colors.md` for the canonical brand definitions.
- `theme.extend.fontFamily` — sans (Figtree, Inter, system fallbacks) and mono (JetBrains Mono, system fallbacks).
- `theme.extend.fontSize` — display, h1–h4, body, body-lg, body-sm, caption, overline, plus gamification point sizes (`points`, `points-hero`, `rank`).
- `theme.extend.borderRadius` — `sm`, `md`, `lg`, `xl`, `2xl`.
- `theme.extend.boxShadow` — `xs`/`sm`/`md`/`lg`/`xl` ramps plus `focus` and `focus-error` rings.
- `theme.extend.keyframes` and `theme.extend.animation` — `shimmer`, `fade-in`, `slide-up`.

### `postcss.config.mjs`

Standard PostCSS pipeline: `tailwindcss` followed by `autoprefixer`.

### `.eslintrc.json`

Extends `next/core-web-vitals` and `next/typescript`. Run with `pnpm lint`.

### `vitest.config.ts`

Vitest setup: `environment: happy-dom`, `setupFiles: ['./tests/setup.ts']`, `globals: true`. Resolves `@` to the project root and aliases `server-only` to the test mock in `tests/__mocks__/server-only.ts`. `esbuild.jsx: 'automatic'` enables JSX in test files.

### `public/_headers`

Sets long-lived cache headers for `/_next/static/*` assets when served via Cloudflare static assets:

```
/_next/static/*
  Cache-Control: public,max-age=31536000,immutable
```

### `.gitignore` (relevant entries)

- `.env`, `.env*.local`, `.dev.vars*` — secrets never committed; `.env.example` and `.dev.vars.example` are explicitly un-ignored.
- `.open-next/`, `.wrangler/`, `.next/`, `build/`, `out/` — build artifacts and Wrangler local state.
- `coverage/` — test coverage output.
- `supabase/.branches/`, `supabase/.temp/` — Supabase local state.

## Required vs optional settings

### Startup and core app

| Setting | Failure mode if missing |
|---------|-------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Runtime errors in middleware, Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client and automated sync fail at call time |

### Sheet sync (`/api/sync`)

| Setting | Failure mode if missing |
|---------|-------------------------|
| `CRON_SECRET` | `500` — `{ "error": "CRON_SECRET not configured" }` |
| Invalid/missing auth header | `401` — `{ "error": "Unauthorized" }` |
| `SHEET_ID` | `500` — `{ "error": "SHEET_ID not configured" }` |
| No agency admin (`@conteudoedu.com.br`) in `profiles` | `500` — `{ "error": "no agency admin found" }` |

### Cloudflare cron (`cloudflare/worker.mjs`)

If `CRON_SECRET` is not set on the Worker environment, the scheduled handler logs `[cron] CRON_SECRET not configured` and exits without syncing. If the cron schedule in `wrangler.jsonc` and the `SYNC_CRON` constant in `cloudflare/worker.mjs` diverge, the handler silently returns early (`controller.cron !== SYNC_CRON`).

### Admin routes

`/admin` access is gated in `middleware.ts` by `user.app_metadata?.is_admin === true` (synced from `profiles.is_admin` by the `handle_new_user` trigger). Promotion depends on the database rules in [Admin bootstrap](#admin-bootstrap); no env var is consulted.

## Defaults

| Variable | Default | Where set |
|----------|---------|-----------|
| `SHEET_GID` | `0` | `lib/sync/execute-sheet-sync.ts`, `app/actions/sync.ts` — `process.env.SHEET_GID ?? '0'` |
| `SHEET_COL_MAP` | Built-in alias map | `lib/sync/sheets.ts` — `DEFAULT_COL_MAP` |

When `SHEET_COL_MAP` is unset, `parseColMap()` returns `undefined` and sync uses the built-in aliases:

| Canonical field | Recognized sheet headers (aliases) |
|-----------------|-----------------------------------|
| `link_post` | `link_post`, `url`, `link` |
| `data_publicacao` | `data_publicacao`, `data`, `date` |
| `titulo` | `titulo`, `title` |
| `descricao` | `descricao`, `description` |
| `rede` | `rede`, `network` |
| `thumbnail` | `thumbnail`, `cover_url`, `imagem` |

Example override in `.env.local`:

```bash
SHEET_COL_MAP=link_post=Link,data_publicacao=Data,titulo=Título da Publicação,rede=Rede/Formato
```

## Per-environment overrides

### Local development (Next.js)

1. Copy `.env.example` → `.env.local`.
2. Fill in Supabase keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) and `SHEET_ID`/`CRON_SECRET` if you intend to test sync.
3. Run `pnpm dev` — Next.js loads `.env.local` automatically.

For sync testing locally:

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "x-cron-secret: $CRON_SECRET"
```

The same route accepts `GET` with `Authorization: Bearer $CRON_SECRET` for HTTP-based schedulers.

### Local Cloudflare preview (`pnpm preview`)

Uses Wrangler with the OpenNext build. Environment variables for the Worker can be provided via `.dev.vars` (gitignored; no `.dev.vars.example` is committed — the `.gitignore` allows one with `!.dev.vars.example`). Same variable names as `.env.example` apply.

### Production (Cloudflare Workers)

Deploy with `pnpm deploy` (runs `opennextjs-cloudflare build` then `opennextjs-cloudflare deploy`).

Set secrets on the Worker via Wrangler:

```bash
wrangler secret put CRON_SECRET
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put NEXT_PUBLIC_SUPABASE_URL
wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
wrangler secret put SHEET_ID
```

`NEXT_PUBLIC_*` variables must be available at build time for client bundles and at runtime on the Worker. Configure them through your OpenNext deploy workflow or as plaintext (non-secret) vars in `wrangler.jsonc` if preferred.

The scheduled cron (`0 */6 * * *`) is defined in both `wrangler.jsonc` (`triggers.crons`) and `cloudflare/worker.mjs` (`SYNC_CRON` constant — must stay in sync). The worker POSTs to `/api/sync` with the `x-cron-secret` header against the self-reference binding `WORKER_SELF_REFERENCE`.

### Supabase local

`supabase/` holds migrations and local Supabase config. Local Supabase URL and keys differ from production; use the values printed by `pnpm dlx supabase start` in `.env.local` when developing against a local instance.