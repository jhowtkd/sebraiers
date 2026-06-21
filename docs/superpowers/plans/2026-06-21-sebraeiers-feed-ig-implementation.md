# SEBRAEIERS IG-Style Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the timeline page (`/timeline`) with a single-column Instagram-style card per post — header with author + network badge, 1:1 cover, action bar with 5 reactions + comment link, caption with author + title + description, footer with time and external link.

**Architecture:** Server-rendered feed using existing patterns. Modify `getTimeline` to embed author (PostgREST join), extend `Post` type with optional `author` field, rewrite `PostCard` to IG structure, wrap timeline content in `max-w-[600px] mx-auto` container. No data model changes, no RLS changes, no new components.

**Tech Stack:** Next.js 14.2 (App Router), TypeScript 5.6, Tailwind 3.4, Supabase (`@supabase/ssr`), lucide-react.

## Global Constraints

Copied verbatim from spec `2026-06-21-sebraeiers-feed-ig-design.md`:

- **Layout:** single column ~600px max, centered. NOT inherited `max-w-7xl` from parent layout.
- **Cover aspect:** 1:1 (square) with `object-cover` (crops landscape images).
- **Reactions:** 5 emojis (🔥💪👏🙌😂) on action bar — keep current system, no single-heart regression.
- **Header per post:** avatar + name + @handle + small "via {Network}" badge + time (`formatRelative`).
- **Action bar:** compact `ReactionBar` (5 emoji buttons, no labels) + `💬 {count}` link to detail.
- **Caption:** bold author + title (one line); description below with `line-clamp-3` (optional).
- **Footer:** `formatRelative` time + `via {Network} ↗` link to `post.original_url` (target="_blank").
- **Click on card image** (or any non-interactive area) → `/post/[id]`.
- **Post detail page:** NOT changed (keeps current ReactionBar grande + Conversa).
- **/meu-desempenho, /ranking, /admin, auth:** NOT changed.
- **`EmptyState` for no posts:** keep existing.
- **Filter container (PostFilters):** wrapped in the same 600px container (aligned with feed).
- **Author fallbacks:** if `post.author` is null, show "Anônimo" / `@anônimo`; `AvatarFallback` shows initials.
- **i18n:** pt-BR for new microcopy ("Ver todos os N comentários", "via Instagram" etc.).
- **No new emojis in code** beyond the existing 5 reaction emojis + network icons.
- **Tests:** Vitest happy-dom; no new tests required (server-only changes; visual refactor verified by build).
- **Lint/typecheck** pass after every task.

## File Structure (target)

```
lib/
  types.ts                          # MODIFY (add Post.author?)
  queries/posts.ts                  # MODIFY (getTimeline gets author embed)
app/
  (app)/
    timeline/page.tsx               # MODIFY (wrap in max-w-[600px])
components/
  posts/
    post-card.tsx                   # REWRITE (IG structure)
docs/superpowers/
  specs/2026-06-21-sebraeiers-feed-ig-design.md   (exists, approved)
  plans/2026-06-21-sebraeiers-feed-ig-implementation.md  # THIS FILE
```

---

## Task 1: Data layer — Post.author type + getTimeline embed

**Files:**
- Modify: `lib/types.ts` (add `author?` field to `Post` interface)
- Modify: `lib/queries/posts.ts` (add author embed to `getTimeline` select)

**Interfaces:**
- Consumes: existing `Post` type, `createClient` from `@/lib/supabase/server`
- Produces:
  - Updated `Post` type with optional `author` field
  - `getTimeline(...)` returns `Post[]` where each post has `author: { full_name, username, avatar_url } | null`

- [ ] **Step 1: Add `author` to `Post` interface in `lib/types.ts`**

Open `lib/types.ts`. In the `Post` interface, add a new field after `cover_url`:

```ts
export interface Post {
  id: string;
  title: string;
  description: string | null;
  network: Network;
  original_url: string;
  cover_url: string | null;
  published_at: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
}
```

- [ ] **Step 2: Update `getTimeline` in `lib/queries/posts.ts` to embed author**

Replace the current `.select('*')` with `.select('*, author:profiles!posts_created_by_fkey(full_name, username, avatar_url)')`:

