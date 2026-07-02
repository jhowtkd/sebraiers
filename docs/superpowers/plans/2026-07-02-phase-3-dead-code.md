# Fase 3 — Limpeza de código morto + deduplicação: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover funções/schemas órfãos não-usados e deduplicar a lógica repetida entre `posts.ts`/`users.ts` actions, reduzindo a superfície de manutenção sem mudar comportamento.

**Architecture:** Fase puramente subtrativa + extração de helpers compartilhados. Cada remoção foi confirmada por busca de referências (grep) — zero consumidores externos. A deduplicação move blocos idênticos para um helper compartilhado num novo arquivo `_shared/`. Sem mudança de comportamento: as actions continuam fazendo exatamente o mesmo, só chamando helpers em vez de código inline repetido.

**Tech Stack:** Next.js 15 App Router, TypeScript. Sem TDD (remoção + refator de extração); verificação é `typecheck` + `test` + `build` + `lint` passando.

## Global Constraints

- **Nunca deletar algo sem confirmar zero referências externas** com grep. Se o grep revelar um consumidor, PRESERVAR e reportar (não deletar).
- O comportamento das actions deve permanecer **idêntico** após a extração de helpers.
- Cada task termina com `pnpm typecheck` passando.

### Correção importante vs. spec original

A auditoria marcava `getPostEngagement` (variante single, em `lib/queries/posts.ts`) como morto. **Isso está incorreto:** ela é chamada internamente por `getPostEngagementWithComments` (linha 76 do mesmo arquivo, `getPostEngagement(postId, userId)`). **NÃO deletar `getPostEngagement`.** A verificação de referências antes de deletar (Step 1 de cada task) é o que protege contra isso.

---

## File Structure

**Arquivos a deletar:**
- `lib/supabase/client.ts` (arquivo inteiro — `getClient` sem consumidores)

**Arquivos a editar (remover símbolos mortos):**
- `lib/auth.ts` — remover `AGENCY_ADMIN_EMAIL_DOMAIN` + `isAgencyAdminEmail`
- `lib/validation.ts` — remover `userToggleSchema`, `UserToggleInput`, `postReactionKindSchema`
- `lib/social/engagement.ts` — remover `toEngagementRows`, `toCommentCountRows`
- `lib/queries/me.ts` — remover `getMyCheckins` (função `@deprecated`, sem consumidores)
- `lib/queries/checkins.ts` — remover `getMyCheckinsWithPost` (função `@deprecated`, sem consumidores)

**Arquivos a criar (deduplicação):**
- `app/actions/_shared/admin-guard.ts` — helper `requireAdminOrFail` + `fileFromFormData`

**Arquivos a editar (consumir os helpers):**
- `app/actions/posts.ts` — usar helpers de `_shared`, remover duplicação local
- `app/actions/users.ts` — usar helper de `_shared`, remover duplicação local

---

## Task 1: Deletar `lib/supabase/client.ts`

**Files:**
- Delete: `lib/supabase/client.ts`

**Interfaces:**
- Consumes: nada.
- Produces: arquivo removido.

- [ ] **Step 1: Confirmar zero referências externas**

Run: `grep -rn "getClient\|@/lib/supabase/client" --include="*.ts" --include="*.tsx" app components lib middleware.ts | grep -v "lib/supabase/client.ts:"`
Expected: nenhuma saída (zero referências). Se aparecer qualquer referência, **PARAR** — não deletar.

- [ ] **Step 2: Deletar o arquivo**

Run: `rm lib/supabase/client.ts`

- [ ] **Step 3: Verificar typecheck**

