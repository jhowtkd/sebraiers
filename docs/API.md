<!-- generated-by: gsd-doc-writer -->

# API

SEBRAEIERS exposes a single HTTP route for scheduled Google Sheets sync. All other application behavior is implemented as Next.js Server Actions invoked from React components — not as REST endpoints.

For environment variables referenced by sync and auth, see [CONFIGURATION.md](./CONFIGURATION.md).

## Authentication

### HTTP route (`/api/sync`)

The sync route uses a shared secret (`CRON_SECRET`). It does **not** use Supabase session cookies. Middleware treats `/api/sync` as a public path; authorization is enforced inside the route handler.

Accepted credentials (either one):

| Header | Value |
|--------|-------|
| `x-cron-secret` | Raw secret string |
| `Authorization` | `Bearer <CRON_SECRET>` |

Verification is implemented in `verifyCronSecret()` (`lib/sync/execute-sheet-sync.ts`). If `CRON_SECRET` is unset, the route returns `500` before checking headers.

**Triggers:**

- **Cloudflare Cron** — `cloudflare/worker.mjs` POSTs to `/api/sync` with `x-cron-secret` every 6 hours (`0 */6 * * *`, defined in `wrangler.jsonc`).
- **Vercel Cron** — `vercel.json` schedules GET `/api/sync` on the same cadence; Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically when the secret is configured in the project.
- **Manual HTTP** — `curl` or any HTTP client with one of the headers above.

### Server Actions

All server actions in `app/actions/` authenticate via the Supabase session stored in HTTP cookies. The server client (`lib/supabase/server.ts`) reads cookies on each invocation.

| Role | How it is determined |
|------|----------------------|
| Authenticated user | `supabase.auth.getUser()` returns a user |
| Admin | `profiles.is_admin === true` (or `ADMIN_EMAILS` / `admin_whitelist` at signup) |

Actions that require admin check `profiles.is_admin` and return `{ ok: false, error: 'Sem permissão' }` when the user is not an admin. Unauthenticated callers receive `{ ok: false, error: 'Não autenticado' }`.

Auth-related actions (`signUpAction`, `signInAction`, `signOutAction`) use Supabase Auth directly and redirect on success.

## Endpoints overview

### HTTP

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| `GET` | `/api/sync` | Run Google Sheets → Supabase posts sync (Vercel Cron, manual) | `CRON_SECRET` via header |
| `POST` | `/api/sync` | Same sync operation (Cloudflare Cron, manual) | `CRON_SECRET` via header |

### Server Actions

Server actions are not HTTP endpoints. They are imported from `app/actions/*` and called from client components or forms. Next.js serializes arguments and returns the typed result.

| Action | Module | Description | Auth Required |
|--------|--------|-------------|---------------|
| `signUpAction` | `auth` | Create account (Supabase `signUp`) | None (public form) |
| `signInAction` | `auth` | Sign in with email/password | None (public form) |
| `signOutAction` | `auth` | Sign out and redirect to `/login` | Session |
| `runSyncAction` | `sync` | Manual sheet sync from admin UI | Admin |
| `createPostAction` | `posts` | Create post (optional cover file upload) | Admin |
| `updatePostAction` | `posts` | Update post by ID | Admin |
| `togglePostActiveAction` | `posts` | Enable/disable post visibility | Admin |
| `deletePostAction` | `posts` | Delete post by ID | Admin |
| `updateSocialsAction` | `profile` | Upsert user social handles | Authenticated |
| `toggleUserActiveAction` | `users` | Activate/deactivate user profile | Admin |
| `toggleUserAdminAction` | `users` | Grant/revoke admin role | Admin |
| `declareCheckinAction` | `checkins` | Declare like/comment/share on a post | Authenticated |
| `decideCheckinAction` | `checkins` | Approve or reject a pending check-in | Admin |
| `setPostReactionAction` | `social` | Toggle emoji reaction on a post | Authenticated |
| `addPostCommentAction` | `social` | Add comment on a post | Authenticated |
| `setCheckinReactionAction` | `social` | Toggle clap reaction on a check-in | Authenticated |
| `addCheckinCommentAction` | `social` | Add comment on a check-in | Authenticated |
| `getCheckinCommentsAction` | `social` | List up to 50 comments for a check-in | None (read via server) |

## Request/response formats

### HTTP: `GET` / `POST` `/api/sync`

**Request:** No body. Auth via headers only.

**Success response** (`200`):

```json
{
  "created": 3,
  "updated": 12,
  "skipped_stories": 1,
  "errors": 0,
  "og_images_found": 2
}
```

`SyncSummary` fields (`lib/sync/index.ts`):

| Field | Type | Description |
|-------|------|-------------|
| `created` | `number` | New posts inserted into `posts` |
| `updated` | `number` | Existing posts updated (matched by `external_id` hash of URL) |
| `skipped_stories` | `number` | Rows skipped because URL is an Instagram/Facebook story |
| `errors` | `number` | Rows that failed processing (logged, sync continues) |
| `og_images_found` | `number` | Cover images resolved via Open Graph fetch |

**Error response** (`4xx` / `5xx`):

```json
{ "error": "Unauthorized" }
```

