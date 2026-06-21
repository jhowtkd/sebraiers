# SEBRAEIERS Social Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reactions (5 emojis on posts, 1 emoji "Tamo junto" on checkins) and flat comments to SEBRAEIERS, with slightly playful pt-BR microcopy — per the approved spec at `docs/superpowers/specs/2026-06-21-sebraeiers-social-features-design.md`.

**Architecture:** 4 new tables (`post_reactions`, `post_comments`, `checkin_reactions`, `checkin_comments`) with RLS, 4 server actions in a new `app/actions/social.ts` (set-semantics, not toggle), 2 query functions on posts + 1 on checkins, 4 new social components, 3 page modifications. No changes to the design system — uses existing Tailwind tokens, primitives, and ToastProvider.

**Tech Stack:** Next.js 14.2 (App Router), TypeScript 5.6, Tailwind 3.4, Supabase (`@supabase/ssr` + `@supabase/supabase-js`), Zod 3.23, React Hook Form 7.53, lucide-react, Vitest 1.6.

## Global Constraints

Copied verbatim from spec:

- **Reactions on post:** 5 emojis (🔥💪👏🙌😂) keyed as `'fire' | 'muscle' | 'clap' | 'raised' | 'laugh'`. One reaction per (user, post, reaction). `set` semantics, not toggle: clicking a different emoji replaces the current one.
- **Reactions on checkin:** 1 emoji 👏 keyed as `'clap'`. Only on `status='approved'` checkins.
- **Comments on post:** flat list (no threads), max 500 chars, ordered by `created_at DESC`. Newest at top.
- **Comments on checkin:** flat list, max 300 chars. Only on `status='approved'` checkins.
- **RLS:** SELECT own/admin/author-of-target. INSERT own user_id, requires target active+approved (for checkins). DELETE own or admin. NO UPDATE.
- **No rename** of existing terms (Post, Check-in, Ranking, Meu desempenho, Colaborador stay). Ludicidade only in new microcopy.
- **No notifications, no threads, no likes on comment, no @mention, no edit/delete by author, no moderation UI, no dark mode, no "X people reacted" expansion** — explicit YAGNI.
- **Comments body is plain text** — React default escape, no `dangerouslySetInnerHTML`.
- **All actions Zod-validated server-side; CHECK constraints in DB as second line.**
- **i18n pt-BR** for all new microcopy.
- **Toast in pt-BR** with variants (success/info/error).
- **No emoji in code comments.** New microcopy uses the 5 specific reaction emojis.
- **Tests:** Vitest with happy-dom. No E2E. Mock supabase server client in tests.
- **Lint/typecheck** pass after every task.

## File Structure (target)

```
supabase/
  migrations/
    0005_engagement.sql                        # NOVO (4 tables + indexes + RLS)
lib/
  social/
    emojis.ts                                  # NOVO (POST_REACTIONS, CHECKIN_REACTIONS, kind types)
  validation.ts                                # MODIFY (add 4 Zod schemas)
  queries/
    posts.ts                                   # MODIFY (add getPostEngagement, getPostsEngagementBatch)
    checkins.ts                                # MODIFY (add getCheckinEngagement)
app/
  actions/
    social.ts                                  # NOVO (4 server actions)
components/
  social/
    reaction-button.tsx                        # NOVO (client)
    reaction-bar.tsx                           # NOVO (server, wraps buttons)
    comments.tsx                               # NOVO (server, list + form wrapper)
    comment-form.tsx                           # NOVO (client, RHF)
  posts/
    post-card.tsx                              # MODIFY (add reaction bar + comment count)
  posts/checkin-history-list.tsx               # MODIFY (show reactions + collapsible comments)
app/
  (app)/
    post/[id]/page.tsx                         # MODIFY (add Conversa section)
supabase/
  seed-demo.sql                               # MODIFY (add sample reactions + comments)
tests/
  lib/actions/
    social.test.ts                             # NOVO (~6-8 tests)
docs/superpowers/
  specs/2026-06-21-sebraeiers-social-features-design.md  (exists, approved)
  plans/2026-06-21-sebraeiers-social-features-implementation.md  # THIS FILE
```

**Decomposition rationale:**
- `lib/social/emojis.ts` is the source of truth for the emoji→key map.
- `app/actions/social.ts` groups all 4 social actions (related domain).
- `components/social/*` is the social UI layer.
- Queries live with their parent table's query file (posts in `posts.ts`, checkins in `checkins.ts`) — consistent with existing layout.

---

## Task 1: Foundation (migration + emojis + Zod schemas + queries)

**Files:**
- Create: `supabase/migrations/0005_engagement.sql`
- Create: `lib/social/emojis.ts`
- Modify: `lib/validation.ts` (append 4 Zod schemas)
- Modify: `lib/queries/posts.ts` (add 2 functions)
- Modify: `lib/queries/checkins.ts` (add 1 function)

**Interfaces:**
- Consumes: `createClient()` from `@/lib/supabase/server`, `Post`/`Checkin` types from `@/lib/types`
- Produces:
  - `POST_REACTIONS`, `CHECKIN_REACTIONS` constants + `PostReactionKind`, `CheckinReactionKind` types
  - `postReactionKindSchema`, `postReactionSetSchema`, `postCommentSchema`, `checkinReactionKindSchema`, `checkinReactionSetSchema`, `checkinCommentSchema`
  - `getPostEngagement(postId)`, `getPostsEngagementBatch(postIds)`, `getCheckinEngagement(checkinId)`

- [ ] **Step 1: Create migration `supabase/migrations/0005_engagement.sql`**

