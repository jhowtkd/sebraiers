# Fase 4 — Robustez: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar a race condition das reações (toggle não-atômico) via RPC transacional no Postgres, e fechar a brecha de SSRF no fetch de OG image com allowlist de hosts.

**Architecture:** Dois PRs isolados. **4.1** cria uma migration `0013_toggle_reaction_rpc.sql` com duas funções `SECURITY DEFINER` (`toggle_post_reaction`, `toggle_checkin_reaction`) que fazem o toggle (insert/delete) numa transação atômica, imune a race condition. As actions em `social.ts` passam a chamar `.rpc(...)` em vez do fluxo "ler → deletar → inserir". **4.2** adiciona um allowlist de hosts de redes sociais ao `fetchOgImage`, rejeitando hosts não-permitidos antes do fetch.

**Tech Stack:** Next.js, Supabase/Postgres (PL/pgSQL RPC), TypeScript. A RPC é testada manualmente com Supabase local; a action é testada com Vitest mockando `.rpc()`.

## Global Constraints

- A PK de `post_reactions` é **composta de 3 colunas**: `(post_id, user_id, reaction)`. Isso significa que um usuário pode ter **múltiplas reações distintas** no mesmo post (ex.: fire + clap), mas não duas iguais. A semântica é **multireação com toggle independente por tipo**.
- A UI (`ReactionButton`) confirma essa semântica: cada botão reage independentemente, alternando on/off do seu tipo específico sem afetar os outros tipos.
- A RPC deve ser **idempotente** e **atômica** (transacional), imune a cliques concorrentes.
- `SECURITY DEFINER` functions devem usar `set search_path = public` e validar `auth.uid()` internamente (padrão da migration `0003`).
- Não usar `auth.uid()` direto na função para checkins — passar `p_user_id` e validar `p_user_id = auth.uid()` no corpo (assim como `decide_checkin` valida `p_admin_id`). Isso mantém a assinatura explícita e testável.

### Correção importante vs. spec original

A spec da Fase 4 (Seção 5, item 4.1) descrevia a lógica como "se existe e é diferente → UPDATE (trocar reação)". **Isso está incorreto** para o schema atual: a PK `(post_id, user_id, reaction)` suporta múltiplas reações do mesmo usuário no mesmo post, então a semântica não é "trocar" mas sim **"adicionar ou remover aquela reação específica"** (toggle). O plano abaixo reflete a semântica correta.

---

## Sub-PR 4.1 — RPC atômica de reações

### File Structure

- **Create:** `supabase/migrations/0013_toggle_reaction_rpc.sql` — duas funções RPC + grants.
- **Modify:** `app/actions/social.ts` — `setPostReactionAction` e `setCheckinReactionAction` passam a chamar `.rpc(...)`.
- **Test:** `tests/lib/actions/social.test.ts` — testes novos cobrindo os caminhos da RPC (mockando `.rpc()`).

---

### Task 1: Criar migration `0013_toggle_reaction_rpc.sql`

**Files:**
- Create: `supabase/migrations/0013_toggle_reaction_rpc.sql`

**Interfaces:**
- Consumes: tabelas `public.post_reactions`, `public.checkin_reactions` (PKs compostas), `auth.uid()`.
- Produces: funções `toggle_post_reaction(p_post_id uuid, p_user_id uuid, p_reaction text) returns text` e `toggle_checkin_reaction(p_checkin_id uuid, p_user_id uuid, p_reaction text) returns text`, ambas retornando `'set'` ou `'removed'`.

- [ ] **Step 1: Criar a migration `0013_toggle_reaction_rpc.sql`**

