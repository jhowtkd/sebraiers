<!-- generated-by: gsd-doc-writer -->

# Configuration

This document describes environment variables, Cloudflare Worker bindings, and configuration files for SEBRAEIERS.

## Environment variables

Copy `.env.example` to `.env.local` for local development. Next.js loads `.env.local` automatically and never commits it (see `.gitignore`).

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | — | Supabase project URL. Used by browser client, server client, middleware, and admin client. Found in Supabase → Settings → API → Project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | — | Supabase anonymous (public) API key. Safe to expose to the browser. Found in Supabase → Settings → API → Project API keys. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** (server) | — | Supabase service role key. **Server-only** — used by `getAdminClient()` for privileged operations (sheet sync, admin actions). Never expose to the client. |
| `ADMIN_EMAILS` | Optional | `""` (empty) | Comma-separated list of emails that receive admin privileges on signup. Checked server-side in `signUpAction` via `isAdminEmail()`; matching emails get `admin_email_hint` in signup metadata. Also used by middleware to gate `/admin` routes. |
| `NEXT_PUBLIC_APP_URL` | Optional | `http://localhost:3000` (in `.env.example`) | Documented in `.env.example` for deployment reference. Not currently read by application code. |
| `NEXT_PUBLIC_APP_NAME` | Optional | `SEBRAEIERS` (in `.env.example`) | Documented in `.env.example`. App title is hardcoded in `app/layout.tsx` metadata; this variable is not read by application code. |
| `SHEET_ID` | **Yes** (sync) | — | Google Spreadsheet ID from the sheet URL (`docs.google.com/spreadsheets/d/{ID}/edit`). Required when running sheet sync (cron or manual). |
| `SHEET_GID` | Optional | `0` | Google Sheet tab GID. `0` is the first tab. |
| `SHEET_COL_MAP` | Optional | Built-in alias map (see [Defaults](#defaults)) | Override column header mapping. Format: `canonical=SheetHeader,canonical=SheetHeader` (comma-separated `key=value` pairs). Parsed by `parseColMap()` in `lib/sync/sheets.ts`. |
| `CRON_SECRET` | **Yes** (cron sync) | — | Shared secret for `/api/sync`. Accepted via `x-cron-secret` header or `Authorization: Bearer <secret>`. Generate with `openssl rand -hex 32`. |
| `SYNC_AUTHOR_PROFILE_ID` | **Yes** (automated cron) | — | UUID of the institutional profile used as `created_by` for posts imported by the scheduled cron (no real user session). Create a system user in Supabase Auth and copy the UUID. Not required for manual admin sync via the admin UI (`runSyncAction` uses the logged-in admin's profile). |

### Supabase

All three Supabase variables are required for the app to function. Without `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, auth middleware and client components cannot connect. Without `SUPABASE_SERVICE_ROLE_KEY`, server-side admin operations and automated sheet sync fail when `getAdminClient()` is called.

### Admin bootstrap

`ADMIN_EMAILS` is optional but recommended for bootstrapping the first admins. When a user signs up with an email in this list, the server action passes `admin_email_hint` to Supabase; a database trigger promotes the profile to admin. You can also add emails to `public.admin_whitelist` in Supabase as a fallback.

### Google Sheets sync

Sync requires `SHEET_ID` at minimum. Automated sync (Cloudflare cron or `POST/GET /api/sync`) additionally requires `CRON_SECRET` and `SYNC_AUTHOR_PROFILE_ID`. The sheet must be publicly readable (export or publish-to-web) for the sync fetch to succeed.

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

The R2 bucket name `sebraiers-opennext-cache` must exist in your Cloudflare account before deploy. <!-- VERIFY: R2 bucket region and creation steps in Cloudflare dashboard -->

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

Standard Next.js config (React strict mode, image remote patterns for Supabase and Unsplash). Calls `initOpenNextCloudflareForDev()` for local Cloudflare-compatible development.

### `public/_headers`

Sets long-lived cache headers for `/_next/static/*` assets when served via Cloudflare static assets.

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
| `SYNC_AUTHOR_PROFILE_ID` | `500` — `{ "error": "SYNC_AUTHOR_PROFILE_ID not configured" }` (cron path only) |

### Cloudflare cron (`cloudflare/worker.mjs`)

If `CRON_SECRET` is not set on the Worker environment, the scheduled handler logs `[cron] CRON_SECRET not configured` and exits without syncing.

### Admin routes

If `ADMIN_EMAILS` is empty, `/admin` access depends on `user.app_metadata.is_admin` or the `admin_whitelist` database table — env-based admin gating in middleware will not match any email.

## Defaults

| Variable | Default | Where set |
|----------|---------|-----------|
| `SHEET_GID` | `0` | `lib/sync/execute-sheet-sync.ts`, `app/actions/sync.ts` |
| `ADMIN_EMAILS` | `""` (empty list) | `lib/auth.ts`, `middleware.ts` — `process.env.ADMIN_EMAILS ?? ''` |
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

1. Copy `.env.example` → `.env.local`
2. Fill in Supabase keys and `ADMIN_EMAILS`
3. Run `pnpm dev` — Next.js loads `.env.local` automatically

For sync testing locally:

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "x-cron-secret: $CRON_SECRET"
```

### Local Cloudflare preview (`pnpm preview`)

Uses Wrangler with the OpenNext build. Environment variables for the Worker can be provided via `.dev.vars` (gitignored; no `.dev.vars.example` is committed). Same variable names as `.env.example` apply.

### Production (Cloudflare Workers)

Deploy with `pnpm deploy` (runs `opennextjs-cloudflare build` then `opennextjs-cloudflare deploy`).

Set secrets on the Worker via the Cloudflare dashboard or CLI:

```bash
wrangler secret put CRON_SECRET
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put NEXT_PUBLIC_SUPABASE_URL
wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
# ... repeat for SHEET_ID, SYNC_AUTHOR_PROFILE_ID, ADMIN_EMAILS, etc.
```

`NEXT_PUBLIC_*` variables must be available at build time for client bundles and at runtime on the Worker. Configure them in Cloudflare according to your OpenNext deploy workflow.

The scheduled cron (`0 */6 * * *`) is defined in both `wrangler.jsonc` and `cloudflare/worker.mjs` (`SYNC_CRON` constant — must stay in sync). The worker POSTs to `/api/sync` with the `x-cron-secret` header.

### Vercel (alternative)

The `/api/sync` route also supports `GET` with `Authorization: Bearer <CRON_SECRET>` for HTTP-based schedulers such as Vercel Cron. <!-- VERIFY: whether production is deployed on Vercel or Cloudflare only -->

### Supabase local

`supabase/` holds migrations and local Supabase config. Local Supabase URL and keys differ from production; use the values printed by `pnpm dlx supabase start` in `.env.local` when developing against a local instance.