```sql
-- ============================================================================
-- SEBRAEIERS — Engagement (reactions + comments)
-- ============================================================================

create table public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('fire','muscle','clap','raised','laugh')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, reaction)
);
create index post_reactions_post_idx on public.post_reactions (post_id);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index post_comments_post_created_idx on public.post_comments (post_id, created_at desc);

create table public.checkin_reactions (
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null default 'clap' check (reaction in ('clap')),
  created_at timestamptz not null default now(),
  primary key (checkin_id, user_id, reaction)
);
create index checkin_reactions_checkin_idx on public.checkin_reactions (checkin_id);

create table public.checkin_comments (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create index checkin_comments_checkin_created_idx on public.checkin_comments (checkin_id, created_at desc);

-- ===== RLS =====
alter table public.post_reactions enable row level security;
alter table public.post_comments enable row level security;
alter table public.checkin_reactions enable row level security;
alter table public.checkin_comments enable row level security;

-- post_reactions: any logged in can read, can insert own on active post, can delete own or admin
create policy "post_reactions_select_all"
  on public.post_reactions for select to authenticated using (true);

create policy "post_reactions_insert_own_active"
  on public.post_reactions for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.posts where posts.id = post_reactions.post_id and posts.is_active = true)
  );

create policy "post_reactions_delete_own_or_admin"
  on public.post_reactions for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- post_comments: select on active post OR own comment; insert own on active; delete own or admin
create policy "post_comments_select_visible"
  on public.post_comments for select to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.posts where posts.id = post_comments.post_id and posts.is_active = true)
  );

create policy "post_comments_insert_own_active"
  on public.post_comments for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.posts where posts.id = post_comments.post_id and posts.is_active = true)
  );

create policy "post_comments_delete_own_or_admin"
  on public.post_comments for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- checkin_reactions: select if owner, author of checkin, or admin; insert own on approved; delete own or admin
create policy "checkin_reactions_select_visible"
  on public.checkin_reactions for select to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.checkins c where c.id = checkin_reactions.checkin_id and c.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "checkin_reactions_insert_own_approved"
  on public.checkin_reactions for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.checkins c where c.id = checkin_reactions.checkin_id and c.status = 'approved')
  );

create policy "checkin_reactions_delete_own_or_admin"
  on public.checkin_reactions for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- checkin_comments: same shape as checkin_reactions
create policy "checkin_comments_select_visible"
  on public.checkin_comments for select to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.checkins c where c.id = checkin_comments.checkin_id and c.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "checkin_comments_insert_own_approved"
  on public.checkin_comments for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.checkins c where c.id = checkin_comments.checkin_id and c.status = 'approved')
  );

create policy "checkin_comments_delete_own_or_admin"
  on public.checkin_comments for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
```

- [ ] **Step 2: Push migration to cloud**

```bash
pnpm exec supabase db push
```

Expected: `Applying migration 0005_engagement.sql... Finished supabase db push.`

- [ ] **Step 3: Create `lib/social/emojis.ts`**

```ts
export const POST_REACTIONS = {
  fire: { emoji: '🔥', label: 'Arrasou' },
  muscle: { emoji: '💪', label: 'Força' },
  clap: { emoji: '👏', label: 'Aplausos' },
  raised: { emoji: '🙌', label: 'Comemorando' },
  laugh: { emoji: '😂', label: 'Engraçado' },
} as const;
export type PostReactionKind = keyof typeof POST_REACTIONS;

export const CHECKIN_REACTIONS = {
  clap: { emoji: '👏', label: 'Tamo junto' },
} as const;
export type CheckinReactionKind = keyof typeof CHECKIN_REACTIONS;

export function isPostReactionKind(v: string): v is PostReactionKind {
  return v in POST_REACTIONS;
}

export function isCheckinReactionKind(v: string): v is CheckinReactionKind {
  return v in CHECKIN_REACTIONS;
}
```

- [ ] **Step 4: Append Zod schemas to `lib/validation.ts`**

Add at the end of the file (before the type exports):

```ts
export const postReactionKindSchema = z.enum(['fire', 'muscle', 'clap', 'raised', 'laugh']);
export const postReactionSetSchema = z.object({
  post_id: z.string().uuid('Post inválido'),
  reaction: postReactionKindSchema,
});
export const postCommentSchema = z.object({
  post_id: z.string().uuid('Post inválido'),
  body: z.string().min(1, 'Comentário vazio').max(500, 'Máximo de 500 caracteres').trim(),
});

export const checkinReactionKindSchema = z.enum(['clap']);
export const checkinReactionSetSchema = z.object({
  checkin_id: z.string().uuid('Check-in inválido'),
  reaction: checkinReactionKindSchema,
});
export const checkinCommentSchema = z.object({
  checkin_id: z.string().uuid('Check-in inválido'),
  body: z.string().min(1, 'Comentário vazio').max(300, 'Máximo de 300 caracteres').trim(),
});
```

Add the corresponding type exports at the end of the type exports block:

```ts
export type PostReactionSetInput = z.infer<typeof postReactionSetSchema>;
export type PostCommentInput = z.infer<typeof postCommentSchema>;
export type CheckinReactionSetInput = z.infer<typeof checkinReactionSetSchema>;
export type CheckinCommentInput = z.infer<typeof checkinCommentSchema>;
```

- [ ] **Step 5: Add `getPostEngagement` and `getPostsEngagementBatch` to `lib/queries/posts.ts`**

Append:

