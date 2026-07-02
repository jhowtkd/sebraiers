# Fase 2 — Remover mock mode + design-preview: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover completamente o "mock mode" (`USE_MOCK`/`IS_MOCK`/`lib/mock/`) e a página demo órfã `design-preview`, eliminando o risco de segurança de bypass de auth em produção e removendo ~1.200 linhas de código morto/demo.

**Architecture:** Remoção de fora pra dentro (consumidores → raiz). Primeiro remove os ramificações `if (IS_MOCK)` e os imports de `@/lib/mock/db` em cada consumidor (auth, middleware, 4 queries), deixando só o caminho Supabase real. Depois deleta a raiz (`lib/mock/`, `lib/data-source/`), a página demo (`app/design-preview/`), e os scripts de screenshot que só a servem. Por fim limpa variáveis de ambiente. Os testes são independentes do mock (mockam Supabase diretamente) — não quebram.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase. Edits manuais (não há TDD aqui porque é remoção; a verificação é `typecheck` + `test` + `build` + `lint` passando ao final).

## Global Constraints

- O caminho Supabase real em cada query/auth **já existe** ao lado do `if (IS_MOCK)` — a tarefa é só remover o ramo mock e o import, nunca reescrever a lógica real.
- **Nunca** deixar `USE_MOCK`/`NEXT_PUBLIC_USE_MOCK` alcançável em produção. Após esta fase, `IS_MOCK` deixa de existir.
- A suite de testes (111 specs) **não importa** de `lib/mock` nem referencia `IS_MOCK` — mockam Supabase via `vi.mock('@/lib/supabase/server')`. Remover o mock não quebra testes.
- Cada task termina com `pnpm typecheck` passando (garante que nenhum import ficou quebrado).

---

## File Structure

**Arquivos a editar (remover imports + blocos `if (IS_MOCK)`):**
- `lib/auth.ts` — 5 blocos mock + import
- `lib/queries/posts.ts` — 5 blocos mock + imports
- `lib/queries/checkins.ts` — 3 blocos mock + imports
- `lib/queries/ranking.ts` — 1 bloco mock + imports
- `lib/queries/me.ts` — 5 blocos mock + imports
- `middleware.ts` — 1 bloco mock + import + 2 refs a `design-preview`

**Arquivos a deletar:**
- `lib/mock/db.ts` (615 linhas)
- `lib/mock/` (diretório inteiro)
- `lib/data-source/env.ts`, `lib/data-source/index.ts` (diretório inteiro)
- `app/design-preview/page.tsx` (527 linhas) + diretório
- `scripts/screenshot.mjs`, `scripts/screenshot-card.mjs` (só servem ao design-preview)

**Arquivos a editar (config/env):**
- `.env.local` — remover bloco "Demo mode" com `USE_MOCK`

---

## Task 1: Limpar mock de `lib/auth.ts`

**Files:**
- Modify: `lib/auth.ts`

**Interfaces:**
- Consumes: nada (primeira task).
- Produces: `lib/auth.ts` sem dependência de mock. Funções `getSession`, `getCurrentProfile`, `getAuthHeaderContext`, `requireUser`, `requireAdmin` expostas como antes (mesmas assinaturas) — consumidores (queries, actions, layout) não percebem mudança.

- [ ] **Step 1: Reescrever `lib/auth.ts` removendo os 5 blocos `if (IS_MOCK)` e o import de `@/lib/mock/db`**

Substituir o conteúdo integral do arquivo por:

```typescript
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

export const getSession = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSession();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  return data;
});

export type AuthHeaderContext = {
  user: User;
  fullName: string;
  username: string;
  isAdmin: boolean;
  avatarUrl: string | null;
};

/** Single auth + profile fetch for layout header (deduped per request via cache). */
export const getAuthHeaderContext = cache(async (): Promise<AuthHeaderContext | null> => {
  const user = await getSession();
  if (!user) return null;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username, is_admin, avatar_url')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile) return null;
  return {
    user,
    fullName: profile.full_name,
    username: profile.username,
    isAdmin: profile.is_admin === true,
    avatarUrl: profile.avatar_url ?? null,
  };
});

export async function requireUser() {
  const user = await getSession();
  if (!user) redirect('/login');
  return user;
}

export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  if (!profile.is_admin) redirect('/timeline');
  return profile;
}
```