```sql
-- ============================================================================
-- SEBRAEIERS — Atomic toggle_reaction RPCs
--
--   Defect fixed: race condition in app/actions/social.ts. The previous flow
--   did SELECT → DELETE → INSERT in separate statements with no transaction.
--   Two concurrent clicks could both read "no existing reaction" and both
--   INSERT, hitting a PK violation. The DELETE also ignored its error.
--
--   These functions perform the toggle (insert-or-delete of a SINGLE reaction
--   kind) in one transactional statement, immune to concurrent races. The PK
--   (post_id, user_id, reaction) allows multiple DISTINCT reactions per user
--   per target, so toggling 'fire' never touches an existing 'clap'.
--
--   Returns 'set' if the reaction was added, 'removed' if it was toggled off.
-- ============================================================================

create or replace function public.toggle_post_reaction(
  p_post_id uuid,
  p_user_id uuid,
  p_reaction text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing boolean;
begin
  -- Caller must be the acting user (defense in depth; action also enforces).
  if p_user_id <> auth.uid() then
    raise exception 'forbidden: caller must be the reacting user' using errcode = '42501';
  end if;

  -- Validate reaction kind (defense in depth; Zod already validates).
  if p_reaction not in ('fire', 'muscle', 'clap', 'raised', 'laugh') then
    raise exception 'invalid_reaction' using errcode = '22023';
  end if;

  -- Is this exact reaction already present for this user+post?
  select exists(
    select 1 from public.post_reactions
    where post_id = p_post_id and user_id = p_user_id and reaction = p_reaction
  ) into v_existing;

  if v_existing then
    delete from public.post_reactions
    where post_id = p_post_id and user_id = p_user_id and reaction = p_reaction;
    return 'removed';
  end if;

  insert into public.post_reactions (post_id, user_id, reaction)
  values (p_post_id, p_user_id, p_reaction);
  return 'set';
end $$;

revoke all on function public.toggle_post_reaction(uuid, uuid, text) from public;
grant execute on function public.toggle_post_reaction(uuid, uuid, text) to authenticated;

create or replace function public.toggle_checkin_reaction(
  p_checkin_id uuid,
  p_user_id uuid,
  p_reaction text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing boolean;
begin
  if p_user_id <> auth.uid() then
    raise exception 'forbidden: caller must be the reacting user' using errcode = '42501';
  end if;

  -- checkin_reactions only allows 'clap' (CHECK constraint on the table).
  if p_reaction <> 'clap' then
    raise exception 'invalid_reaction' using errcode = '22023';
  end if;

  select exists(
    select 1 from public.checkin_reactions
    where checkin_id = p_checkin_id and user_id = p_user_id and reaction = p_reaction
  ) into v_existing;

  if v_existing then
    delete from public.checkin_reactions
    where checkin_id = p_checkin_id and user_id = p_user_id and reaction = p_reaction;
    return 'removed';
  end if;

  insert into public.checkin_reactions (checkin_id, user_id, reaction)
  values (p_checkin_id, p_user_id, p_reaction);
  return 'set';
end $$;

revoke all on function public.toggle_checkin_reaction(uuid, uuid, text) from public;
grant execute on function public.toggle_checkin_reaction(uuid, uuid, text) to authenticated;
```

- [ ] **Step 2: Verificar sintaxe SQL (se Supabase local disponível)**

Run: `supabase status 2>/dev/null && echo "supabase running — validar com db reset" || echo "supabase local não disponível — validará no gate final"`

Se o Supabase local estiver rodando: `supabase db reset` e observar se a migration aplica sem erros. Se não estiver disponível, a validação fica para o teste manual documentado (Task 4).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0013_toggle_reaction_rpc.sql
git commit -m "feat(db): add atomic toggle_post_reaction and toggle_checkin_reaction RPCs"
```

---

### Task 2: Migrar `setPostReactionAction` e `setCheckinReactionAction` para usar a RPC

**Files:**
- Modify: `app/actions/social.ts`

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/server`, schemas de validação de `@/lib/validation`.
- Produces: actions de reação usando `.rpc(...)`, retornando `reaction: string | null` (`null` = removida, valor = setada).

- [ ] **Step 1: Reescrever `setPostReactionAction` para chamar a RPC**

Substituir a função inteira `setPostReactionAction` por:

```typescript
export async function setPostReactionAction(input: { post_id: string; reaction: string }): Promise<SocialActionResult> {
  const parsed = postReactionSetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Não autenticado' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('toggle_post_reaction', {
    p_post_id: parsed.data.post_id,
    p_user_id: userId,
    p_reaction: parsed.data.reaction,
  });
  if (error) return { ok: false, error: 'Erro ao reagir' };

  const reaction = data === 'set' ? parsed.data.reaction : null;
  revalidatePath('/timeline');
  revalidatePath(`/post/${parsed.data.post_id}`);
  return { ok: true, reaction };
}
```