```ts
export type PostEngagement = {
  reactions: Record<string, number>;
  myReactions: string[];
  commentCount: number;
};

export async function getPostEngagement(postId: string, userId: string | null): Promise<PostEngagement> {
  const supabase = await createClient();
  const [rxRes, myRxRes, countRes] = await Promise.all([
    supabase.from('post_reactions').select('reaction').eq('post_id', postId),
    userId
      ? supabase.from('post_reactions').select('reaction').eq('post_id', postId).eq('user_id', userId)
      : Promise.resolve({ data: [] as { reaction: string }[] | null }),
    supabase.from('post_comments').select('id', { count: 'exact', head: true }).eq('post_id', postId),
  ]);
  const reactions: Record<string, number> = {};
  (rxRes.data ?? []).forEach((r: any) => { reactions[r.reaction] = (reactions[r.reaction] ?? 0) + 1; });
  return {
    reactions,
    myReactions: (myRxRes.data ?? []).map((r: any) => r.reaction),
    commentCount: countRes.count ?? 0,
  };
}

export async function getPostsEngagementBatch(
  postIds: string[],
  userId: string | null
): Promise<Map<string, PostEngagement>> {
  const result = new Map<string, PostEngagement>();
  if (postIds.length === 0) return result;
  const supabase = await createClient();
  const [rxRes, myRxRes, commentsRes] = await Promise.all([
    supabase.from('post_reactions').select('post_id, reaction').in('post_id', postIds),
    userId
      ? supabase.from('post_reactions').select('post_id, reaction').in('post_id', postIds).eq('user_id', userId)
      : Promise.resolve({ data: [] as { post_id: string; reaction: string }[] | null }),
    supabase.from('post_comments').select('post_id').in('post_id', postIds),
  ]);
  const rxByPost = new Map<string, Record<string, number>>();
  (rxRes.data ?? []).forEach((r: any) => {
    if (!rxByPost.has(r.post_id)) rxByPost.set(r.post_id, {});
    const m = rxByPost.get(r.post_id)!;
    m[r.reaction] = (m[r.reaction] ?? 0) + 1;
  });
  const myRxByPost = new Map<string, string[]>();
  (myRxRes.data ?? []).forEach((r: any) => {
    if (!myRxByPost.has(r.post_id)) myRxByPost.set(r.post_id, []);
    myRxByPost.get(r.post_id)!.push(r.reaction);
  });
  const commentCountByPost = new Map<string, number>();
  (commentsRes.data ?? []).forEach((c: any) => {
    commentCountByPost.set(c.post_id, (commentCountByPost.get(c.post_id) ?? 0) + 1);
  });
  for (const id of postIds) {
    result.set(id, {
      reactions: rxByPost.get(id) ?? {},
      myReactions: myRxByPost.get(id) ?? [],
      commentCount: commentCountByPost.get(id) ?? 0,
    });
  }
  return result;
}
```

- [ ] **Step 6: Add `getCheckinEngagement` to `lib/queries/checkins.ts`**

Append:

```ts
export type CheckinEngagement = {
  reactions: Record<string, number>;
  myReactions: string[];
  commentCount: number;
  comments: { id: string; body: string; created_at: string; user: { full_name: string; username: string } }[];
};

export async function getCheckinEngagement(checkinId: string, userId: string | null): Promise<CheckinEngagement> {
  const supabase = await createClient();
  const [rxRes, myRxRes, commentsRes] = await Promise.all([
    supabase.from('checkin_reactions').select('reaction').eq('checkin_id', checkinId),
    userId
      ? supabase.from('checkin_reactions').select('reaction').eq('checkin_id', checkinId).eq('user_id', userId)
      : Promise.resolve({ data: [] as { reaction: string }[] | null }),
    supabase.from('checkin_comments')
      .select('id, body, created_at, user:profiles!checkin_comments_user_id_fkey(full_name, username)')
      .eq('checkin_id', checkinId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  const reactions: Record<string, number> = {};
  (rxRes.data ?? []).forEach((r: any) => { reactions[r.reaction] = (reactions[r.reaction] ?? 0) + 1; });
  return {
    reactions,
    myReactions: (myRxRes.data ?? []).map((r: any) => r.reaction),
    commentCount: commentsRes.data?.length ?? 0,
    comments: (commentsRes.data ?? []) as any,
  };
}
```

- [ ] **Step 7: Verify**

```bash
pnpm typecheck && pnpm lint
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/0005_engagement.sql lib/social/emojis.ts lib/validation.ts lib/queries/
git commit -m "feat(social): 4 new tables (reactions + comments) + RLS + queries + Zod schemas"
```

---


## Task 2: Server actions with tests

**Files:**
- Create: `app/actions/social.ts`
- Create: `tests/lib/actions/social.test.ts`

**Interfaces:**
- Consumes: schemas from `@/lib/validation`, `createClient` from `@/lib/supabase/server`, `ActionResult` from `@/app/actions/auth`
- Produces:
  - `setPostReactionAction({ post_id, reaction })` — returns `ActionResult & { reaction: string | null }`
  - `addPostCommentAction({ post_id, body })` — returns `ActionResult`
  - `setCheckinReactionAction({ checkin_id, reaction: 'clap' })` — returns `ActionResult & { reaction: string | null }`
  - `addCheckinCommentAction({ checkin_id, body })` — returns `ActionResult`