Nota: `AGENCY_ADMIN_EMAIL_DOMAIN` e `isAgencyAdminEmail` (linhas 86-91 do arquivo original) também são código morto, mas pertencem à Fase 3 — **não remover aqui** para manter esta fase focada só no mock. (Verificação: nenhuma das duas referencia `IS_MOCK`.)

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm typecheck`
Expected: passa sem erros. (Ainda há consumers importando de `lib/mock/db` nas queries — mas `lib/auth.ts` em si não importa mais.)

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "refactor(auth): remove mock-mode branches from auth helpers"
```

---

## Task 2: Limpar mock de `lib/queries/posts.ts`

**Files:**
- Modify: `lib/queries/posts.ts`

**Interfaces:**
- Consumes: `BaseEngagement`, `CommentWithUser`, `buildEngagementBatch`, `countReactions` de `@/lib/social/engagement` (inalterados).
- Produces: `getTimeline`, `getPostById`, `getPostEngagement`, `getPostsEngagementBatch`, `getPostEngagementWithComments` com mesmas assinaturas — só o caminho Supabase.

- [ ] **Step 1: Reescrever `lib/queries/posts.ts` removendo imports de mock e os 5 blocos `if (IS_MOCK)`**

Substituir o conteúdo integral do arquivo por:

```typescript
import 'server-only';
import { createClient } from '@/lib/supabase/server';
import {
  buildEngagementBatch,
  countReactions,
  type BaseEngagement,
  type CommentWithUser,
} from '@/lib/social/engagement';
import type { Post, Network } from '@/lib/types';

export type PostEngagement = BaseEngagement;

export type { CommentWithUser };

export async function getTimeline(opts: { network?: Network | 'all'; search?: string } = {}): Promise<Post[]> {
  const supabase = await createClient();
  let q = supabase.from('posts').select('*, author:profiles!posts_created_by_fkey(full_name, username, avatar_url)').eq('is_active', true)
    .order('published_at', { ascending: false }).limit(100);
  if (opts.network && opts.network !== 'all') q = q.eq('network', opts.network);
  if (opts.search) q = q.ilike('title', `%${opts.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Post[];
}

export async function getPostById(id: string): Promise<Post | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('posts').select('*').eq('id', id).eq('is_active', true).maybeSingle();
  if (error) throw error;
  return data as Post | null;
}

export async function getPostEngagement(postId: string, userId: string | null): Promise<PostEngagement> {
  const supabase = await createClient();
  const [rxRes, myRxRes, countRes] = await Promise.all([
    supabase.from('post_reactions').select('reaction').eq('post_id', postId),
    userId
      ? supabase.from('post_reactions').select('reaction').eq('post_id', postId).eq('user_id', userId)
      : Promise.resolve({ data: [] as { reaction: string }[] | null }),
    supabase.from('post_comments').select('id', { count: 'exact', head: true }).eq('post_id', postId),
  ]);
  return {
    reactions: countReactions(rxRes.data ?? []),
    myReactions: (myRxRes.data ?? []).map((r: { reaction: string }) => r.reaction),
    commentCount: countRes.count ?? 0,
  };
}

export async function getPostsEngagementBatch(
  postIds: string[],
  userId: string | null
): Promise<Map<string, PostEngagement>> {
  if (postIds.length === 0) return new Map();
  const supabase = await createClient();
  const [rxRes, myRxRes, commentsRes] = await Promise.all([
    supabase.from('post_reactions').select('post_id, reaction').in('post_id', postIds),
    userId
      ? supabase.from('post_reactions').select('post_id, reaction').in('post_id', postIds).eq('user_id', userId)
      : Promise.resolve({ data: [] as { post_id: string; reaction: string }[] | null }),
    supabase.from('post_comments').select('post_id').in('post_id', postIds),
  ]);
  return buildEngagementBatch(
    postIds,
    (rxRes.data ?? []).map((r: { post_id: string; reaction: string }) => ({ id: r.post_id, reaction: r.reaction })),
    (myRxRes.data ?? []).map((r: { post_id: string; reaction: string }) => ({ id: r.post_id, reaction: r.reaction })),
    (commentsRes.data ?? []).map((c: { post_id: string }) => ({ id: c.post_id }))
  );
}

