<!-- generated-by: gsd-doc-writer -->

# Architecture

## System Overview

SEBRAEIERS is an internal gamification platform for SEBRAE Goiás employees, built to drive engagement with the institution's official social media accounts. Authenticated users browse a curated timeline of published posts across seven networks (Instagram, LinkedIn, Facebook, TikTok, YouTube, Threads, X), declare that they have liked / commented on / shared a given post, and earn points that feed a public ranking. Administrators curate the content, moderate declared check-ins, and manage the user base.

The application is a single-tenant Next.js 15 App Router project deployed to Cloudflare Workers via `@opennextjs/cloudflare`. Supabase provides the entire data plane (Postgres for state, Auth for identity, Storage for post covers, Realtime optional). A scheduled cron worker calls an internal HTTP endpoint every six hours to ingest posts from a Google Sheets source-of-truth, ensuring the timeline stays in sync with what the marketing team publishes externally.

## Component Diagram

```mermaid
graph TD
  Browser[Browser] --> MW[middleware.ts<br/>auth + admin gate]
  MW -->|public| Auth[app/(auth)/login · signup]
  MW -->|private| App[app/(app)/timeline · post · ranking · meu-desempenho]
  MW -->|admin| Admin[app/(admin)/admin/*]
  MW -->|/api/sync| APIRoute[app/api/sync/route.ts<br/>CRON_SECRET check]

  App --> SA[app/actions/*<br/>server actions]
  Admin --> SA
  SA --> SC[lib/supabase/server.ts<br/>anon client + cookies]
  SA --> AC[lib/supabase/admin.ts<br/>service_role client]
  SA --> Val[lib/validation.ts<br/>Zod schemas]

  App --> Q[lib/queries/*<br/>RSC data fetch]
  Q --> SC
  Q --> AC

  Admin --> MetricsQ[lib/queries/metrics.ts]
  MetricsQ --> RPC[(Supabase RPC<br/>get_admin_checkin_stats)]
  Q --> View[(user_points view)]

  APIRoute --> Exec[lib/sync/execute-sheet-sync.ts]
  Exec --> AC
  Exec --> Runner[lib/sync/index.ts<br/>runSync]
  Runner --> Sheets[lib/sync/sheets.ts]
  Runner --> OG[lib/sync/og-image.ts]

  Cron[Cloudflare Cron<br/>0 */6 * * *] --> Worker[cloudflare/worker.mjs]
  Worker --> APIRoute
  SyncBtn[components/admin/sync-button.tsx] -->|manual trigger| SA
  SA --> Runner
```

**Relationships**

- Browser ↔ Next.js App Router (RSC + Server Actions, no client data fetching for primary flows)
- middleware.ts gates every non-public route on the `is_admin` claim synced from `auth.users.raw_app_meta_data`
- Server actions in `app/actions/*` are the single mutating surface; they validate with Zod (`lib/validation.ts`) before touching the DB
- The Cloudflare Worker (`cloudflare/worker.mjs`) is a thin wrapper around the OpenNext export that also schedules a cron calling `/api/sync`
- Storage bucket `post-covers` is exposed to authenticated reads and admin-only writes via RLS

## Data Flow

### 1. Authenticated request — read a timeline post

1. Browser navigates to `/timeline`.
2. `middleware.ts` resolves the Supabase session cookie, populates the response, and gates `/admin` on `user.app_metadata.is_admin === true`.
3. The Server Component `app/(app)/timeline/page.tsx` awaits `getTimeline()` from `lib/queries/posts.ts`.
4. `getTimeline()` calls `lib/supabase/server.ts`, which builds a cookie-bound Supabase server client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Supabase enforces RLS: any authenticated user reads `posts` where `is_active = true`; the join to `profiles` works because `profiles_select_all_authenticated` allows broad read.
6. The list is enriched server-side with `getPostsEngagementBatch()` (reactions + comment counts in a single batched IN-query).
7. Each `PostCard` is a server-rendered component; engagement controls hydrate through one client boundary (`PostCardInteractions`) that calls `ReactionBar` and renders the `EngageButton`.

### 2. Declare a check-in

1. User clicks *Curti / Comentei / Compartilhei* on the post detail page.
2. Client component `components/posts/checkin-buttons.tsx` invokes the server action `declareCheckinAction` from `app/actions/checkins.ts`.
3. The action parses `checkinDeclareSchema` (Zod), inserts into `public.checkins` with status `pending`, and triggers the DB-side `set_checkin_points()` trigger that computes `points` from the action type.
4. RLS policy `checkins_insert_self_pending` ensures the row references `auth.uid()` and a post that is still active.
5. `revalidatePath()` invalidates the post detail page and `meu-desempenho`.
6. An admin later approves it via `decideCheckinAction`, which calls the `decide_checkin` RPC for atomicity.