- [ ] **Step 1: Write the failing test `tests/lib/actions/social.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const getUserMock = vi.fn();
const fromMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: getUserMock }, from: fromMock }),
}));

import { setPostReactionAction, addPostCommentAction, setCheckinReactionAction, addCheckinCommentAction } from '@/app/actions/social';

function chain(value: any) {
  return {
    select: () => chain(value),
    eq: () => chain(value),
    in: () => chain(value),
    delete: () => Promise.resolve(value),
    insert: () => Promise.resolve(value),
  };
}

beforeEach(() => { vi.clearAllMocks(); });

describe('setPostReactionAction', () => {
  it('rejects unauthenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const res = await setPostReactionAction({ post_id: '11111111-1111-1111-1111-111111111111', reaction: 'fire' });
    expect(res.ok).toBe(false);
  });

  it('rejects invalid reaction', async () => {
    const res = await setPostReactionAction({ post_id: '11111111-1111-1111-1111-111111111111', reaction: 'banana' as any });
    expect(res.ok).toBe(false);
  });

  it('removes existing reaction if user re-clicks the same one', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    let call = 0;
    fromMock.mockImplementation(() => {
      call++;
      if (call === 1) return chain({ data: [{ reaction: 'fire' }], error: null });
      return chain({ data: null, error: null });
    });
    const res = await setPostReactionAction({ post_id: '11111111-1111-1111-1111-111111111111', reaction: 'fire' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.reaction).toBe(null);
  });

  it('inserts when user has no current reaction', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    let call = 0;
    fromMock.mockImplementation(() => {
      call++;
      if (call === 1) return chain({ data: [], error: null });
      return chain({ data: null, error: null });
    });
    const res = await setPostReactionAction({ post_id: '11111111-1111-1111-1111-111111111111', reaction: 'muscle' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.reaction).toBe('muscle');
  });

  it('replaces current reaction when user clicks a different one', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    let call = 0;
    fromMock.mockImplementation(() => {
      call++;
      if (call === 1) return chain({ data: [{ reaction: 'fire' }], error: null });
      if (call === 2) return chain({ data: null, error: null });
      return chain({ data: null, error: null });
    });
    const res = await setPostReactionAction({ post_id: '11111111-1111-1111-1111-111111111111', reaction: 'laugh' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.reaction).toBe('laugh');
  });
});

describe('addPostCommentAction', () => {
  it('rejects invalid input', async () => {
    const res = await addPostCommentAction({ post_id: 'not-uuid', body: 'oi' });
    expect(res.ok).toBe(false);
  });

  it('inserts comment successfully', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation(() => Promise.resolve({ data: null, error: null }));
    const res = await addPostCommentAction({ post_id: '11111111-1111-1111-1111-111111111111', body: 'Arrasou!' });
    expect(res.ok).toBe(true);
  });

  it('rejects too-long body', async () => {
    const res = await addPostCommentAction({ post_id: '11111111-1111-1111-1111-111111111111', body: 'a'.repeat(501) });
    expect(res.ok).toBe(false);
  });
});

describe('setCheckinReactionAction', () => {
  it('inserts clap on approved checkin', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    let call = 0;
    fromMock.mockImplementation(() => {
      call++;
      if (call === 1) return chain({ data: [], error: null });
      return chain({ data: null, error: null });
    });
    const res = await setCheckinReactionAction({ checkin_id: '11111111-1111-1111-1111-111111111111', reaction: 'clap' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.reaction).toBe('clap');
  });

  it('rejects non-clap reaction', async () => {
    const res = await setCheckinReactionAction({ checkin_id: '11111111-1111-1111-1111-111111111111', reaction: 'fire' as any });
    expect(res.ok).toBe(false);
  });
});

describe('addCheckinCommentAction', () => {
  it('inserts comment successfully', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    fromMock.mockImplementation(() => Promise.resolve({ data: null, error: null }));
    const res = await addCheckinCommentAction({ checkin_id: '11111111-1111-1111-1111-111111111111', body: 'Tamo junto!' });
    expect(res.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test tests/lib/actions/social.test.ts
```

Expected: FAIL with "Cannot find module '@/app/actions/social'".

- [ ] **Step 3: Create `app/actions/social.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  postReactionSetSchema,
  postCommentSchema,
  checkinReactionSetSchema,
  checkinCommentSchema,
} from '@/lib/validation';
import type { ActionResult } from '@/app/actions/auth';

export type ReactionState = string | null;
export type SocialActionResult = ActionResult & { reaction?: ReactionState };

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function setPostReactionAction(input: { post_id: string; reaction: string }): Promise<SocialActionResult> {
  const parsed = postReactionSetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Não autenticado' };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from('post_reactions')
    .select('reaction')
    .eq('post_id', parsed.data.post_id)
    .eq('user_id', userId);

  const hadSame = current && current.length === 1 && current[0].reaction === parsed.data.reaction;

  if (current && current.length > 0) {
    await supabase
      .from('post_reactions')
      .delete()
      .eq('post_id', parsed.data.post_id)
      .eq('user_id', userId);
  }

  if (hadSame) {
    revalidatePath('/timeline');
    revalidatePath(`/post/${parsed.data.post_id}`);
    return { ok: true, reaction: null };
  }

  const { error } = await supabase.from('post_reactions').insert({
    post_id: parsed.data.post_id,
    user_id: userId,
    reaction: parsed.data.reaction,
  });
  if (error) return { ok: false, error: 'Erro ao reagir' };

  revalidatePath('/timeline');
  revalidatePath(`/post/${parsed.data.post_id}`);
  return { ok: true, reaction: parsed.data.reaction };
}

export async function addPostCommentAction(input: { post_id: string; body: string }): Promise<ActionResult> {
  const parsed = postCommentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Não autenticado' };

  const supabase = await createClient();
  const { error } = await supabase.from('post_comments').insert({
    post_id: parsed.data.post_id,
    user_id: userId,
    body: parsed.data.body,
  });
  if (error) return { ok: false, error: 'Erro ao comentar' };

  revalidatePath('/timeline');
  revalidatePath(`/post/${parsed.data.post_id}`);
  return { ok: true };
}

export async function setCheckinReactionAction(input: { checkin_id: string; reaction: 'clap' }): Promise<SocialActionResult> {
  const parsed = checkinReactionSetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Não autenticado' };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from('checkin_reactions')
    .select('reaction')
    .eq('checkin_id', parsed.data.checkin_id)
    .eq('user_id', userId);

  const hadSame = current && current.length === 1 && current[0].reaction === parsed.data.reaction;

  if (current && current.length > 0) {
    await supabase
      .from('checkin_reactions')
      .delete()
      .eq('checkin_id', parsed.data.checkin_id)
      .eq('user_id', userId);
  }

  if (hadSame) {
    revalidatePath('/meu-desempenho');
    return { ok: true, reaction: null };
  }

  const { error } = await supabase.from('checkin_reactions').insert({
    checkin_id: parsed.data.checkin_id,
    user_id: userId,
    reaction: parsed.data.reaction,
  });
  if (error) return { ok: false, error: 'Erro ao reagir' };

  revalidatePath('/meu-desempenho');
  return { ok: true, reaction: parsed.data.reaction };
}

export async function addCheckinCommentAction(input: { checkin_id: string; body: string }): Promise<ActionResult> {
  const parsed = checkinCommentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Não autenticado' };

  const supabase = await createClient();
  const { error } = await supabase.from('checkin_comments').insert({
    checkin_id: parsed.data.checkin_id,
    user_id: userId,
    body: parsed.data.body,
  });
  if (error) return { ok: false, error: 'Erro ao comentar' };

  revalidatePath('/meu-desempenho');
  return { ok: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test tests/lib/actions/social.test.ts
```