- [ ] **Step 2: Reescrever `setCheckinReactionAction` para chamar a RPC**

Substituir a função inteira `setCheckinReactionAction` por:

```typescript
export async function setCheckinReactionAction(input: { checkin_id: string; reaction: 'clap' }): Promise<SocialActionResult> {
  const parsed = checkinReactionSetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };

  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Não autenticado' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('toggle_checkin_reaction', {
    p_checkin_id: parsed.data.checkin_id,
    p_user_id: userId,
    p_reaction: parsed.data.reaction,
  });
  if (error) return { ok: false, error: 'Erro ao reagir' };

  const reaction = data === 'set' ? parsed.data.reaction : null;
  revalidatePath('/meu-desempenho');
  return { ok: true, reaction };
}
```

- [ ] **Step 3: Verificar typecheck**

Run: `pnpm typecheck`
Expected: passa sem erros.

- [ ] **Step 4: Commit**

```bash
git add app/actions/social.ts
git commit -m "refactor(social): use atomic toggle_reaction RPCs instead of read-delete-insert"
```

---

### Task 3: Testes para as actions de reação via RPC

**Files:**
- Test: `tests/lib/actions/social.test.ts` (provavelmente novo, ou estender o existente)

**Interfaces:**
- Consumes: `setPostReactionAction`, `setCheckinReactionAction` de `@/app/actions/social`.
- Produces: cobertura dos 3 caminhos: set novo, toggle off, erro de RPC.

- [ ] **Step 1: Verificar se já existe `tests/lib/actions/social.test.ts`**

Run: `test -f tests/lib/actions/social.test.ts && echo "existe — estender" || echo "novo — criar"`

- [ ] **Step 2: Escrever os testes**

Se o arquivo for novo, criá-lo com os testes abaixo. Se existir, adicionar os testes ao suite existente (seguindo o padrão de mock de `@/lib/supabase/server` já usado em `tests/lib/actions/`).

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase server client BEFORE importing the action.
const rpcMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })) },
    rpc: rpcMock,
  })),
}));

// Mock revalidatePath (no-op in tests).
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { setPostReactionAction, setCheckinReactionAction } from '@/app/actions/social';