### 3. Approve / reject a check-in (admin only)

1. `decideCheckinAction` calls the SQL function `public.decide_checkin(p_checkin_id, p_decision, p_admin_id, p_note)`.
2. Migration `0010_security_sync_hardening.sql` made the RPC bind `p_admin_id := auth.uid()`, rejecting any caller impersonation.
3. The RPC: verifies caller is admin, transitions the checkin from `pending` to `approved|rejected`, inserts an audit row into `checkin_approvals`, and returns the updated checkin.
4. Re-decision is impossible because the `update … where status = 'pending'` clause short-circuits and the function raises `P0002`.

### 4. Sheet sync (manual or cron)

1. **Manual path (admin)**: `SyncButton` calls `runSyncAction` (server action); `app/actions/sync.ts` re-checks admin status, parses `SHEET_ID`/`SHEET_GID`/`SHEET_COL_MAP`, and calls `runSync()`.
2. **Cron path**: Cloudflare Worker `cloudflare/worker.mjs` receives the scheduled trigger, picks up `CRON_SECRET` from env, and `fetch`-es its own `https://sebraiers.internal/api/sync` endpoint using the `WORKER_SELF_REFERENCE` service binding.
3. `app/api/sync/route.ts` accepts both POST and GET; both validate the secret via `verifyCronSecret()` (header `x-cron-secret` or `Authorization: Bearer …`) and delegate to `executeSheetSync()`.
4. `executeSheetSync()` uses the service-role client to call `get_oldest_agency_admin_profile_id()` (so synced posts have a valid `created_by` regardless of which admin's account is currently active).
5. `runSync()` in `lib/sync/index.ts` orchestrates: fetch sheet CSV (tries `/export` then `/gviz/tq` as fallback) → parse columns → hash URL to produce `external_id` → skip stories → load existing posts → resolve missing covers via `fetchOgImage` (8-way concurrency) → upsert in chunks of 50.
6. Result summary (`created`, `updated`, `skipped_stories`, `errors`, `og_images_found`) is returned to the API as JSON and to the manual button as a toast.

### 5. Ranking computation

- Single source of truth: the SQL view `public.user_points`, aggregated from approved check-ins and joined with profile metadata.
- `lib/queries/ranking.ts` reads `user_points` via the service-role client and applies `sortRanking()` (deterministic tie-breaker by `last_approved_at` then `username`).

## Key Abstractions

| Concept | File | Purpose |
| --- | --- | --- |
| `Network` union | `lib/types.ts` | `'instagram' \| 'linkedin' \| 'facebook' \| 'tiktok' \| 'youtube' \| 'threads' \| 'x'` |
| `CheckinAction` union | `lib/types.ts` | `'like' \| 'comment' \| 'share'` mapping to `ACTION_POINTS = { 1, 2, 3 }` |
| `ACTION_LABELS` | `lib/types.ts` | PT-BR display strings; centralized for UI consistency |
| `Profile`, `Post`, `Checkin`, `UserPoint` | `lib/types.ts` | Shared DTOs between RSC, queries, and Server Components |
| `sortRanking` / `rankPosition` | `lib/ranking.ts` | Deterministic ordering by points, then recency, then username |
| `getSession`, `getCurrentProfile`, `requireUser`, `requireAdmin` | `lib/auth.ts` | RSC-safe, `cache()`-wrapped auth fetchers and gates |
| `AGENCY_ADMIN_EMAIL_DOMAIN = '@conteudoedu.com.br'` | `lib/auth.ts` | Auto-admin promotion rule mirrored from the DB trigger |
| Zod schemas | `lib/validation.ts` | All Server Action entry points parse input here (signup, login, post CRUD, check-in declare/decide, reactions, comments) |
| Supabase server / admin / browser clients | `lib/supabase/{server,admin,client}.ts` | Two server-safe clients (cookie anon, service_role) + one browser client |
| `cn`, `formatRelative`, `formatPoints`, `initials` | `lib/utils.ts` | Shared tailwind + i18n formatting helpers |
| `runSync` / `executeSheetSync` / `verifyCronSecret` | `lib/sync/*` | Orchestration of Google Sheets ingestion and cron auth |
| `mapWithConcurrency` / `chunkArray` | `lib/sync/concurrency.ts` | Bounded fan-out and batch utilities used by sync |
| `fetchOgImage` | `lib/sync/og-image.ts` | 5s-timeout `og:image` extractor with Twitter profile-image guard |
| `getTimeline`, `getPostEngagement`, `getMyCheckins*` | `lib/queries/posts.ts` · `lib/queries/checkins.ts` | RSC data fetchers with batched IN-query engagement prefetch |
| `getAdminMetrics` | `lib/queries/metrics.ts` | Aggregates via `get_admin_checkin_stats` RPC (one round-trip for totals + per-network breakdown) |

## Directory Layout Rationale

| Directory | Purpose |
| --- | --- |
| `app/` | App Router routes grouped by route groups: `(auth)` for public auth pages, `(onboarding)` for `/perfil`, `(app)` for authenticated user pages, `(admin)` for the gated admin area. `app/actions/` holds server-only mutations; `app/api/sync/` is the only App Router API route. |
| `lib/supabase/` | Three Supabase clients isolated by execution context (browser, server with cookies, server with service_role). The admin client enforces `autoRefreshToken: false, persistSession: false` since it must not interfere with the user's own session. |
| `lib/queries/` | RSC data fetchers (`'server-only'`). Encapsulate all read queries so each page calls one named function instead of inlining Supabase calls. |
| `lib/sync/` | The Sheets-to-posts ingestion pipeline, broken into composable pieces (sheets parser, OG fetcher, concurrency utilities, executor). Marked `'server-only'` because it imports `server-only`. |
| `components/` | View components grouped by feature (admin, forms, layout, posts, ranking, social) plus a `ui/` folder of primitives (Button, Card, Toast, Skeleton, etc.). Single client boundary per interactive region — e.g. `PostCardInteractions` isolates hydration to engagement controls. |
| `supabase/migrations/` | Numbered, ordered SQL migrations: schema and RLS bootstrap (`0001`), security hardening (`0002`, `0010`), atomic RPCs (`0003`, `0011`), engagement tables (`0005`), admin-read RLS adjustments (`0006`), external_id for sync (`0007`), `x` network enum extension (`0008`), agency-domain admin auto-promotion (`0009`). |
| `tests/` | Vitest suites grouped by target: `lib/{actions,auth,ranking,sync,utils}`, `components/`, plus `setup.ts` (mocks `react.cache` so RSC callers don't double-fetch in tests). |
| `cloudflare/worker.mjs` | The Cloudflare Worker entrypoint — imports the OpenNext build output and adds a `scheduled` handler that calls `/api/sync` via the `WORKER_SELF_REFERENCE` service binding. |
| `wrangler.jsonc` | Worker config: `nodejs_compat`, `ASSETS` directory (`.open-next/assets`), `NEXT_INC_CACHE_R2_BUCKET` named `sebraiers-opennext-cache`, `IMAGES` binding, cron `["0 */6 * * *"]`, observability enabled. |
| `open-next.config.ts` | OpenNext adapter config — installs the R2 incremental cache override. |
| `docs/` | Project docs; the design system lives under `docs/brand/`, historical artifacts under `docs/superpowers/`. |

## Security Boundaries

- **Edge layer**: `middleware.ts` redirects unauthenticated traffic to `/login` and admin paths to `/timeline` when `app_metadata.is_admin !== true`.
- **Database layer**: All public tables are RLS-enabled with policies that resolve `is_admin` against `profiles`. Storage bucket `post-covers` is public-readable but admin-only for write.
- **Trigger layer**: `protect_admin_fields` rejects self-update of `is_admin`/`is_active`; `prevent_last_admin_demote` blocks losing the last active admin; `sync_admin_jwt_claim` keeps the JWT `is_admin` claim aligned with the `profiles` row so the middleware check stays honest.
- **RPC layer**: `decide_checkin` rejects `p_admin_id <> auth.uid()`; `get_oldest_agency_admin_profile_id` is granted only to `service_role` so the sync worker can assign an author without a session.
- **Cron layer**: `/api/sync` (and the Sheets sync action via `runSyncAction`) check `CRON_SECRET`; the Worker reads it from `env.CRON_SECRET` and forwards it as `x-cron-secret`.

## Deployment Topology

- **Build**: `next build` (Next.js) followed by `opennextjs-cloudflare build` which produces the OpenNext Worker bundle in `.open-next/`.
- **Hosting**: Cloudflare Workers — Node.js compatibility enabled, static assets served from the `ASSETS` binding, incremental cache backed by R2 (`sebraiers-opennext-cache`), image transformations via the `IMAGES` binding.
- **Database**: Supabase (managed Postgres 17) with RLS as the canonical access guard. Local dev uses the Supabase CLI against Docker (`pnpm dlx supabase start`).
- **Scheduled jobs**: Cloudflare Cron (`0 */6 * * *`) → Worker `scheduled` handler → internal `fetch` to `/api/sync`. Manual override via the admin `SyncButton` or a `curl -X POST … -H "x-cron-secret: …"` against `/api/sync`.

<!-- VERIFY: production Worker URL and exact Cloudflare account/project name -->