Run: `pnpm typecheck`
Expected: passa sem erros.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove unused browser Supabase client (getClient)"
```

---

## Task 2: Remover `AGENCY_ADMIN_EMAIL_DOMAIN` + `isAgencyAdminEmail` de `lib/auth.ts`

**Files:**
- Modify: `lib/auth.ts` (remover as linhas finais com esses dois símbolos)

**Interfaces:**
- Consumes: nada.
- Produces: `lib/auth.ts` sem os dois símbolos mortos. Demais exports inalterados.

- [ ] **Step 1: Confirmar zero referências externas**

Run: `grep -rn "isAgencyAdminEmail\|AGENCY_ADMIN_EMAIL_DOMAIN" --include="*.ts" --include="*.tsx" app components lib | grep -v "lib/auth.ts:"`
Expected: nenhuma saída. Se aparecer, **PARAR**.

- [ ] **Step 2: Remover os dois símbolos do final de `lib/auth.ts`**

Deletar estas linhas do arquivo (atuais últimas linhas):

```typescript
export const AGENCY_ADMIN_EMAIL_DOMAIN = '@conteudoedu.com.br';

export function isAgencyAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(AGENCY_ADMIN_EMAIL_DOMAIN);
}
```

O arquivo deve terminar logo após o fechamento da função `requireAdmin`.

- [ ] **Step 3: Verificar typecheck**

Run: `pnpm typecheck`
Expected: passa sem erros.

- [ ] **Step 4: Commit**

```bash
git add lib/auth.ts
git commit -m "refactor(auth): remove unused agency admin email helpers"
```

---

## Task 3: Remover `userToggleSchema`, `UserToggleInput`, `postReactionKindSchema` de `lib/validation.ts`

**Files:**
- Modify: `lib/validation.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `lib/validation.ts` sem esses símbolos. Os demais schemas (incl. `postReactionSetSchema`, que internamente redefine o enum) inalterados.

- [ ] **Step 1: Confirmar zero referências externas**

Run:
```bash
grep -rn "userToggleSchema\|UserToggleInput\|postReactionKindSchema" --include="*.ts" --include="*.tsx" app components lib tests | grep -v "lib/validation.ts:"
```
Expected: nenhuma saída. Se aparecer, **PARAR**.

- [ ] **Step 2: Remover os três símbolos de `lib/validation.ts`**

Remover estas linhas:

A definição de `userToggleSchema` (linhas ~76-79):
```typescript
export const userToggleSchema = z.object({
  user_id: z.string().uuid(),
  is_active: z.boolean(),
});
```

A definição de `postReactionKindSchema` (linha ~81):
```typescript
export const postReactionKindSchema = z.enum(['fire', 'muscle', 'clap', 'raised', 'laugh']);
```

E ajustar `postReactionSetSchema` para definir o enum inline (pois ela usava `postReactionKindSchema`):
```typescript
export const postReactionSetSchema = z.object({
  post_id: z.string().uuid('Post inválido'),
  reaction: z.enum(['fire', 'muscle', 'clap', 'raised', 'laugh']),
});
```

Remover o tipo `UserToggleInput` (linha ~107):
```typescript
export type UserToggleInput = z.infer<typeof userToggleSchema>;
```

Os demais exports e tipos devem permanecer intactos.

- [ ] **Step 3: Verificar typecheck**

Run: `pnpm typecheck`
Expected: passa sem erros.

- [ ] **Step 4: Commit**

```bash
git add lib/validation.ts
git commit -m "refactor(validation): remove unused schemas (userToggle, postReactionKind)"
```

---

## Task 4: Remover `toEngagementRows` + `toCommentCountRows` de `lib/social/engagement.ts`

**Files:**
- Modify: `lib/social/engagement.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `engagement.ts` sem esses dois helpers. Os exports usados (`buildEngagementBatch`, `countReactions`, tipos) inalterados.

- [ ] **Step 1: Confirmar zero referências externas**

Run: `grep -rn "toEngagementRows\|toCommentCountRows" --include="*.ts" --include="*.tsx" app components lib tests | grep -v "lib/social/engagement.ts:"`
Expected: nenhuma saída. Se aparecer, **PARAR**.

- [ ] **Step 2: Remover as duas funções do final de `lib/social/engagement.ts`**

Deletar (linhas finais do arquivo):

```typescript
export function toEngagementRows<T extends string>(
  rows: Record<string, unknown>[],
  idField: T
): { id: string; reaction: string }[] {
  return rows.map((r) => ({
    id: String(r[idField]),
    reaction: String(r.reaction),
  }));
}