describe('setPostReactionAction (via toggle_post_reaction RPC)', () => {
  beforeEach(() => rpcMock.mockReset());

  it('returns reaction set when RPC returns "set"', async () => {
    rpcMock.mockResolvedValueOnce({ data: 'set', error: null });
    const res = await setPostReactionAction({ post_id: '11111111-1111-1111-1111-111111111111', reaction: 'fire' });
    expect(res.ok).toBe(true);
    expect(res.reaction).toBe('fire');
    expect(rpcMock).toHaveBeenCalledWith('toggle_post_reaction', {
      p_post_id: '11111111-1111-1111-1111-111111111111',
      p_user_id: 'user-1',
      p_reaction: 'fire',
    });
  });

  it('returns reaction null when RPC returns "removed" (toggle off)', async () => {
    rpcMock.mockResolvedValueOnce({ data: 'removed', error: null });
    const res = await setPostReactionAction({ post_id: '11111111-1111-1111-1111-111111111111', reaction: 'fire' });
    expect(res.ok).toBe(true);
    expect(res.reaction).toBeNull();
  });

  it('returns ok:false on RPC error', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const res = await setPostReactionAction({ post_id: '11111111-1111-1111-1111-111111111111', reaction: 'fire' });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Erro ao reagir');
  });

  it('rejects invalid reaction kind before calling RPC', async () => {
    const res = await setPostReactionAction({ post_id: '11111111-1111-1111-1111-111111111111', reaction: 'invalid' });
    expect(res.ok).toBe(false);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe('setCheckinReactionAction (via toggle_checkin_reaction RPC)', () => {
  beforeEach(() => rpcMock.mockReset());

  it('returns reaction set when RPC returns "set"', async () => {
    rpcMock.mockResolvedValueOnce({ data: 'set', error: null });
    const res = await setCheckinReactionAction({ checkin_id: '22222222-2222-2222-2222-222222222222', reaction: 'clap' });
    expect(res.ok).toBe(true);
    expect(res.reaction).toBe('clap');
  });

  it('returns reaction null when toggled off', async () => {
    rpcMock.mockResolvedValueOnce({ data: 'removed', error: null });
    const res = await setCheckinReactionAction({ checkin_id: '22222222-2222-2222-2222-222222222222', reaction: 'clap' });
    expect(res.ok).toBe(true);
    expect(res.reaction).toBeNull();
  });
});
```

- [ ] **Step 3: Rodar os testes**

Run: `pnpm test tests/lib/actions/social.test.ts`
Expected: todos os specs passam.

- [ ] **Step 4: Rodar a suite completa**

Run: `pnpm test`
Expected: todos os specs passam (108 + os novos ≈ 6 = ~114).

- [ ] **Step 5: Commit**

```bash
git add tests/lib/actions/social.test.ts
git commit -m "test(social): cover toggle_reaction RPC action paths (set/removed/error/invalid)"
```

---

### Task 4: Smoke test manual da RPC (documentado)

**Files:**
- Modify: `docs/TESTING.md` — adicionar seção de smoke test da RPC.

**Interfaces:**
- Consumes: Supabase local rodando (`supabase start`).

> ⚠️ Esta task requer Supabase local. Se não estiver disponível no ambiente de execução, registrar no relatório que o smoke test ficou pendente (a action já está coberta por testes unitários na Task 3).

- [ ] **Step 1: Iniciar Supabase local e aplicar migrations**

Run:
```bash
supabase start
supabase db reset
```
Expected: todas as 13 migrations (incl. `0013_toggle_reaction_rpc.sql`) aplicam sem erro.

- [ ] **Step 2: Validar a RPC `toggle_post_reaction` diretamente no banco**

Run (via `supabase mui psql` ou Studio SQL editor, autenticado como um usuário de teste):
```sql
-- Setup: garantir que um post e usuário de teste existem (use IDs do seed).
-- Set (primeira vez) → espera 'set'
select toggle_post_reaction('<post-id>', '<user-id>', 'fire');
-- Toggle off (segunda vez, mesmo reação) → espera 'removed'
select toggle_post_reaction('<post-id>', '<user-id>', 'fire');
-- Multireação: set fire, depois set clap → ambos 'set' (PK composta permite)
select toggle_post_reaction('<post-id>', '<user-id>', 'fire');
select toggle_post_reaction('<post-id>', '<user-id>', 'clap');
```
Expected: 'set', 'removed', 'set', 'set' respectivamente. A última sequência demonstra multireação (fire + clap coexistem).

- [ ] **Step 3: Documentar o smoke test em `docs/TESTING.md`**

Adicionar uma seção "RPC smoke tests" a `docs/TESTING.md` com o procedimento acima (passos de `supabase db reset` + as queries de validação), para que qualquer mantenedor possa reproduzir.

- [ ] **Step 4: Commit**

```bash
git add docs/TESTING.md
git commit -m "docs(testing): document toggle_reaction RPC smoke test procedure"
```

---

## Sub-PR 4.2 — Allowlist de host no OG image

### Task 5: Adicionar allowlist de hosts a `fetchOgImage`

**Files:**
- Modify: `lib/sync/og-image.ts`
- Test: `tests/lib/sync/og-image.test.ts` (provavelmente novo, ou estender)

**Interfaces:**
- Consumes: `original_url` validada por `postSchema` (Zod `url()`) — mas sem checagem de host hoje.
- Produces: `fetchOgImage` rejeita hosts fora do allowlist antes do fetch, retornando `null`.

- [ ] **Step 1: Verificar se já existe `tests/lib/sync/og-image.test.ts`**

Run: `test -f tests/lib/sync/og-image.test.ts && echo "existe — estender" || echo "novo — criar"`

- [ ] **Step 2: Escrever o teste falhando primeiro (TDD)**

Criar/estender `tests/lib/sync/og-image.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchOgImage } from '@/lib/sync/og-image';

describe('fetchOgImage host allowlist', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches an allowed host (instagram)', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response('<html><meta property="og:image" content="https://cdn.inst.com/img.jpg" /></html>', { status: 200 })
    );
    const result = await fetchOgImage('https://www.instagram.com/p/abc/');
    expect(result).toBe('https://cdn.inst.com/img.jpg');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns null WITHOUT fetching when host is not allowed', async () => {
    const result = await fetchOgImage('http://169.254.169.254/latest/meta-data/');
    expect(result).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns null without fetching for localhost', async () => {
    const result = await fetchOgImage('http://localhost:8080/');
    expect(result).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns null for an invalid URL', async () => {
    const result = await fetchOgImage('not-a-url');
    expect(result).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
```

Run: `pnpm test tests/lib/sync/og-image.test.ts`
Expected: FAIL (a função atual ainda não tem allowlist — `fetch` será chamado para todos).

- [ ] **Step 3: Implementar o allowlist em `lib/sync/og-image.ts`**

Reescrever `lib/sync/og-image.ts`:

```typescript
import 'server-only';

// Hosts permitted for OG image fetching. Limited to the social networks
// the product syncs from. Anything else (incl. internal/SSRF targets like
// 169.254.169.254, localhost, private ranges) is rejected before fetching.
const ALLOWED_HOSTS = new Set([
  'instagram.com',
  'www.instagram.com',
  'linkedin.com',
  'www.linkedin.com',
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
  'tiktok.com',
  'www.tiktok.com',
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'threads.net',
  'www.threads.net',
]);

function isAllowedHost(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return ALLOWED_HOSTS.has(parsed.hostname.toLowerCase());
}

// Reject well-known wrong-og:image patterns.
function isValidPostImage(url: string): boolean {
  if (/pbs\.twimg\.com\/profile_images\//.test(url)) return false;
  return true;
}

export async function fetchOgImage(url: string, timeoutMs = 5000): Promise<string | null> {
  if (!isAllowedHost(url)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEBRAEIERS-Sync/1.0)' },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Try property-before-content first (most common), then content-before-property.
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m && isValidPostImage(m[1])) return m[1];
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `pnpm test tests/lib/sync/og-image.test.ts`
Expected: todos os specs passam.

- [ ] **Step 5: Rodar a suite completa**

Run: `pnpm test`
Expected: todos os specs passam.

- [ ] **Step 6: Commit**

```bash
git add lib/sync/og-image.ts tests/lib/sync/og-image.test.ts
git commit -m "fix(sync): restrict OG image fetch to social-network host allowlist (SSRF)"
```

---

## Task 6: Gate final da fase

**Files:**
- Verify: estado do repositório.

- [ ] **Step 1: Typecheck**

Run: `pnpm typecheck`
Expected: passa sem erros.

- [ ] **Step 2: Testes**

Run: `pnpm test`
Expected: todos os specs passam (~114 com os novos).

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: build do OpenNext conclui sem erros.

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: sem erros.

---

## Notas

- **Semântica de multireação:** a PK `(post_id, user_id, reaction)` permite que um usuário tenha fire + clap no mesmo post simultaneamente. A RPC respeita isso: cada toggle é independente por tipo de reação. Isso difere da descrição original da spec (que falava em "trocar" reação) e está alinhado com a UI (`ReactionButton` trata cada botão independentemente).
- **4.1 e 4.2 são PRs isolados** conforme combinado em brainstorming. Esta fase pode ser dividida em dois branches separados se preferir; o plano acima os mantém num só branch por simplicidade, com commits separados por sub-PR.
- A Task 4 (smoke test manual) depende de Supabase local. Se indisponível, registrar como pendência — a cobertura unitária da action (Task 3) já protege o código da app.
- `isAllowedHost` usa `new URL()` para normalizar; hosts inválidos (URL malformada) retornam `false` (não há fetch).
- A função `isValidPostImage` original (rejeita avatares do Twitter) é preservada como segunda camada de filtro.
