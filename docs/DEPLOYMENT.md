<!-- generated-by: gsd-doc-writer -->

# Deployment

This document describes how SEBRAEIERS is built, deployed, and operated in production. The primary deployment target is **Cloudflare Workers** via [@opennextjs/cloudflare](https://opennext.js.org/cloudflare), with Supabase as the external database and auth backend.

## Deployment targets

| Target | Config file(s) | Notes |
|--------|----------------|-------|
| **Cloudflare Workers** (primary) | `wrangler.jsonc`, `open-next.config.ts`, `cloudflare/worker.mjs` | Next.js 15 App Router adapted by OpenNext; static assets served from `.open-next/assets` |
| **Supabase** (external) | `supabase/` migrations | Postgres, Auth, Storage, and RLS — hosted separately; not deployed by this repo's scripts |
| **R2** (Cloudflare) | `wrangler.jsonc` → `r2_buckets` | Bucket `sebraiers-opennext-cache` for Next.js incremental cache (`NEXT_INC_CACHE_R2_BUCKET`) |

No `Dockerfile`, `vercel.json`, `netlify.toml`, `fly.toml`, `railway.json`, or `serverless.yml` are present in the repository. The `/api/sync` route also supports `GET` with `Authorization: Bearer <CRON_SECRET>` for HTTP-based schedulers, but production cron is implemented via Cloudflare Workers triggers.

### Cloudflare Worker architecture

The Worker entry point (`cloudflare/worker.mjs`) wraps the OpenNext-generated worker and adds a `scheduled` handler for Google Sheets sync:

- **Fetch handler** — delegates to OpenNext for all HTTP traffic (pages, API routes, static assets).
- **Scheduled handler** — runs on cron `0 */6 * * *` (every 6 hours), POSTs to `/api/sync` via the `WORKER_SELF_REFERENCE` service binding with the `x-cron-secret` header.

Key bindings from `wrangler.jsonc`:

| Binding | Type | Purpose |
|---------|------|---------|
| `ASSETS` | Static assets | Serves `.open-next/assets` (uses `public/_headers` cache rules for `/_next/static/*`) |
| `WORKER_SELF_REFERENCE` | Service | Self-reference so the cron handler can call `/api/sync` internally |
| `NEXT_INC_CACHE_R2_BUCKET` | R2 | Incremental cache for ISR/revalidation (`open-next.config.ts`) |
| `IMAGES` | Images | Cloudflare Images binding for Next.js image optimization |

Worker name: `sebraiers`. Compatibility date: `2026-06-22` with the `nodejs_compat` flag. Observability is enabled.

## Build pipeline

CI runs on every PR and push to `main` via `.github/workflows/ci.yml` (typecheck, lint, test). **Deploys** to Cloudflare are still manual from a developer machine or admin workstation — there is no automated deploy workflow yet.

### Manual deploy (production)

From the project root, with [Wrangler](https://developers.cloudflare.com/workers/wrangler/) authenticated (`wrangler login`):

```bash
pnpm install
pnpm deploy
```

`pnpm deploy` runs:

1. `opennextjs-cloudflare build` — builds Next.js (`next build`) and packages the app for Cloudflare Workers into `.open-next/`.
2. `opennextjs-cloudflare deploy` — deploys the Worker and assets to Cloudflare using `wrangler.jsonc`.

### Other deploy scripts

| Command | Description |
|---------|-------------|
| `pnpm preview` | Build OpenNext artifact and run locally via Wrangler (`opennextjs-cloudflare preview`) |
| `pnpm upload` | Build and upload without promoting to production (`opennextjs-cloudflare upload`) — useful for staging or versioned uploads |
| `pnpm build` | Standard Next.js production build only (does not produce the Cloudflare Worker artifact) |
| `pnpm cf-typegen` | Generate `cloudflare-env.d.ts` TypeScript types from Wrangler bindings |

### Pre-deploy checklist

1. **R2 bucket** — Create `sebraiers-opennext-cache` in your Cloudflare account (any region) before the first deploy.
2. **Worker secrets** — Set all required environment variables (see [Environment setup](#environment-setup)).
3. **Supabase** — Apply migrations (`supabase db push` or dashboard) and configure Auth redirect URLs for the production domain (`https://sebraiers.jhonatansoares.com`).
4. **Cron constant sync** — If you change the cron schedule in `wrangler.jsonc`, update the `SYNC_CRON` constant in `cloudflare/worker.mjs` to match exactly. The two values must agree or the cron handler will silently skip.

## Environment setup

For the full variable reference (names, defaults, validation errors), see [CONFIGURATION.md](./CONFIGURATION.md).

### Required for core app

| Variable | How to set on Cloudflare |
|----------|--------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Worker secret or dashboard env var (also needed at build time for client bundles) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Worker secret (`wrangler secret put`) — never expose to client |

### Required for automated sheet sync (cron)

| Variable | How to set on Cloudflare |
|----------|--------------------------|
| `CRON_SECRET` | Worker secret — generate with `openssl rand -hex 32` |
| `SHEET_ID` | Worker secret or env var |
| `SYNC_AUTHOR_PROFILE_ID` | Worker secret or env var |

### Optional

| Variable | Notes |
|----------|-------|
| `ADMIN_EMAILS` | Comma-separated admin bootstrap emails (deprecated in favor of DB-driven `admin_whitelist` — see CONFIGURATION.md) |
| `SHEET_GID` | Defaults to `0` |
| `SHEET_COL_MAP` | Custom column header mapping |
| `NEXT_PUBLIC_APP_URL` | Documented in `.env.example`; not read by app code today |

### Setting secrets via Wrangler CLI

```bash
wrangler secret put CRON_SECRET
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put SHEET_ID
wrangler secret put SYNC_AUTHOR_PROFILE_ID
# Repeat for other non-public variables as needed
```

`NEXT_PUBLIC_*` variables must be available at **build time** (embedded in client bundles) and at **runtime** on the Worker. Configure them in the Cloudflare dashboard or your deploy environment according to the OpenNext Cloudflare workflow.

### Local Cloudflare preview

For local Worker preview with real bindings:

1. Copy `.env.example` → `.dev.vars` (gitignored) with the same variable names.
2. Run `pnpm preview`.

## Rollback procedure

No automated rollback is defined in the repository. Use one of these approaches:

### Cloudflare dashboard

1. Open the Cloudflare dashboard → **Workers & Pages** → worker `sebraiers`.
2. Go to **Deployments** (or **Versions**).
3. Select a previous successful deployment and **Rollback** or redeploy that version.

### Wrangler CLI

1. List recent deployments: `wrangler deployments list`
2. Roll back to a specific deployment ID: `wrangler rollback <deployment-id>`

### Redeploy from git

1. Check out the last known-good commit: `git checkout <commit-sha>`
2. Run `pnpm deploy` from that commit.

After rollback, verify the app loads, auth works against Supabase, and cron logs show successful sync (or trigger a manual sync — see below).

### Manual sync after rollback

```bash
curl -X POST https://sebraiers.jhonatansoares.com/api/sync \
  -H "x-cron-secret: $CRON_SECRET"
```

## Monitoring

### Cloudflare Workers observability

`wrangler.jsonc` enables Workers observability:

```jsonc
"observability": {
  "enabled": true
}
```

Use the Cloudflare dashboard → **Workers & Pages** → `sebraiers` → **Logs** / **Analytics** to inspect requests, errors, and cron invocations.

### Application logging

The cron handler in `cloudflare/worker.mjs` writes structured messages to Worker logs:

- `[cron] CRON_SECRET not configured` — secret missing on the Worker environment
- `[cron] Sync failed (<status>): <body>` — `/api/sync` returned a non-OK response
- `[cron] Sync completed: <body>` — successful sync with JSON summary
- `[cron] Sync request failed: <error>` — network/exception when calling `/api/sync`

### External services

| Service | What to monitor |
|---------|-----------------|
| **Supabase** | Database health, Auth errors, Storage usage, RLS policy failures — via Supabase dashboard |
| **Google Sheets** | Sheet must remain publicly readable for CSV export; sync failures surface in Worker logs and `/api/sync` responses |
| **R2** | Cache bucket size and request metrics for `sebraiers-opennext-cache` — via Cloudflare dashboard |

### Error tracking

No application-level error tracking SDK (Sentry, Datadog, New Relic, OpenTelemetry) is configured in `package.json` dependencies. Production error visibility relies on Cloudflare Worker logs and the Supabase dashboard.

### Cron schedule

Production sheet sync runs automatically every 6 hours (`0 */6 * * *` UTC). To confirm cron execution, check Worker logs around those times or call `/api/sync` manually with a valid `x-cron-secret` header.

## Related documentation

- [CONFIGURATION.md](./CONFIGURATION.md) — environment variables, bindings, and defaults
- [ARCHITECTURE.md](./ARCHITECTURE.md) — system overview and sync data flow
- [README.md](../README.md) — install, quick start, and deploy command summary