export function toCommentCountRows<T extends string>(
  rows: Record<string, unknown>[],
  idField: T
): { id: string }[] {
  return rows.map((r) => ({ id: String(r[idField]) }));
}
```

O arquivo deve terminar após o fechamento de `buildEngagementBatch`.

- [ ] **Step 3: Verificar typecheck**

Run: `pnpm typecheck`
Expected: passa sem erros.

- [ ] **Step 4: Commit**

```bash
git add lib/social/engagement.ts
git commit -m "refactor(engagement): remove unused row-mapper helpers"
```

---

## Task 5: Remover `getMyCheckins` de `lib/queries/me.ts` e `getMyCheckinsWithPost` de `lib/queries/checkins.ts`

**Files:**
- Modify: `lib/queries/me.ts`
- Modify: `lib/queries/checkins.ts`

**Interfaces:**
- Consumes: nada.
- Produces: queries sem as duas funções `@deprecated` não-usadas. Demais exports inalterados.

- [ ] **Step 1: Confirmar zero referências externas para ambas**

Run:
```bash
grep -rn "getMyCheckins\b" --include="*.ts" --include="*.tsx" app components lib | grep -v "getMyCheckinsForPost\|getMyCheckinsWithPost" | grep -v "lib/queries/me.ts:"
grep -rn "getMyCheckinsWithPost" --include="*.ts" --include="*.tsx" app components lib | grep -v "lib/queries/checkins.ts:"
```
Expected: nenhuma saída em ambos. Se aparecer, **PARAR**.

- [ ] **Step 2: Remover `getMyCheckins` de `lib/queries/me.ts`**

Deletar (função no final do arquivo, com seu bloco de comentário `@deprecated`):

```typescript
/** @deprecated Use getMyPerformanceDashboard */
export async function getMyCheckins(limit = 30): Promise<MyCheckin[]> {
  const user = await getSession();
  if (!user) return [];
  return fetchMyCheckinsWithPost(user.id, limit);
}
```

Atenção: verificar se `MyCheckin` (importado de `dashboard-types` e re-exportado) ainda é usado em outro lugar do arquivo. Se `MyCheckin` só era usado por `getMyCheckins`, remover também o import e o re-export de `MyCheckin`. Confirmar com: `grep -n "MyCheckin" lib/queries/me.ts` após a remoção — se só aparecer nos imports/exports e nowhere else, removê-los.

- [ ] **Step 3: Remover `getMyCheckinsWithPost` de `lib/queries/checkins.ts`**

Deletar (função no final do arquivo, com seu bloco de comentário `@deprecated`):

```typescript
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

Atenção: após remover, verificar se `CheckinWithPost` (type local definido no topo do arquivo) e o import de `getSession` ainda são usados. Se `CheckinWithPost` só era usado por `getMyCheckinsWithPost`, remover também sua definição. Confirmar com grep no arquivo.

- [ ] **Step 4: Verificar typecheck**

Run: `pnpm typecheck`
Expected: passa sem erros.

- [ ] **Step 5: Commit**

```bash
git add lib/queries/me.ts lib/queries/checkins.ts
git commit -m "refactor(queries): remove deprecated getMyCheckins and getMyCheckinsWithPost"
```

---

## Task 6: Criar `app/actions/_shared/admin-guard.ts` e migrar consumers

**Files:**
- Create: `app/actions/_shared/admin-guard.ts`
- Modify: `app/actions/posts.ts`
- Modify: `app/actions/users.ts`

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/server`.
- Produces: `requireAdminOrFail()` e `fileFromFormData(formData, key)` compartilhados, com as mesmas assinaturas que tinham localmente.

- [ ] **Step 1: Criar `app/actions/_shared/admin-guard.ts`**

```typescript
import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

type AdminGuardResult = {
  supabase: SupabaseClient;
  user: { id: string } | null;
  profile: { is_admin: boolean } | null;
};

/**
 * Fetches the session and admin profile in one shot.
 * Returns user: null when unauthenticated, profile.is_admin falsy when not admin.
 * Callers must check both before proceeding.
 */