Cron sync uses `getAdminClient()` and `SYNC_AUTHOR_PROFILE_ID` as `created_by`. Manual admin sync (`runSyncAction`) uses the logged-in admin's profile ID instead.

### Server Actions: common envelopes

Most actions return `ActionResult`:

```typescript
{ ok: true } | { ok: false; error: string }
```

`runSyncAction` returns `SyncActionResult`:

```typescript
{ ok: true; summary: SyncSummary } | { ok: false; error: string }
```

`setPostReactionAction` and `setCheckinReactionAction` return `SocialActionResult` — `ActionResult` plus optional `reaction` (current emoji after toggle, or `null` if removed).

`getCheckinCommentsAction` returns:

```typescript
{
  ok: true;
  comments: {
    id: string;
    body: string;
    created_at: string;
    user: { full_name: string; username: string; avatar_url: string | null };
  }[];
} | { ok: false; error: string }
```

### Representative action inputs

**Form-based actions** (`signUpAction`, `signInAction`, `createPostAction`, `updatePostAction`, `updateSocialsAction`) accept `FormData` from `<form action={...}>`. Fields are validated with Zod schemas in `lib/validation.ts`.

| Action | Key fields |
|--------|------------|
| `signUpAction` | `full_name`, `username`, `email`, `password` |
| `signInAction` | `email`, `password` |
| `createPostAction` / `updatePostAction` | `title`, `description`, `network`, `original_url`, `published_at`, `cover_url`, `is_active`, optional `cover_file` (File) |
| `updateSocialsAction` | `instagram`, `linkedin`, `facebook`, `tiktok`, `youtube`, `threads` (handles, optional) |

**Object-based actions:**

```typescript
// declareCheckinAction
{ post_id: string; action: 'like' | 'comment' | 'share' }

// decideCheckinAction
{ checkin_id: string; decision: 'approved' | 'rejected'; note?: string | null }

// setPostReactionAction
{ post_id: string; reaction: 'fire' | 'muscle' | 'clap' | 'raised' | 'laugh' }

// addPostCommentAction
{ post_id: string; body: string }  // body: 1–500 chars

// setCheckinReactionAction
{ checkin_id: string; reaction: 'clap' }

// addCheckinCommentAction
{ checkin_id: string; body: string }  // body: 1–300 chars

// togglePostActiveAction / toggleUserActiveAction / toggleUserAdminAction
(id: string, boolean)
```

`network` values: `instagram`, `linkedin`, `facebook`, `tiktok`, `youtube`, `threads`, `x`.

On success, several actions call `revalidatePath()` for affected routes. Auth actions and post create/update use `redirect()` instead of returning `{ ok: true }`.

## Error codes

### HTTP `/api/sync`

| Status | `error` value | Cause |
|--------|---------------|-------|
| `401` | `Unauthorized` | Missing or incorrect `CRON_SECRET` header |
| `500` | `CRON_SECRET not configured` | `CRON_SECRET` env var unset |
| `500` | `SHEET_ID not configured` | `SHEET_ID` env var unset |
| `500` | `SYNC_AUTHOR_PROFILE_ID not configured` | `SYNC_AUTHOR_PROFILE_ID` env var unset |
| `500` | *(sync exception message)* | Sheet fetch failure, Supabase error, or other runtime error from `executeSheetSync()` |

### Server Actions

Server actions do not use HTTP status codes. Errors are returned in the `error` string field (Portuguese user-facing messages). Common values:

| `error` | Meaning |
|---------|---------|
| `Não autenticado` | No Supabase session |
| `Sem permissão` | User is not admin |
| `Dados inválidos` | Zod validation failed (first issue message may be more specific) |
| `SHEET_ID não configurado` | `SHEET_ID` missing (`runSyncAction` only) |
| `Publicação não disponível` | Post missing or inactive (`declareCheckinAction`) |
| `Você já declarou essa ação neste post.` | Duplicate check-in (`23505` unique violation) |
| `Este check-in já foi decidido.` | RPC `P0002` — check-in already approved/rejected |
| `Não é permitido desativar o último admin.` / `Não é permitido rebaixar o último admin.` | Postgres `42501` from admin-safety trigger |
| `Você não pode desativar sua própria conta.` / `Você não pode rebaixar a si mesmo.` | Self-modification guard |

Validation errors from Zod often include field-specific Portuguese messages (e.g. `Email inválido`, `Título muito curto`).

## Rate limits

No application-level rate limiting is configured. There is no `express-rate-limit`, Upstash, or similar middleware in this codebase.

**Supabase** enforces platform rate limits on Auth and database API calls (defaults vary by plan; see Supabase project settings). Self-hosted Supabase can tune `[auth.rate_limit]` in `supabase/config.toml`.

**Scheduled sync** runs at most once every 6 hours per deployment target (Cloudflare cron and/or Vercel cron). Manual triggers via HTTP or `runSyncAction` are unconstrained beyond Supabase and Google Sheets fetch limits.

**Cloudflare Worker** cron failures are logged to worker observability (`wrangler.jsonc` → `observability.enabled: true`); there is no automatic retry in `cloudflare/worker.mjs`.
