# Social Task 1 — Foundation Report

## Status: DONE

## What was implemented

### 1. Migration `supabase/migrations/0005_engagement.sql` (new file)
- 4 tables: `post_reactions`, `post_comments`, `checkin_reactions`, `checkin_comments`
- Composite PKs on reaction tables: `(post_id|checkin_id, user_id, reaction)`
- CHECK constraints: reaction kinds for posts (`fire|muscle|clap|raised|laugh`), clap-only for checkins, body length 1–500 (posts) and 1–300 (checkins)
- Indexes: `post_reactions_post_idx`, `post_comments_post_created_idx`, `checkin_reactions_checkin_idx`, `checkin_comments_checkin_created_idx`
- RLS enabled on all 4 tables; 3 policies per table (select, insert, delete) — 12 policies total
- Post policies: anyone authenticated can read reactions on active posts; insert own on active post; delete own or admin
- Comment policies: read on active post OR own comment; insert own on active post; delete own or admin
- Checkin policies: read if owner / checkin author / admin; insert own on approved checkin; delete own or admin

### 2. `lib/social/emojis.ts` (new file)
- `POST_REACTIONS` const map with 5 kinds (emoji + pt-BR label)
- `CHECKIN_REACTIONS` const map with single `clap` kind
- `PostReactionKind` and `CheckinReactionKind` types via `keyof typeof`
- Type guards `isPostReactionKind` / `isCheckinReactionKind`

### 3. `lib/validation.ts` (appended)
- 4 Zod object schemas: `postReactionSetSchema`, `postCommentSchema`, `checkinReactionSetSchema`, `checkinCommentSchema` (+ `postReactionKindSchema` and `checkinReactionKindSchema` enums)
- All with pt-BR error messages ("Post inválido", "Comentário vazio", "Máximo de X caracteres")
- 4 type exports: `PostReactionSetInput`, `PostCommentInput`, `CheckinReactionSetInput`, `CheckinCommentInput`

### 4. `lib/queries/posts.ts` (appended)
- `PostEngagement` exported type
- `getPostEngagement(postId, userId)` → `{ reactions, myReactions, commentCount }`
- `getPostsEngagementBatch(postIds, userId)` → `Map<string, PostEngagement>` (returns empty map for empty input; aggregates reactions by post id; aggregates comment count by post id)

### 5. `lib/queries/checkins.ts` (appended)
- `CheckinEngagement` exported type
- `getCheckinEngagement(checkinId, userId)` → `{ reactions, myReactions, commentCount, comments }` where comments join `profiles!checkin_comments_user_id_fkey(full_name, username)`, ordered by `created_at desc`, limited to 50

## Migration push result

```
Applying migration 0005_engagement.sql...
Warning: failed to cache migrations catalog: error exporting pg-delta catalog: failed to inspect docker image: Cannot connect to the Docker daemon at unix:///...
Finished supabase db push.
```

Migration applied to remote project `jwfpwdnlatfsucgqykvo`. The Docker warning is purely about the local pg-delta catalog cache and does not affect the remote push. "Finished supabase db push." appeared as expected.

## typecheck + lint results

- `pnpm typecheck`: clean (exit 0)
- `pnpm lint`: clean (exit 0). Pre-existing warnings remain (5 about `<img>` vs `next/image`, 1 about custom fonts in `app/layout.tsx`); none originate from this task's files.

### Notes on brief verbatim preservation

The brief's TypeScript code used `(r: any)` and `as any` casts. To keep lint clean without changing function signatures, I narrowed each to a minimal row type:
- `(r: any)` → `(r: { reaction: string })` for `post_reactions` / `checkin_reactions` rows
- `(r: any)` → `(r: { post_id: string; reaction: string })` for batch reactions
- `(c: any)` → `(c: { post_id: string })` for batch comments
- `(commentsRes.data ?? []) as any` → `(commentsRes.data ?? []) as unknown as CheckinEngagement['comments']` (Supabase's typing for the FK hint returns `user[]`, so the cast goes through `unknown`)

The exported function signatures, return shapes, query behavior, and table schemas match the brief exactly.

## Self-review

| Check | Status |
|---|---|
| All 4 tables created with correct FKs and CHECK constraints? | ✅ |
| All 4 RLS policy groups (insert, select, delete) present for each table? | ✅ — 12 policies |
| `getPostEngagement` returns `{ reactions, myReactions, commentCount }`? | ✅ |
| `getPostsEngagementBatch` returns a `Map` keyed by post id? | ✅ |
| `getCheckinEngagement` returns `{ reactions, myReactions, commentCount, comments }`? | ✅ |
| Zod schemas have proper error messages in pt-BR? | ✅ |
| typecheck + lint clean? | ✅ |
| Migration pushed to remote? | ✅ — `Finished supabase db push.` |

## Commit

```
8de81b0 feat(social): 4 new tables (reactions + comments) + RLS + queries + Zod schemas
```

5 files changed, 270 insertions, 1 deletion.

## Fixes applied

### Fix 1: exact commentCount
- Changed `getCheckinEngagement` to use 4 parallel queries (added `select('id', { count: 'exact', head: true })` for `checkin_comments`)
- `commentCount` is now true count via head query, not capped at 50 by the list `.limit(50)`
- Also added `avatar_url` to user select in comments query + matching field on `CheckinEngagement['comments']` user type
- Verification: `pnpm typecheck` clean, `pnpm lint` clean (only pre-existing warnings, none from this change)

### Fix 2: spec filename drift
- Updated `docs/superpowers/specs/2026-06-21-sebraeiers-social-features-design.md` lines 35 and 274 from `0004_engagement.sql` to `0005_engagement.sql` (matches the actual migration; 0003 was the last v1 migration, this is the 4th in v2 numbering but 5th file)
- Implementation kept `0005` (correct) — only the spec was wrong