export async function requireAdminOrFail(): Promise<AdminGuardResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null } as const;
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  return { supabase, user, profile };
}

/** Returns a File from FormData only if present and non-empty, else null. */
export function fileFromFormData(formData: FormData, key: string): File | null {
  const v = formData.get(key);
  return v instanceof File && v.size > 0 ? v : null;
}
```

- [ ] **Step 2: Atualizar `app/actions/posts.ts` para importar os helpers**

No topo do arquivo, **remover** as definições locais de `requireAdminOrFail` (linhas 10-16) e `fileFromFormData` (linhas 18-21), e **adicionar** o import:

```typescript
import { requireAdminOrFail, fileFromFormData } from '@/app/actions/_shared/admin-guard';
```

Manter os demais imports inalterados (incl. `getAdminClient`, `postSchema`, `ActionResult`, `revalidatePath`, `redirect`, `createClient`). O resto do arquivo (as 4 actions) permanece idêntico — elas já chamam `requireAdminOrFail()` e `fileFromFormData()`.

Nota: após remover a definição local de `requireAdminOrFail`, o import de `createClient` em `posts.ts` pode ficar sem uso se nenhuma action o usar diretamente. **Verificar**: `grep -n "createClient" app/actions/posts.ts`. Se o único uso era dentro da `requireAdminOrFail` local (agora removida), remover o import. Se alguma action ainda usa `createClient` diretamente (ex.: para o insert/update), manter.

- [ ] **Step 3: Atualizar `app/actions/users.ts` para importar o helper**

No topo do arquivo, **remover** a definição local de `requireAdminOrFail` (linhas 7-13) e **adicionar** o import:

```typescript
import { requireAdminOrFail } from '@/app/actions/_shared/admin-guard';
```

Nota: `users.ts` não usa `fileFromFormData` — não importá-lo. Após remover a definição local, verificar se `createClient` ainda é usado em `users.ts`. As actions `toggleUserActiveAction` e `toggleUserAdminAction` usam `supabase` (que vem de `requireAdminOrFail`), não `createClient` diretamente. Logo, remover o import de `createClient` de `users.ts` se ele ficar sem uso.

- [ ] **Step 4: Verificar typecheck**

Run: `pnpm typecheck`
Expected: passa sem erros.

- [ ] **Step 5: Commit**

```bash
git add app/actions/_shared/admin-guard.ts app/actions/posts.ts app/actions/users.ts
git commit -m "refactor(actions): extract shared admin-guard and form-data helpers"
```

---

## Task 7: Extrair `uploadPostCover` de `app/actions/posts.ts`

**Files:**
- Modify: `app/actions/posts.ts`
- Modify: `app/actions/_shared/admin-guard.ts` (adicionar helper de upload)

**Interfaces:**
- Consumes: `getAdminClient` de `@/lib/supabase/admin`.
- Produces: `uploadPostCover(file)` helper compartilhado, retornando `{ publicUrl: string }` ou lançando/retornando erro estruturado.

- [ ] **Step 1: Adicionar `uploadPostCover` a `app/actions/_shared/admin-guard.ts`**

Adicionar ao arquivo (após `fileFromFormData`):

```typescript
import { getAdminClient } from '@/lib/supabase/admin';

/**
 * Uploads a post cover image to the post-covers bucket and returns its public URL.
 * Returns null if the upload fails (caller surfaces a generic error).
 */