Expected: 8 tests pass (5 setPostReaction + 3 addPostComment + 2 setCheckin + 1 addCheckin = wait, let me recount: 5 setPost + 3 addPost + 2 setCheckin + 1 addCheckin = 11. Actually: 4 setPost (rejects unauth, rejects invalid, removes same, inserts none, replaces different) + 3 addPost (rejects invalid, inserts, rejects too long) + 2 setCheckin (inserts clap, rejects non-clap) + 1 addCheckin (inserts). Total = 10).

- [ ] **Step 5: Run full verification**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add app/actions/social.ts tests/lib/actions/social.test.ts
git commit -m "feat(social): 4 server actions (set reactions, add comments) with tests"
```

---


## Task 3: ReactionButton + ReactionBar components

**Files:**
- Create: `components/social/reaction-button.tsx`
- Create: `components/social/reaction-bar.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`, `useToast` from `@/components/ui/toast`, `setPostReactionAction` + `setCheckinReactionAction` from `@/app/actions/social`, `POST_REACTIONS` / `CHECKIN_REACTIONS` from `@/lib/social/emojis`
- Produces:
  - `<ReactionButton emoji label reaction count active target targetId>` (client)
  - `<ReactionBar target targetId engagement compact?>` (server)

- [ ] **Step 1: Create `components/social/reaction-button.tsx`**

```tsx
'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { useToast } from '@/components/ui/toast';
import { setPostReactionAction, setCheckinReactionAction } from '@/app/actions/social';
import { cn } from '@/lib/utils';

export interface ReactionButtonProps {
  emoji: string;
  label: string;
  reaction: string;
  count: number;
  active: boolean;
  target: 'post' | 'checkin';
  targetId: string;
}