export async function getPostEngagementWithComments(
  postId: string,
  userId: string | null
): Promise<PostEngagement & { comments: CommentWithUser[] }> {
  const supabase = await createClient();
  const [engagement, commentsRes] = await Promise.all([
    getPostEngagement(postId, userId),
    supabase.from('post_comments')
      .select('id, body, created_at, user:profiles!post_comments_user_id_fkey(full_name, username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  return {
    ...engagement,
    comments: (commentsRes.data ?? []) as unknown as CommentWithUser[],
  };
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm typecheck`
Expected: passa sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/queries/posts.ts
git commit -m "refactor(queries): remove mock-mode branches from posts queries"
```

---

## Task 3: Limpar mock de `lib/queries/checkins.ts`

**Files:**
- Modify: `lib/queries/checkins.ts`

**Interfaces:**
- Consumes: `getSession` de `@/lib/auth`, `buildEngagementBatch`/`countReactions`/tipos de `@/lib/social/engagement`.
- Produces: `getMyCheckinsForPost`, `getCheckinEngagement`, `getCheckinsEngagementBatch`, `getMyCheckinsWithPost` com mesmas assinaturas.

- [ ] **Step 1: Reescrever `lib/queries/checkins.ts` removendo imports de mock e os 3 blocos `if (IS_MOCK)`**

Substituir o conteúdo integral do arquivo por:

```typescript
import 'server-only';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { buildEngagementBatch, countReactions, type BaseEngagement, type CommentWithUser } from '@/lib/social/engagement';
import type { Checkin, Network } from '@/lib/types';

type CheckinWithPost = Checkin & { post: { id: string; title: string; network: Network; cover_url: string | null } | null };

export async function getMyCheckinsForPost(postId: string): Promise<Checkin[]> {
  const user = await getSession();
  if (!user) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from('checkins').select('*')
    .eq('user_id', user.id).eq('post_id', postId).order('declared_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Checkin[];
}

export type CheckinEngagement = BaseEngagement & {
  comments: CommentWithUser[];
};

export async function getCheckinEngagement(checkinId: string, userId: string | null): Promise<CheckinEngagement> {
  const supabase = await createClient();
  const [rxRes, myRxRes, countRes, commentsRes] = await Promise.all([
    supabase.from('checkin_reactions').select('reaction').eq('checkin_id', checkinId),
    userId
      ? supabase.from('checkin_reactions').select('reaction').eq('checkin_id', checkinId).eq('user_id', userId)
      : Promise.resolve({ data: [] as { reaction: string }[] | null }),
    supabase.from('checkin_comments').select('id', { count: 'exact', head: true }).eq('checkin_id', checkinId),
    supabase.from('checkin_comments')
      .select('id, body, created_at, user:profiles!checkin_comments_user_id_fkey(full_name, username, avatar_url)')
      .eq('checkin_id', checkinId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  return {
    reactions: countReactions(rxRes.data ?? []),
    myReactions: (myRxRes.data ?? []).map((r: { reaction: string }) => r.reaction),
    commentCount: countRes.count ?? 0,
    comments: (commentsRes.data ?? []) as unknown as CommentWithUser[],
  };
}

export async function getCheckinsEngagementBatch(
  checkinIds: string[],
  userId: string | null
): Promise<Map<string, BaseEngagement>> {
  if (checkinIds.length === 0) return new Map();
  const supabase = await createClient();
  const [rxRes, myRxRes, commentsRes] = await Promise.all([
    supabase.from('checkin_reactions').select('checkin_id, reaction').in('checkin_id', checkinIds),
    userId
      ? supabase.from('checkin_reactions').select('checkin_id, reaction').in('checkin_id', checkinIds).eq('user_id', userId)
      : Promise.resolve({ data: [] as { checkin_id: string; reaction: string }[] | null }),
    supabase.from('checkin_comments').select('checkin_id').in('checkin_id', checkinIds),
  ]);
  return buildEngagementBatch(
    checkinIds,
    (rxRes.data ?? []).map((r: { checkin_id: string; reaction: string }) => ({ id: r.checkin_id, reaction: r.reaction })),
    (myRxRes.data ?? []).map((r: { checkin_id: string; reaction: string }) => ({ id: r.checkin_id, reaction: r.reaction })),
    (commentsRes.data ?? []).map((c: { checkin_id: string }) => ({ id: c.checkin_id }))
  );
}

/** @deprecated Use getMyPerformanceDashboard from lib/queries/me */
export async function getMyCheckinsWithPost(): Promise<CheckinWithPost[]> {
  const user = await getSession();
  if (!user) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from('checkins')
    .select('*, post:posts(id, title, network, cover_url)')
    .eq('user_id', user.id).order('declared_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as CheckinWithPost[];
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm typecheck`
Expected: passa sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/queries/checkins.ts
git commit -m "refactor(queries): remove mock-mode branches from checkins queries"
```

---

## Task 4: Limpar mock de `lib/queries/ranking.ts`

**Files:**
- Modify: `lib/queries/ranking.ts`

**Interfaces:**
- Consumes: `getSession` de `@/lib/auth`, `sortRanking`/`RankingRow` de `@/lib/ranking`.
- Produces: `getRanking` com mesma assinatura.

- [ ] **Step 1: Reescrever `lib/queries/ranking.ts` removendo o import de mock e o bloco `if (IS_MOCK)`**

Substituir o conteúdo integral do arquivo por:

```typescript
import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';
import { sortRanking, type RankingRow } from '@/lib/ranking';

export async function getRanking(limit = 50): Promise<{ top: RankingRow[]; myPosition: number; me: RankingRow | null }> {
  const user = await getSession();
  const supabase = await createClient();

  const [leaderboardRes, rankRes] = await Promise.all([
    supabase.rpc('get_leaderboard', { p_limit: limit }),
    user ? supabase.rpc('get_user_rank', { p_user_id: user.id }) : Promise.resolve({ data: 0, error: null }),
  ]);

  if (leaderboardRes.error) throw leaderboardRes.error;

  const top = sortRanking((leaderboardRes.data ?? []) as RankingRow[]);
  const myPosition = user ? Number(rankRes.data ?? 0) : 0;
  const me = user ? top.find((r) => r.user_id === user.id) ?? null : null;

  return { top, myPosition, me };
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm typecheck`
Expected: passa sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/queries/ranking.ts
git commit -m "refactor(queries): remove mock-mode branch from ranking query"
```

---

## Task 5: Limpar mock de `lib/queries/me.ts`

**Files:**
- Modify: `lib/queries/me.ts`

**Interfaces:**
- Consumes: `createClient`, `getSession`, `getCheckinsEngagementBatch`/`CheckinEngagement`, tipos de `@/lib/queries/dashboard-types`.
- Produces: `getMyPoints`, `getMyWeeklyPoints`, `getMyStreakDays`, `getMyPerformanceDashboard`, `getMyCheckins` com mesmas assinaturas.

- [ ] **Step 1: Reescrever `lib/queries/me.ts` removendo os imports de mock e os 5 blocos `if (IS_MOCK)`**

Substituir o conteúdo integral do arquivo por:

```typescript
import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';
import type { CheckinWithPostSummary } from '@/lib/types';
import { getCheckinsEngagementBatch, type CheckinEngagement } from '@/lib/queries/checkins';
import type { PerformanceDashboard, PerformanceTotals, MyCheckin } from '@/lib/queries/dashboard-types';

export type { PerformanceDashboard, PerformanceTotals, MyCheckin } from '@/lib/queries/dashboard-types';

export async function getMyPoints(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_points')
    .select('total_points')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return 0;
  return data?.total_points ?? 0;
}

export async function getMyWeeklyPoints(userId: string): Promise<number> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { data, error } = await supabase
    .from('checkins')
    .select('points')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .gte('decided_at', since.toISOString());
  if (error) return 0;
  return (data ?? []).reduce((acc: number, c: { points: number }) => acc + c.points, 0);
}

export async function getMyStreakDays(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('checkins')
    .select('decided_at')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .order('decided_at', { ascending: false })
    .limit(60);
  if (error || !data || data.length === 0) return 0;

  const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);
  const days = new Set((data as { decided_at: string }[]).map((c) => dayKey(c.decided_at)));

  let streak = 0;
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

async function fetchMyCheckinsWithPost(userId: string, limit = 50): Promise<CheckinWithPostSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('checkins')
    .select('id, action, status, points, declared_at, decided_at, post:posts(id, title, network, cover_url)')
    .eq('user_id', userId)
    .order('declared_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as CheckinWithPostSummary[];
}

async function fetchCheckinStatusTotals(userId: string): Promise<PerformanceTotals> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('checkins')
    .select('status, points')
    .eq('user_id', userId);
  if (error) {
    return { total_points: 0, approved: 0, pending: 0, rejected: 0 };
  }
  return (data ?? []).reduce(
    (acc, r) => {
      if (r.status === 'approved') {
        acc.approved += 1;
        acc.total_points += r.points;
      } else if (r.status === 'pending') acc.pending += 1;
      else if (r.status === 'rejected') acc.rejected += 1;
      return acc;
    },
    { total_points: 0, approved: 0, pending: 0, rejected: 0 }
  );
}

export async function getMyPerformanceDashboard(userId: string): Promise<PerformanceDashboard> {
  const [totalPoints, weeklyPoints, streakDays, totals, checkins] = await Promise.all([
    getMyPoints(userId),
    getMyWeeklyPoints(userId),
    getMyStreakDays(userId),
    fetchCheckinStatusTotals(userId),
    fetchMyCheckinsWithPost(userId),
  ]);

  const batched = await getCheckinsEngagementBatch(
    checkins.map((it) => it.id),
    userId
  );
  const engagementMap = new Map<string, CheckinEngagement>();
  for (const it of checkins) {
    const b = batched.get(it.id);
    engagementMap.set(it.id, {
      reactions: b?.reactions ?? {},
      myReactions: b?.myReactions ?? [],
      commentCount: b?.commentCount ?? 0,
      comments: [],
    });
  }

  return { totalPoints, weeklyPoints, streakDays, totals, checkins, engagementMap };
}

/** @deprecated Use getMyPerformanceDashboard */
export async function getMyCheckins(limit = 30): Promise<MyCheckin[]> {
  const user = await getSession();
  if (!user) return [];
  return fetchMyCheckinsWithPost(user.id, limit);
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm typecheck`
Expected: passa sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/queries/me.ts
git commit -m "refactor(queries): remove mock-mode branches from me queries"
```

---

## Task 6: Limpar mock e design-preview de `middleware.ts`

**Files:**
- Modify: `middleware.ts`

**Interfaces:**
- Consumes: nada externo novo.
- Produces: `middleware` sem bypass de auth por mock; matcher sem `design-preview`.

- [ ] **Step 1: Reescrever `middleware.ts` removendo o import `IS_MOCK`, o bloco `if (IS_MOCK)`, a linha pública `design-preview` e a entrada `design-preview` no matcher**

Substituir o conteúdo integral do arquivo por:

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // Rotas públicas não precisam de auth
  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/_design') ||
    pathname.startsWith('/api/public') ||
    pathname === '/api/sync' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/manifest.json';

  if (isPublic) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...options });
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Admin gate (JWT claim synced from profiles.is_admin via DB trigger)
  if (pathname.startsWith('/admin')) {
    if (user.app_metadata?.is_admin !== true) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/timeline';
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo-.*\\.svg|tokens\\.css|_design).*)'],
};
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm typecheck`
Expected: passa sem erros.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "refactor(middleware): remove mock-mode bypass and design-preview route"
```

---

## Task 7: Deletar `lib/mock/`, `lib/data-source/`, `app/design-preview/` e os scripts de screenshot

**Files:**
- Delete: `lib/mock/db.ts` (e diretório `lib/mock/`)
- Delete: `lib/data-source/env.ts`, `lib/data-source/index.ts` (e diretório `lib/data-source/`)
- Delete: `app/design-preview/page.tsx` (e diretório `app/design-preview/`)
- Delete: `scripts/screenshot.mjs`, `scripts/screenshot-card.mjs`

**Interfaces:**
- Consumes: Tasks 1-6 já removeram todos os imports destes arquivos.
- Produces: diretórios e arquivos demo/removidos.

- [ ] **Step 1: Confirmar que NENHUM arquivo de código ainda importa destes alvos**

Run:
```bash
grep -rn "@/lib/mock\|@/lib/data-source\|design-preview" --include="*.ts" --include="*.tsx" --include="*.mjs" app components lib middleware.ts cloudflare 2>/dev/null || echo "limpo"
```
Expected: `limpo` (nenhuma referência restante). Se aparecer qualquer referência, **PARAR** — alguma task anterior deixou passar.

- [ ] **Step 2: Deletar os arquivos e diretórios**

Run:
```bash
rm -rf lib/mock lib/data-source app/design-preview scripts/screenshot.mjs scripts/screenshot-card.mjs
rmdir scripts 2>/dev/null || true
```

- [ ] **Step 3: Confirmar que foram removidos**

Run:
```bash
test ! -e lib/mock && test ! -e lib/data-source && test ! -e app/design-preview && test ! -e scripts/screenshot.mjs && test ! -e scripts/screenshot-card.mjs && echo "tudo removido" || echo "FALTA algo"
```
Expected: `tudo removido`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: delete mock data-source, design-preview page, and screenshot scripts

Removes lib/mock/db.ts (615 lines), lib/data-source/ (env seam),
app/design-preview/ (527-line orphan demo), and the two screenshot
scripts that only served design-preview. Mock mode no longer exists;
the app runs exclusively against Supabase."
```

---

## Task 8: Limpar variável `USE_MOCK` do `.env.local`

**Files:**
- Modify: `.env.local` (arquivo git-ignorado; não gera commit mas deve ser limpo)

**Interfaces:**
- Consumes: nada.
- Produces: `.env.local` sem `USE_MOCK`.

> ⚠️ `.env.local` está no `.gitignore` e não é commitado. Esta task é uma limpeza local — o agente deve editar o arquivo mas **não** tentar commitá-lo.

- [ ] **Step 1: Remover o bloco "Demo mode" / `USE_MOCK` do `.env.local`**

Remover estas linhas (bloco aproximado, linhas 19-22 segundo inventário) do `.env.local`:
```
# ===== Demo mode =====
# Ativa o modo demo (dados mock, sem Supabase).
# CUIDADO: NUNCA usar em produção — bypassa autenticação.
USE_MOCK=true
```
Deixar as demais variáveis intactas.

- [ ] **Step 2: Confirmar que `USE_MOCK` foi removido do `.env.local`**

Run: `grep -n "USE_MOCK" .env.local || echo "removido"`
Expected: `removido`.

- [ ] **Step 3: Confirmar que `USE_MOCK` não aparece em nenhum `.env*` versionado**

Run: `grep -rn "USE_MOCK" .env.example .dev.vars.example 2>/dev/null || echo "limpo"`
Expected: `limpo` (estes arquivos template nunca tiveram `USE_MOCK`, confirmação final).

> Não há commit nesta task (`.env.local` é git-ignorado).

---

## Task 9: Gate final da fase

**Files:**
- Verify: estado do repositório

**Interfaces:**
- Consumes: Tasks 1-8.
- Produces: fase concluída com todos os gates verdes.

- [ ] **Step 1: Typecheck**

Run: `pnpm typecheck`
Expected: passa sem erros — confirma que nenhum import quebrado sobrou.

- [ ] **Step 2: Testes**

Run: `pnpm test`
Expected: 111/111 specs passando (a suite é independente do mock, conforme inventário da Seção 8).

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: build do OpenNext conclui sem erros. A rota `/design-preview` **não deve aparecer** mais na lista de rotas geradas.

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: sem erros. Espera-se **menos warnings** que antes — os ~6 imports mortos do `design-preview` (Avatar, tierForPoints, StatPill, ReactionBar, Comments, Network) somem, pois o arquivo foi deletado.

- [ ] **Step 5: Confirmar que `IS_MOCK`/`mockGet`/`lib/mock` não existem mais no código**

Run:
```bash
grep -rn "IS_MOCK\|mockGet\|@/lib/mock\|@/lib/data-source" --include="*.ts" --include="*.tsx" --include="*.mjs" . 2>/dev/null | grep -v node_modules | grep -v ".next" | grep -v ".open-next" | grep -v ".wrangler" || echo "limpo"
```
Expected: `limpo` (nenhuma referência restante em código-fonte).

---

## Notas

- Cada task (1-6) é um commit isolado por arquivo/área, para que a revisão seja granular e uma regressão seja fácil de isolar. As Tasks 7-8 são o "fecho" (deleção + env).
- Esta fase **não adiciona testes** porque a suite existente já cobre o caminho real (Supabase mockado via `vi.mock`), e a remoção do mock não muda comportamento das queries reais.
- Os scripts `screenshot.mjs`/`screenshot-card.mjs` foram movidos da Fase 4 (paths hardcoded) para esta fase, pois ficam órfãos ao deletar `design-preview`. O problema original (paths absolutos do Playwright) fica resolvido por deleção.
- `AGENCY_ADMIN_EMAIL_DOMAIN`/`isAgencyAdminEmail` (em `lib/auth.ts`) são código morto mas **não** ligados ao mock — ficam para a Fase 3.
- `getPostEngagement` (single, `posts.ts`), `getMyCheckins`/`getMyCheckinsWithPost` (`me.ts`/`checkins.ts`) tinham blocos mock mas também são código morto. Foram mantidos nesta fase (sem o bloco mock) para não misturar remoção de mock com remoção de código morto; a remoção definitiva deles é na Fase 3.