export async function uploadPostCover(file: File): Promise<string | null> {
  const admin = getAdminClient();
  const ext = file.name.split('.').pop();
  const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await admin.storage.from('post-covers').upload(path, file, { contentType: file.type });
  if (upErr) return null;
  const { data: pub } = admin.storage.from('post-covers').getPublicUrl(path);
  return pub.publicUrl;
}
```

Mover o import de `getAdminClient` para o topo do arquivo `_shared/admin-guard.ts` (junto aos demais imports). Se `getAdminClient` ainda for usado diretamente em `posts.ts` (verificar), manter o import lá também.

- [ ] **Step 2: Substituir o bloco de upload duplicado em `createPostAction`**

Em `app/actions/posts.ts`, o bloco atual (linhas ~39-49):
```typescript
const cover = fileFromFormData(formData, 'cover_file');
let cover_url = parsed.data.cover_url ?? null;
if (cover) {
  const admin = getAdminClient();
  const ext = cover.name.split('.').pop();
  const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await admin.storage.from('post-covers').upload(path, cover, { contentType: cover.type });
  if (upErr) return { ok: false, error: 'Falha no upload da imagem' };
  const { data: pub } = admin.storage.from('post-covers').getPublicUrl(path);
  cover_url = pub.publicUrl;
}
```

Substituir por:
```typescript
const cover = fileFromFormData(formData, 'cover_file');
let cover_url = parsed.data.cover_url ?? null;
if (cover) {
  const uploaded = await uploadPostCover(cover);
  if (uploaded === null) return { ok: false, error: 'Falha no upload da imagem' };
  cover_url = uploaded;
}
```

- [ ] **Step 3: Substituir o bloco de upload duplicado em `updatePostAction`**

O bloco idêntico em `updatePostAction` (linhas ~84-94) — substituir pela mesma versão via `uploadPostCover`.

- [ ] **Step 4: Atualizar imports de `posts.ts`**

Adicionar `uploadPostCover` ao import de `_shared/admin-guard`:
```typescript
import { requireAdminOrFail, fileFromFormData, uploadPostCover } from '@/app/actions/_shared/admin-guard';
```

Verificar se `getAdminClient` ainda é usado diretamente em `posts.ts` (após a substituição, provavelmente não). Se não, remover o import `import { getAdminClient } from '@/lib/supabase/admin';`.

- [ ] **Step 5: Verificar typecheck**

Run: `pnpm typecheck`
Expected: passa sem erros.

- [ ] **Step 6: Commit**

```bash
git add app/actions/_shared/admin-guard.ts app/actions/posts.ts
git commit -m "refactor(actions): extract uploadPostCover helper to remove duplication"
```

---

## Task 8: Gate final da fase

**Files:**
- Verify: estado do repositório

- [ ] **Step 1: Typecheck**

Run: `pnpm typecheck`
Expected: passa sem erros.

- [ ] **Step 2: Testes**

Run: `pnpm test`
Expected: 111/111 specs passando. Se algum teste cobria uma função removida (ex.: spec que testava `getClient` ou `getMyCheckins`), aquele spec deve ser deletado junto — mas o inventário confirmou que nenhum teste referencia esses símbolos.

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: build do OpenNext conclui sem erros.

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: sem erros.

- [ ] **Step 5: Confirmar que nenhum símbolo removido sobrevive**

Run:
```bash
grep -rn "getClient\b\|isAgencyAdminEmail\|AGENCY_ADMIN_EMAIL_DOMAIN\|userToggleSchema\|UserToggleInput\|postReactionKindSchema\|toEngagementRows\|toCommentCountRows\|getMyCheckins\b\|getMyCheckinsWithPost" --include="*.ts" --include="*.tsx" app components lib | grep -v "getMyCheckinsForPost\|getMyCheckinsWithPost" | grep -v node_modules || echo "LIMPO"
```
Expected: `LIMPO`.

---

## Notas

- **`getPostEngagement` (single) foi PRESERVADO** — a auditoria original marcava como morto, mas a verificação de referências revelou que `getPostEngagementWithComments` o chama internamente. Esta é a razão de cada task começar com grep de confirmação.
- Esta fase não altera comportamento — só remove mortos e extrai duplicação. As 4 actions de `posts.ts` e 2 de `users.ts` continuam fazendo exatamente o mesmo.
- A deduplicação (`_shared/admin-guard.ts`) usa o prefixo `_shared/` para sinalizar que é interno das actions (não uma rota). O Next.js App Router trata pastas com `_` prefix como não-rotas.
- `lib/supabase/client.ts` era o único arquivo de Supabase client-side — a app inteira usa server actions, então não há perda de funcionalidade.