```ts
export async function getTimeline(opts: { network?: Network | 'all'; search?: string } = {}): Promise<Post[]> {
  const supabase = await createClient();
  let q = supabase
    .from('posts')
    .select('*, author:profiles!posts_created_by_fkey(full_name, username, avatar_url)')
    .eq('is_active', true)
    .order('published_at', { ascending: false })
    .limit(100);
  if (opts.network && opts.network !== 'all') q = q.eq('network', opts.network);
  if (opts.search) q = q.ilike('title', `%${opts.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Post[];
}
```

- [ ] **Step 3: Verify**

```bash
pnpm typecheck && pnpm lint
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/queries/posts.ts
git commit -m "feat(feed-ig): add Post.author + embed author in getTimeline"
```

---

## Task 2: Rewrite PostCard with IG structure

**Files:**
- Rewrite: `components/posts/post-card.tsx`

**Interfaces:**
- Consumes: `Post` type (with `author?`), `PostEngagement` from `@/lib/queries/posts`, `ReactionBar` from `@/components/social/reaction-bar`, `Avatar`/`AvatarImage`/`AvatarFallback` from `@/components/ui/avatar`, `NETWORK_LABELS` from `@/lib/types`, `initials`/`formatRelative` from `@/lib/utils`
- Produces: New `PostCard` component with IG structure (header, cover, action bar, caption, footer)

- [ ] **Step 1: Rewrite `components/posts/post-card.tsx`**

Replace the entire file with:

```tsx
import Link from 'next/link';
import { MessageCircle, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ReactionBar } from '@/components/social/reaction-bar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { NETWORK_LABELS, type Post, type Post as PostType } from '@/lib/types';
import type { PostEngagement } from '@/lib/queries/posts';
import { initials, formatRelative } from '@/lib/utils';
import { cn } from '@/lib/utils';

type Props = {
  post: Post;
  engagement?: PostEngagement;
};