export function ReactionButton({ emoji, label, reaction, count, active, target, targetId }: ReactionButtonProps) {
  const [busy, start] = useTransition();
  const { toast } = useToast();

  function onClick() {
    start(async () => {
      const res = target === 'post'
        ? await setPostReactionAction({ post_id: targetId, reaction })
        : await setCheckinReactionAction({ checkin_id: targetId, reaction: 'clap' });
      if (!res.ok) {
        toast({ title: 'Erro', description: res.error, variant: 'error' });
        return;
      }
      if (res.reaction) {
        toast({ title: `${emoji} adicionado!`, variant: 'info' });
      } else {
        toast({ title: 'Removido', variant: 'info' });
      }
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption font-medium transition-colors',
        'border',
        active
          ? 'bg-tier-ouro/20 border-tier-ouro/50 text-text-primary'
          : 'bg-surface-sunken border-transparent hover:bg-surface-canvas text-text-secondary',
        busy && 'opacity-50 pointer-events-none'
      )}
    >
      <span className="text-base" aria-hidden>{emoji}</span>
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}
```

- [ ] **Step 2: Create `components/social/reaction-bar.tsx`**

```tsx
import { ReactionButton } from './reaction-button';
import { POST_REACTIONS, CHECKIN_REACTIONS, type PostReactionKind, type CheckinReactionKind } from '@/lib/social/emojis';

type Engagement = { reactions: Record<string, number>; myReactions: string[] };

const POST_KINDS: PostReactionKind[] = ['fire', 'muscle', 'clap', 'raised', 'laugh'];

export function ReactionBar({
  target,
  targetId,
  engagement,
  compact,
}: {
  target: 'post' | 'checkin';
  targetId: string;
  engagement: Engagement;
  compact?: boolean;
}) {
  if (target === 'post') {
    return (
      <div className={cn('flex flex-wrap gap-1.5', compact && 'gap-1')}>
        {POST_KINDS.map((kind) => {
          const def = POST_REACTIONS[kind];
          return (
            <ReactionButton
              key={kind}
              emoji={def.emoji}
              label={def.label}
              reaction={kind}
              count={engagement.reactions[kind] ?? 0}
              active={engagement.myReactions.includes(kind)}
              target="post"
              targetId={targetId}
            />
          );
        })}
      </div>
    );
  }
  const kind: CheckinReactionKind = 'clap';
  const def = CHECKIN_REACTIONS[kind];
  return (
    <div className="flex">
      <ReactionButton
        emoji={def.emoji}
        label={def.label}
        reaction={kind}
        count={engagement.reactions[kind] ?? 0}
        active={engagement.myReactions.includes(kind)}
        target="checkin"
        targetId={targetId}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
pnpm typecheck && pnpm lint
```

Expected: clean. (The `cn` import requires a small fix — add it to the imports.)

- [ ] **Step 4: Commit**

```bash
git add components/social/reaction-button.tsx components/social/reaction-bar.tsx
git commit -m "feat(social): ReactionBar + ReactionButton (5 emojis post, 1 checkin)"
```

---

## Task 4: CommentForm + Comments components

**Files:**
- Create: `components/social/comment-form.tsx`
- Create: `components/social/comments.tsx`

**Interfaces:**
- Consumes: `Input`/`Button` from `@/components/ui/*`, `useToast`, `useFormState`/`useFormStatus`, `addPostCommentAction`/`addCheckinCommentAction`
- Produces:
  - `<CommentForm target postId? checkinId? />` — client form with char counter
  - `<Comments target postId checkinId comments currentUserId isOwnCheckin? />` — server list + form wrapper

- [ ] **Step 1: Create `components/social/comment-form.tsx`**

```tsx
'use client';

import * as React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { addPostCommentAction, addCheckinCommentAction, type ActionResult } from '@/app/actions/social';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="sm" loading={pending}>Postar</Button>;
}

const POST_MAX = 500;
const CHECKIN_MAX = 300;

export function CommentForm({
  target,
  postId,
  checkinId,
}: {
  target: 'post' | 'checkin';
  postId?: string;
  checkinId?: string;
}) {
  const max = target === 'post' ? POST_MAX : CHECKIN_MAX;
  const action = target === 'post'
    ? addPostCommentAction.bind(null, { post_id: postId! })
    : addCheckinCommentAction.bind(null, { checkin_id: checkinId! });

  const [state, formAction] = useFormState<ActionResult | null, FormData>(action, null);
  const { toast } = useToast();
  const [body, setBody] = React.useState('');

  React.useEffect(() => {
    if (state?.ok) {
      setBody('');
      toast({ title: 'Comentário publicado', variant: 'success' });
    } else if (state && !state.ok) {
      toast({ title: 'Erro', description: state.error, variant: 'error' });
    }
  }, [state, toast]);

  const nearLimit = body.length > max - 50;
  const overLimit = body.length > max;

  return (
    <form action={formAction} className="flex items-start gap-2">
      <input type="hidden" name="body" value={body} />
      <div className="flex-1">
        <Input
          name="_display"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={target === 'post' ? 'Fala aí...' : 'Deixa um elogio'}
          maxLength={max + 100}
          aria-invalid={overLimit}
        />
        <div className="flex items-center justify-between mt-1">
          <p className={cn('text-caption', nearLimit ? 'text-state-warning-strong' : 'text-text-muted')}>
            {body.length}/{max}
          </p>
        </div>
      </div>
      <SubmitBtn />
    </form>
  );
}
```

- [ ] **Step 2: Create `components/social/comments.tsx`**

```tsx
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatRelative } from '@/lib/utils';
import { CommentForm } from './comment-form';
import { MessageCircle } from 'lucide-react';
import { initials } from '@/lib/utils';

type Comment = {
  id: string;
  body: string;
  created_at: string;
  user: { full_name: string; username: string; avatar_url: string | null };
};

export function Comments({
  target,
  postId,
  checkinId,
  comments,
  currentUserId,
}: {
  target: 'post' | 'checkin';
  postId?: string;
  checkinId?: string;
  comments: Comment[];
  currentUserId: string;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-h4 text-text-primary flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        Conversa <span className="text-caption text-text-muted">({comments.length})</span>
      </h3>

      {comments.length === 0 ? (
        <p className="text-body-sm text-text-secondary">Ninguém falou nada ainda. Fala aí.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-brand-azul text-white text-caption font-semibold">
                  {initials(c.user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-body-sm font-medium text-text-primary">{c.user.full_name}</span>
                  <span className="text-caption text-text-muted">@{c.user.username} · {formatRelative(c.created_at)}</span>
                </div>
                <p className="text-body-sm text-text-primary whitespace-pre-wrap break-words mt-0.5">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-2 border-t border-border-subtle">
        <CommentForm target={target} postId={postId} checkinId={checkinId} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
pnpm typecheck && pnpm lint
```

Expected: clean. The `addPostCommentAction.bind(null, {...})` pattern is the same used in `edit-post-form.tsx` (Task 13 of v1).

- [ ] **Step 4: Commit**

```bash
git add components/social/comment-form.tsx components/social/comments.tsx
git commit -m "feat(social): Comments + CommentForm (flat list, char counter)"
```

---


## Task 5: Integrate into PostCard (timeline) and Post detail page

**Files:**
- Modify: `components/posts/post-card.tsx` (add reaction bar + comment count)
- Modify: `app/(app)/post/[id]/page.tsx` (add Conversa section + full reactions)

**Interfaces:**
- Consumes: `ReactionBar`, `Comments`, `getPostsEngagementBatch`, `getPostEngagement`, `getCheckinEngagement` (already imported in detail page)
- Produces: Updated PostCard with reaction bar; updated detail page with full conversation

- [ ] **Step 1: Modify `components/posts/post-card.tsx`**

The current card calls `<Link>` to detail and shows network + title + "Abrir original". Add the reaction bar (compact) and a comment count link.

Add at the top of the file:

```tsx
import { ReactionBar } from '@/components/social/reaction-bar';
import { MessageCircle } from 'lucide-react';
```

In the component signature, accept a new prop `engagement`:

```tsx
import type { PostEngagement } from '@/lib/queries/posts';

export function PostCard({ post, engagement }: { post: Post; engagement?: PostEngagement }) {
```

After the description `<p>` (and before "Abrir publicação original" link), insert:

```tsx
      {engagement && (
        <div className="mt-3 space-y-2">
          <ReactionBar
            target="post"
            targetId={post.id}
            engagement={engagement}
            compact
          />
          <Link
            href={`/post/${post.id}#conversa`}
            className="inline-flex items-center gap-1.5 text-caption text-text-muted hover:text-brand-azul"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="tabular-nums">{engagement.commentCount}</span>
            <span>{engagement.commentCount === 1 ? 'comentário' : 'comentários'}</span>
          </Link>
        </div>
      )}
```

- [ ] **Step 2: Update timeline page `app/(app)/timeline/page.tsx` to pass engagement**

In the existing `getTimeline` call, also fetch engagement batch. Replace the page's main render with:

```tsx
import { getTimeline, getPostsEngagementBatch, type PostEngagement } from '@/lib/queries/posts';
import { createClient } from '@/lib/supabase/server';

// inside the component:
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
const posts = await getTimeline({ network, search });
const engagementMap = await getPostsEngagementBatch(
  posts.map((p) => p.id),
  user?.id ?? null
);

// in the JSX:
{posts.map((p) => <PostCard key={p.id} post={p} engagement={engagementMap.get(p.id)} />)}
```

- [ ] **Step 3: Modify `app/(app)/post/[id]/page.tsx`**

Add the Conversa section after the CheckinButtons card:

```tsx
import { ReactionBar } from '@/components/social/reaction-bar';
import { Comments } from '@/components/social/comments';
import { getPostEngagement } from '@/lib/queries/posts';
import { createClient } from '@/lib/supabase/server';

// inside the page:
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
const engagement = await getPostEngagement(post.id, user?.id ?? null);

// fetch post comments with user info (ordered desc)
const { data: postComments } = await supabase
  .from('post_comments')
  .select('id, body, created_at, user:profiles!post_comments_user_id_fkey(full_name, username, avatar_url)')
  .eq('post_id', post.id)
  .order('created_at', { ascending: false })
  .limit(50);

// after the CheckinButtons card, add a new card:
<Card id="conversa">
  <CardBody className="space-y-5">
    <ReactionBar target="post" targetId={post.id} engagement={engagement} />
    <Comments
      target="post"
      postId={post.id}
      comments={(postComments ?? []) as any}
      currentUserId={user!.id}
    />
  </CardBody>
</Card>
```

- [ ] **Step 4: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm build
```

Expected: clean. The `user!.id` non-null assertion is safe because the page is wrapped by `requireUser()`.

- [ ] **Step 5: Commit**

```bash
git add components/posts/post-card.tsx app/\(app\)/timeline/page.tsx app/\(app\)/post/\[id\]/page.tsx
git commit -m "feat(social): integrate reaction bar + comments in PostCard and Post detail"
```

---

## Task 6: Integrate into CheckinHistoryList + seed demo data + final verification

**Files:**
- Modify: `components/posts/checkin-history-list.tsx` (show reactions + comments inline, with collapsible expand)
- Modify: `supabase/seed-demo.sql` (add sample reactions + comments)
- Test: apply seed via `supabase db query --linked`

**Interfaces:**
- Consumes: `ReactionBar` (checkin target), `Comments`, `getCheckinEngagement` (called from parent page)
- Produces: History list with inline reaction counts + expandable comments; seed has demo data so user can immediately see new features

- [ ] **Step 1: Modify `components/posts/checkin-history-list.tsx`**

The list currently shows status badge, cover, network, action label, time, points. Add a footer with reaction bar + collapsible comments.

Add to imports:

```tsx
import { useState } from 'react';
import { ReactionBar } from '@/components/social/reaction-bar';
import { ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { Comments } from '@/components/social/comments';
import type { CheckinEngagement } from '@/lib/queries/checkins';
```

In the `Item` type, add optional `engagement` and `currentUserId`. In the component, accept these as new props.

In each item's CardBody, after the status badge row, add a footer div:

```tsx
{engagement && (
  <div className="mt-3 pt-3 border-t border-border-subtle space-y-2">
    <ReactionBar
      target="checkin"
      targetId={it.id}
      engagement={engagement}
    />
    <button
      onClick={() => setOpenId(isOpen ? null : it.id)}
      className="inline-flex items-center gap-1.5 text-caption text-text-muted hover:text-brand-azul"
    >
      <MessageCircle className="h-4 w-4" />
      <span className="tabular-nums">{engagement.commentCount}</span>
      <span>{engagement.commentCount === 1 ? 'comentário' : 'comentários'}</span>
      {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
    </button>
    {isOpen && (
      <div className="pt-2">
        <Comments
          target="checkin"
          checkinId={it.id}
          comments={engagement.comments}
          currentUserId={currentUserId!}
        />
      </div>
    )}
  </div>
)}
```

The `useState` lives at the component level (not per-item). Use a single `openId: string | null` state. Each item checks `openId === it.id` to determine `isOpen`.

- [ ] **Step 2: Update `app/(app)/meu-desempenho/page.tsx` to fetch engagement per checkin**

Add to the page (after the existing items query):

```tsx
import { getCheckinEngagement } from '@/lib/queries/checkins';
import { createClient } from '@/lib/supabase/server';

// inside the page:
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

const engagementMap = new Map<string, CheckinEngagement>();
if (items && items.length > 0 && user) {
  await Promise.all(
    (items as any[]).map(async (it: any) => {
      if (it.id) {
        const eng = await getCheckinEngagement(it.id, user.id);
        engagementMap.set(it.id, eng);
      }
    })
  );
}
```

Pass `engagement` and `currentUserId` to `<CheckinHistoryList>`:

```tsx
<CheckinHistoryList
  items={(items ?? []) as any}
  engagementMap={engagementMap}
  currentUserId={user!.id}
/>
```

And update `CheckinHistoryList` props:

```tsx
export function CheckinHistoryList({
  items,
  engagementMap,
  currentUserId,
}: {
  items: Item[];
  engagementMap: Map<string, CheckinEngagement>;
  currentUserId: string;
}) {
```

- [ ] **Step 3: Update `supabase/seed-demo.sql` to add sample reactions and comments**

Append at the end of the file (after the existing checkins insert):

```sql
-- 6) Sample reactions (post and checkin)
insert into public.post_reactions (post_id, user_id, reaction) values
  ((select id from public.posts where title like '5 erros comuns%' limit 1),
   '11111111-1111-1111-1111-111111111111', 'fire'),
  ((select id from public.posts where title like '5 erros comuns%' limit 1),
   '22222222-2222-2222-2222-222222222222', 'fire'),
  ((select id from public.posts where title like '5 erros comuns%' limit 1),
   '33333333-3333-3333-3333-333333333333', 'clap'),
  ((select id from public.posts where title like 'Como o SEBRAE pode%' limit 1),
   '11111111-1111-1111-1111-111111111111', 'muscle'),
  ((select id from public.posts where title like 'Sebrae Delas%' limit 1),
   '22222222-2222-2222-2222-222222222222', 'raised'),
  ((select id from public.posts where title like 'Dicas rápidas%' limit 1),
   '33333333-3333-3333-3333-333333333333', 'fire'),
  ((select id from public.posts where title like 'Dicas rápidas%' limit 1),
   '44444444-4444-4444-4444-444444444444', 'laugh')
on conflict (post_id, user_id, reaction) do nothing;

insert into public.post_comments (post_id, user_id, body) values
  ((select id from public.posts where title like '5 erros comuns%' limit 1),
   '11111111-1111-1111-1111-111111111111', 'Contei pelo menos dois desses no meu MEI! Valeu demais.'),
  ((select id from public.posts where title like '5 erros comuns%' limit 1),
   '22222222-2222-2222-2222-222222222222', 'Vou compartilhar com a galera do meu coworking.'),
  ((select id from public.posts where title like 'Como o SEBRAE pode%' limit 1),
   '33333333-3333-3333-3333-333333333333', 'Participamos do programa de aceleração no ano passado, recomendo!')
on conflict do nothing;

-- Checkin reactions (clap) from other users
insert into public.checkin_reactions (checkin_id, user_id, reaction) values
  ((select id from public.checkins where user_id='11111111-1111-1111-1111-111111111111' and action='like' and status='approved' limit 1),
   '22222222-2222-2222-2222-222222222222', 'clap'),
  ((select id from public.checkins where user_id='11111111-1111-1111-1111-111111111111' and action='share' and status='approved' limit 1),
   '33333333-3333-3333-3333-333333333333', 'clap'),
  ((select id from public.checkins where user_id='22222222-2222-2222-2222-222222222222' and action='comment' and status='approved' limit 1),
   '11111111-1111-1111-1111-111111111111', 'clap')
on conflict (checkin_id, user_id, reaction) do nothing;

insert into public.checkin_comments (checkin_id, user_id, body) values
  ((select id from public.checkins where user_id='11111111-1111-1111-1111-111111111111' and action='like' and status='approved' limit 1),
   '22222222-2222-2222-2222-222222222222', 'Tamo junto!'),
  ((select id from public.checkins where user_id='22222222-2222-2222-2222-222222222222' and action='share' and status='approved' limit 1),
   '11111111-1111-1111-1111-111111111111', 'Arrasou Pedro!')
on conflict do nothing;
```

- [ ] **Step 4: Apply seed to cloud**

```bash
pnpm exec supabase db query --linked -f supabase/seed-demo.sql 2>&1 | tail -5
```

Expected: applied without error.

- [ ] **Step 5: Final verification**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Expected: all clean. ≥ 41 tests passing (31 v1 + 10 social).

- [ ] **Step 6: Commit**

```bash
git add components/posts/checkin-history-list.tsx app/\(app\)/meu-desempenho/page.tsx supabase/seed-demo.sql
git commit -m "feat(social): checkin history reactions/comments + seed sample data"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| §3 Mudanças vs v1 | All tasks touch listed items |
| §4 Modelo de dados (4 tabelas) | Task 1 (migration) |
| §5 RLS | Task 1 (policies in migration) |
| §6 Server actions (4) | Task 2 |
| §7 Queries (3) | Task 1 (functions in queries files) |
| §8.1 emojis.ts | Task 1 |
| §8.2 ReactionBar + ReactionButton | Task 3 |
| §8.2 Comments + CommentForm | Task 4 |
| §8.3 PostCard integration | Task 5 |
| §8.3 Post detail integration | Task 5 |
| §8.3 CheckinHistoryList integration | Task 6 |
| §9 Microcopy | All tasks (toast variants + empty states + placeholders) |
| §10 Estados transversais | Existing primitives (Skeleton, Toast) reused |
| §11 Segurança | RLS in migration; Zod in actions; no XSS (React default); no `dangerouslySetInnerHTML` |
| §12 YAGNI | None of the listed out-of-scope items are included |
| §13 Critérios de sucesso | Manual verification after each task; final `pnpm build` green |

**Placeholder scan:** No "TBD", "TODO", "later", "similar to", "fill in". All steps have concrete code.

**Type consistency:**
- `setPostReactionAction` returns `SocialActionResult` with `reaction: string | null` (matches spec §6.1).
- `setCheckinReactionAction` returns same shape.
- `addPostCommentAction` / `addCheckinCommentAction` return `ActionResult`.
- `getPostEngagement` returns `PostEngagement` (matches `components/social/reaction-bar.tsx` prop shape).
- `getCheckinEngagement` returns `CheckinEngagement` with embedded `comments` (used by `<Comments>` in checkin context).
- `POST_REACTIONS` / `CHECKIN_REACTIONS` types referenced consistently across ReactionButton, ReactionBar, and the comment form's emoji labels.
- `useState` for `openId` in CheckinHistoryList: single state, per-item check via `openId === it.id` — clean.

**Potential issues for implementer to watch:**
- The `supabase.from('post_comments').select('user:profiles!post_comments_user_id_fkey(...)')` embed syntax depends on Supabase correctly resolving the FK name. If it doesn't work, simplify to a two-step fetch (comments, then profiles by IDs).
- `user!.id` in detail page assumes `requireUser()` is called; this is true at the top of the file but the type narrowing might need a non-null assertion or refactor.
- The `getCheckinEngagement` fetch loop in Task 6 fires N+1 queries (one per checkin). For 50 items this is fine, but if it grows, refactor to a batch query in a follow-up task.