export function PostCard({ post, engagement }: Props) {
  const author = post.author ?? null;
  const authorName = author?.full_name ?? 'Anônimo';
  const authorUsername = author?.username ?? 'anônimo';
  const networkLabel = NETWORK_LABELS[post.network];
  const time = formatRelative(post.published_at);

  return (
    <article className="bg-surface-elevated rounded-xl border border-border-subtle overflow-hidden">
      {/* header */}
      <header className="flex items-center gap-3 p-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          {author?.avatar_url && (
            <AvatarImage src={author.avatar_url} alt={authorName} />
          )}
          <AvatarFallback className="bg-brand-azul text-white text-caption font-semibold">
            {initials(authorName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-body-sm font-semibold text-text-primary truncate">
            {authorName}
          </p>
          <p className="text-caption text-text-muted truncate">
            @{authorUsername} · via {networkLabel}
          </p>
        </div>
        <time dateTime={post.published_at} className="text-caption text-text-muted flex-shrink-0">
          {time}
        </time>
      </header>

      {/* cover (clickable to detail) */}
      <Link href={`/post/${post.id}`} aria-label={`Ver detalhe de ${post.title}`}>
        <figure className="aspect-square w-full bg-surface-sunken overflow-hidden">
          {post.cover_url ? (
            <img
              src={post.cover_url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : null}
        </figure>
      </Link>

      {/* action bar */}
      {engagement && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border-subtle">
          <ReactionBar
            target="post"
            targetId={post.id}
            engagement={engagement}
            compact
          />
          <Link
            href={`/post/${post.id}#conversa`}
            className="ml-auto inline-flex items-center gap-1 text-caption text-text-muted hover:text-brand-azul"
            aria-label={`Ver ${engagement.commentCount} comentários`}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="tabular-nums">{engagement.commentCount}</span>
          </Link>
        </div>
      )}

      {/* caption */}
      <div className="px-3 py-3 space-y-1">
        <p className="text-body-sm text-text-primary">
          <span className="font-semibold">{authorUsername}</span>{' '}
          {post.title}
        </p>
        {post.description && (
          <p className="text-body-sm text-text-secondary line-clamp-3">
            {post.description}
          </p>
        )}
        {engagement && engagement.commentCount > 0 && (
          <Link
            href={`/post/${post.id}#conversa`}
            className="block text-caption text-text-muted hover:text-brand-azul"
          >
            Ver todos os {engagement.commentCount} comentários
          </Link>
        )}
      </div>

      {/* footer */}
      <footer className="px-3 pb-3 flex items-center justify-between text-caption text-text-muted">
        <time dateTime={post.published_at}>{time}</time>
        <a
          href={post.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-brand-azul"
        >
          via {networkLabel} <ExternalLink className="h-3 w-3" />
        </a>
      </footer>
    </article>
  );
}
```

Note: `PostType` import is unused — remove it from the imports. Final import block:

```tsx
import Link from 'next/link';
import { MessageCircle, ExternalLink } from 'lucide-react';
import { ReactionBar } from '@/components/social/reaction-bar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { NETWORK_LABELS, type Post } from '@/lib/types';
import type { PostEngagement } from '@/lib/queries/posts';
import { initials, formatRelative, cn } from '@/lib/utils';
```

- [ ] **Step 2: Verify**

```bash
pnpm typecheck && pnpm lint
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/posts/post-card.tsx
git commit -m "feat(feed-ig): rewrite PostCard with Instagram-style structure"
```

---

## Task 3: Timeline page — 600px container + list rendering

**Files:**
- Modify: `app/(app)/timeline/page.tsx`

**Interfaces:**
- Consumes: existing imports (unchanged), new `PostCard` from Task 2
- Produces: Timeline page renders single-column list (not grid) inside 600px centered container, including filters

- [ ] **Step 1: Modify `app/(app)/timeline/page.tsx`**

Find the section that renders the posts. Currently it uses `<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">`. Replace the entire wrapper around `<PostFilters>` and the posts grid with:

```tsx
<div className="mx-auto max-w-[600px] px-4 sm:px-0 space-y-4">
  <PostFilters />
  {posts.length === 0 ? (
    <EmptyState
      icon={<Inbox className="h-10 w-10" />}
      title="Nenhuma publicação por aqui ainda"
      description="Quando o time de comunicação postar nas redes oficiais, vai aparecer aqui pra você conferir e engajar."
    />
  ) : (
    <ul className="space-y-6">
      {posts.map((p) => (
        <li key={p.id}>
          <PostCard post={p} engagement={engagementMap.get(p.id)} />
        </li>
      ))}
    </ul>
  )}
</div>
```

The imports stay the same (`Inbox` from `lucide-react`, `EmptyState`, `PostFilters`, `PostCard`, `getTimeline`, etc.). The change is only the JSX wrapper.

- [ ] **Step 2: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Expected: all clean. ≥ 42 tests passing. 15 routes built.

- [ ] **Step 3: Manual visual check**

Open `http://localhost:3000/timeline` (after logging in). Confirm:
- Single column ~600px on desktop
- Each post shows: avatar + name + handle + time + "via Instagram" in header
- Cover image is 1:1 (square)
- Action bar with 5 reactions + 💬 count
- Caption with bold username + title
- Footer with time + "via Instagram ↗"

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/timeline/page.tsx"
git commit -m "feat(feed-ig): timeline renders single column 600px list with new PostCard"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| §3 changes (3 files modified, 1 type updated) | All 3 tasks touch listed items |
| §4 visual layout | Task 2 (PostCard JSX) |
| §5 HTML structure | Task 2 (PostCard JSX) |
| §6 query (author embed) | Task 1 |
| §7 type (Post.author?) | Task 1 |
| §8 timeline page (600px container) | Task 3 |
| §9 states (loading, empty, no cover, author null) | Task 2 (fallbacks + EmptyState preserved) |
| §10 YAGNI (no stories, reels, etc.) | All tasks respect (no scope creep) |
| §11 acceptance criteria | Task 3 manual visual check covers them |

**Placeholder scan:** No "TBD", "TODO", "later", "similar to", "fill in". All steps have concrete code.

**Type consistency:**
- `Post.author?` is added once in Task 1, used in Task 2 via `post.author ?? null` and the fallback pattern.
- `PostEngagement` from `@/lib/queries/posts` is the canonical type used in Task 2.
- `Author` Avatar/AvatarImage/AvatarFallback imports match the existing primitive (Task 10 of v1 + extended in social cleanup).
- `cn` import in Task 2 is unused in the actual JSX (only `formatRelative` and `initials` are used as direct calls, no conditional class composition in this rewrite). Remove from imports to avoid lint warning.

**Corrected imports for Task 2 (replacing the final import block from the brief):**

```tsx
import Link from 'next/link';
import { MessageCircle, ExternalLink } from 'lucide-react';
import { ReactionBar } from '@/components/social/reaction-bar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { NETWORK_LABELS, type Post } from '@/lib/types';
import type { PostEngagement } from '@/lib/queries/posts';
import { initials, formatRelative } from '@/lib/utils';
```

(No `cn` since unused in this component; no `PostType` since duplicate import.)

**Potential issues for implementer to watch:**
- The PostgREST embed `author:profiles!posts_created_by_fkey(full_name, username, avatar_url)` assumes the FK name is exactly `posts_created_by_fkey` (Postgres auto-name for `created_by uuid references profiles(id)`). If the FK name differs in the local migration, adjust the hint. Verify with `\d posts` if it fails.
- The `<a>` tag for the external `original_url` is in the same `<article>` as the cover `<Link>`. Since the cover is the only thing in its own `<Link>`, the footer's external link is separate and behaves independently — no nested `<a>` issues.
- `Avatar` and `AvatarImage` are part of the existing `components/ui/avatar.tsx` (added in social cleanup Task). If the import fails, the file exists and the exports are correct.
- The `engagement?` prop is optional. If a caller forgets to pass it, the action bar and comment count are simply not rendered. Defensive.
