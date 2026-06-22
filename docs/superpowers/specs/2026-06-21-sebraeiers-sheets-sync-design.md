# SEBRAEIERS — Design Spec: Sincronização com Google Sheets

**Data:** 2026-06-21
**Versão:** 1.0
**Status:** Pronto para implementação

> **Specs base:**
> - [`./2026-06-21-sebraeiers-design.md`](./2026-06-21-sebraeiers-design.md) — design v1
> - [`./2026-06-21-sebraeiers-feed-ig-design.md`](./2026-06-21-sebraeiers-feed-ig-design.md) — redesign IG do feed
> - [`./2026-06-21-sebraeiers-engajar-button-design.md`](./2026-06-21-sebraeiers-engajar-button-design.md) — botão ENGAJAR
>
> Este spec adiciona uma **camada de sincronização opcional** entre uma planilha pública do Google Sheets e a tabela `posts`. Mudança puramente aditiva: posts existentes (criados via admin UI ou seed) ficam intactos; sync só cria/atualiza posts com `external_id` setado.

## 1. Resumo

Adiciona sincronização one-way: Google Sheets (CSV público) → `public.posts` no Supabase. Planilha é importador, **DB continua sendo a fonte de verdade**. Sync pode ser disparado manualmente (botão no admin) ou por cron (Vercel Cron a cada 6h). Stories (Instagram/Facebook `/stories/`) são ignorados. Imagens são extraídas do `og:image` da página do post (best-effort).

**Escopo v1:** uma planilha, sem auth Google, sync manual + cron, sem re-host de imagem, sem sync bidirecional.

## 2. Decisões travadas (após brainstorming)

| Decisão | Escolha | Motivo |
|---|---|---|
| Fonte da verdade | DB | Planilha é importador one-way |
| Trigger do sync | Botão manual + Vercel Cron (6h) | Controle + automação |
| Imagem | `og:image` do post URL (best-effort) | A planilha não tem imagens |
| Acesso à planilha | CSV público (sem auth) | Mais simples, sem Google Cloud project |
| Stories | Ignorar (regex `/stories/`) | Ephemeral, sem OG image útil |
| Detecção de rede | Parse do hostname com fallback | Sheet pode ou não ter coluna de rede |
| Re-host de imagem | Não — usar og:image direto | Menos código, sem storage extra |
| Mapeamento de colunas | Hardcoded com override via env | v1 tem schema fixo |
| Auth do cron | Header `x-cron-secret` + env `CRON_SECRET` | Padrão Vercel |
| Status "última sync" no admin | Não (v2) | YAGNI v1 |
| Sync incremental | Não (v1 re-lê tudo) | Sheets pequenas, simplicidade |

## 3. Mudanças vs specs anteriores

- **`supabase/migrations/0007_posts_external_id.sql`** (NEW): adiciona `external_id text unique` + `last_synced_at timestamptz` à tabela `posts` + index parcial
- **`lib/sync/sheets.ts`** (NEW): `fetchSheetCSV(sheetId, gid)` → `SheetRow[]`
- **`lib/sync/og-image.ts`** (NEW): `fetchOgImage(url)` → `string | null` (best-effort, 5s timeout)
- **`lib/sync/index.ts`** (NEW): `runSync({ sheetId, gid })` → `SyncSummary` (orquestra)
- **`app/actions/sync.ts`** (NEW): `runSyncAction()` (server action, admin-only)
- **`app/api/sync/route.ts`** (NEW): POST handler com auth via `x-cron-secret`
- **`vercel.json`** (NEW): cron schedule
- **`components/admin/sync-button.tsx`** (NEW): botão "Importar agora" no `/admin/posts`
- **`app/(admin)/admin/posts/page.tsx`** (MODIFY): adiciona o botão
- **`.env.example` / `.env.local`** (MODIFY): adiciona `SHEET_ID`, `SHEET_GID`, `CRON_SECRET`, `SHEET_COL_MAP`
- **`package.json`** (MODIFY): adiciona `papaparse` + `@types/papaparse`
- **Sem alteração** em: `PostCard`, `Post` type, reactions, comments, ranking, RLS, posts existentes (posts sem `external_id` são imutáveis pelo sync)

## 4. Modelo de dados (mudança)

```sql
-- 0007_posts_external_id.sql
alter table public.posts
  add column external_id text unique,
  add column last_synced_at timestamptz;

create index posts_external_id_idx on public.posts (external_id) where external_id is not null;
```

- **`external_id`**: SHA-256 hex do `original_url` normalizado. Permite dedupe no re-sync.
- **`last_synced_at`**: timestamp da última vez que esse post foi tocado pelo sync. NULL para posts nunca sincronizados.
- **Nullable em ambas**: posts do seed-demo e criados via admin UI ficam com `external_id = null` e `last_synced_at = null`. Sync nunca os altera (a query do sync filtra por `external_id IS NOT NULL` para updates; para inserts não importa).

## 5. Fluxo de sync (pipeline)

```
runSync({ sheetId, gid })
  1. fetchSheetCSV(sheetId, gid)
     └─ GET https://docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid={GID}
     └─ parse com papaparse → SheetRow[]

  2. for each row:
     a. normalize → { original_url, title, description, network?, published_at, cover_url? }
     b. if !original_url → skip (log: "missing url")
     c. if original_url matches /\/stories\//i → skip (log: "skipped: story")
     d. external_id = sha256(original_url)
     e. existing = SELECT id, cover_url FROM posts WHERE external_id = ?
     f. if existing:
          - UPDATE title, description, network, cover_url (se na planilha), published_at
          - last_synced_at = now()
        else:
          - INSERT new post (com created_by = admin user, is_active = true)
     g. if !cover_url (planilha não tem):
          - try fetchOgImage(original_url) → UPDATE posts SET cover_url = ? WHERE id = ? (best-effort)
     h. on any error per row: log + continue (sync não aborta)

  3. return { created: N, updated: M, skipped_stories: K, skipped_no_url: J, errors: E, og_images_found: G }
```

## 6. Mapeamento de colunas (v1)

Hardcoded, com override via `SHEET_COL_MAP` env (formato: `key=value,key=value`):

| Sheet column (default) | Post field | Required |
|---|---|---|
| `link_post` (ou `url`, `link`) | `original_url` | ✓ |
| `data_publicacao` (ou `data`, `date`) | `published_at` | ✓ |
| `titulo` (ou `title`) | `title` | ✓ |
| `descricao` (ou `descricao`, `description`) | `description` | opcional |
| `rede` (ou `network`) | `network` | opcional (fallback: parse hostname) |
| `thumbnail` (ou `cover_url`, `imagem`) | `cover_url` | opcional (fallback: og:image) |

`SHEET_COL_MAP` env override: `SHEET_COL_MAP=link=URL,data=Date,titulo=Title`

**Detecção de rede por hostname (fallback):**
- `instagram.com` → `instagram`
- `linkedin.com` → `linkedin`
- `facebook.com` → `facebook`
- `tiktok.com` → `tiktok`
- `youtube.com` / `youtu.be` → `youtube`
- `threads.net` / `threads.com` → `threads`
- Outro → `null` (post é criado mas `network = null`; aceita CHECK se for NOT NULL, então mudamos schema ou setamos default `'instagram'`)

**Decisão:** no `posts.network` já tem `NOT NULL CHECK (network IN (...))` da migration inicial. Fallback final: se nada match, usar `'instagram'` como default. Admin pode editar manualmente no app depois.

## 7. OG image fetch (`lib/sync/og-image.ts`)

```ts
export async function fetchOgImage(url: string, timeoutMs = 5000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEBRAEIERS-Sync/1.0)' },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
```

- **Sem dependência** de cheerio/jsdom (regex simples é suficiente).
- **5s timeout** pra não travar sync.
- **Falha → null** (post é criado/atualizado sem cover_url).
- **Não re-hospeda** — usa a URL do og:image direto no `<img src>`. Se quebrar no futuro, `<img onerror>` no PostCard (já existe ou adicionar).

## 8. Server action (`app/actions/sync.ts`)

```ts
'use server';

import { requireAdmin } from '@/lib/auth';
import { runSync, type SyncSummary } from '@/lib/sync';

export type SyncActionResult =
  | { ok: true; summary: SyncSummary }
  | { ok: false; error: string };

export async function runSyncAction(): Promise<SyncActionResult> {
  const profile = await requireAdmin();
  if (!profile) return { ok: false, error: 'Sem permissão' };
  const sheetId = process.env.SHEET_ID;
  const gid = process.env.SHEET_GID ?? '0';
  if (!sheetId) return { ok: false, error: 'SHEET_ID não configurado' };
  try {
    const summary = await runSync({ sheetId, gid });
    return { ok: true, summary };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro desconhecido' };
  }
}
```

## 9. API route (`app/api/sync/route.ts`)

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { runSync } from '@/lib/sync';

export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const provided = request.headers.get('x-cron-secret');
  if (provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sheetId = process.env.SHEET_ID;
  const gid = process.env.SHEET_GID ?? '0';
  if (!sheetId) {
    return NextResponse.json({ error: 'SHEET_ID not configured' }, { status: 500 });
  }
  try {
    const summary = await runSync({ sheetId, gid });
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

## 10. Vercel Cron (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/sync",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

- Schedule `0 */6 * * *` = 00:00, 06:00, 12:00, 18:00 UTC diariamente (4 sync/dia).
- Vercel Cron envia POST automaticamente.

## 11. UI: botão "Importar agora" (`components/admin/sync-button.tsx`)

```tsx
'use client';

import { useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { runSyncAction, type SyncActionResult } from '@/app/actions/sync';
import { useToast } from '@/components/ui/toast';

export function SyncButton() {
  const [busy, start] = useTransition();
  const { toast } = useToast();

  function onClick() {
    start(async () => {
      const res: SyncActionResult = await runSyncAction();
      if (!res.ok) {
        toast({ title: 'Erro na sincronização', description: res.error, variant: 'error' });
        return;
      }
      const s = res.summary;
      toast({
        title: 'Sincronização concluída',
        description: `${s.created} novos, ${s.updated} atualizados, ${s.skipped_stories} stories ignoradas, ${s.errors} erros`,
        variant: s.errors > 0 ? 'info' : 'success',
      });
    });
  }

  return (
    <Button variant="secondary" onClick={onClick} disabled={busy} loading={busy}>
      <RefreshCw className={busy ? 'animate-spin' : ''} />
      Importar agora
    </Button>
  );
}
```

## 12. Integração no `/admin/posts` (`app/(admin)/admin/posts/page.tsx`)

Adiciona o `<SyncButton />` no header da página, à direita do título e antes do botão "Nova publicação":

```tsx
<div className="flex items-center justify-between">
  <h1 className="text-h1 text-text-primary">Publicações</h1>
  <div className="flex items-center gap-2">
    <SyncButton />
    <Link href="/admin/posts/new">
      <Button>Nova publicação</Button>
    </Link>
  </div>
</div>
```

## 13. Variáveis de ambiente (`.env.example`)

```
# Google Sheets sync
SHEET_ID=1_kmY7j37Tv3I_YxT-VKN5_AjqSJESUah-6Ulq6W6Ab0
SHEET_GID=0
# Optional: override column mapping
# SHEET_COL_MAP=link_post=URL,data_publicacao=Date,titulo=Title

# Vercel Cron secret (generate with `openssl rand -hex 32`)
CRON_SECRET=replace-me-with-32-byte-random-hex
```

## 14. Dependências (`package.json`)

```bash
pnpm add papaparse && pnpm add -D @types/papaparse
```

## 15. Estados transversais

- **Loading do botão:** `<Button loading={busy}>` com spinner no ícone (rotates enquanto busy).
- **Toast success:** verde com summary compacto ("X novos, Y atualizados, Z stories ignoradas, W erros").
- **Toast error:** vermelho com mensagem clara.
- **Sync parcial (alguns rows falham):** toast sucesso (info) com summary incluindo `errors > 0`. Os erros individuais vão pro log do servidor (não toast — pode ter 50+).
- **Sheet inacessível (CSV URL retorna 404/500):** action retorna `{ ok: false, error: '...' }` → toast error com a mensagem do fetch.

## 16. Segurança

- **CSV endpoint** é público (qualquer um com o link lê) — sem auth, sem secret. OK porque a planilha é pública.
- **Cron endpoint** exige `x-cron-secret` (env var) — Vercel injeta automaticamente.
- **Server action** exige admin (via `requireAdmin()`).
- **OG image fetch** é best-effort contra URLs arbitrárias; se um atacante puser uma URL maliciosa, o máximo que acontece é o sync demorar. Sem execução de código, sem SSRF (apenas GET de HTML).
- **Não** confiamos no HTML retornado — só extraímos `og:image` via regex restritiva. Não avaliamos JS nem parseamos tags além dessa.

## 17. Critérios de sucesso (auto-check)

- [ ] Planilha pública acessível via `https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}`.
- [ ] Botão "Importar agora" visível no /admin/posts.
- [ ] Click no botão executa sync e mostra toast com summary.
- [ ] Vercel Cron configurado (a cada 6h).
- [ ] `/api/sync` retorna 401 sem `x-cron-secret` correto, 200 com.
- [ ] Posts com URL de story são pulados (não importados, log mostra "skipped: story").
- [ ] Posts com URL normal são criados/atualizados com `external_id` populado.
- [ ] OG image é extraído quando a planilha não tem `cover_url`; falha é tolerada.
- [ ] Posts existentes (sem `external_id`) não são alterados.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` todos limpos.
- [ ] 42+ testes passando.

## 18. Roadmap (itens explicitamente fora do v1)

Estes itens são **diferidos intencionalmente** com justificativa. Não são bugs nem YAGNI esquecido — são decisões de escopo conscientes para v2+:

| Item | Justificativa | Quando reavaliar |
|---|---|---|
| **Sync bidirecional** (app → sheet) | Conflitos de merge; usuário disse que DB é a verdade. | Se admin quiser editar posts pela planilha e ter edição refletida no app, reavaliar. |
| **Google OAuth / service account** | Sheet é pública; v1 usa CSV endpoint sem auth. | Se a planilha voltar a ser privada, ou se quisermos sync mais granular via API. |
| **Mapeamento automático de colunas** (auto-detect) | v1 hardcoded + env override é suficiente. | Se múltiplos sheets forem usados ou se a estrutura da planilha mudar com frequência. |
| **Sync incremental** (só rows modificadas desde `last_synced_at`) | Sheets são pequenas (<100 rows). Full sync é rápido (<5s). | Se a planilha crescer pra centenas de rows ou se a latência do sync ficar alta. |
| **Re-host de imagens** no Supabase Storage | og:image direto funciona pra maioria. Adiciona complexidade + storage usage. | Se hotlinks quebrarem com frequência ou se a gente quiser controle total do CDN. |
| **Detecção robusta de "stories"** (login wall) | v1 só detecta pelo path da URL. Login wall em stories aparece como fetch OK mas sem og:image. | Se falsos positivos (stories que passam) virarem problema. |
| **Status "última sync" no admin** (com timestamp + count) | YAGNI v1 — admin vê no toast do botão manual. Logs do Vercel dão visibilidade pra cron. | Quando virem pedidos tipo "quando foi a última sync?" do admin. |
| **Notificações** (email/Slack) após sync | YAGNI v1. | Quando virar rotina e time quiser alertas. |
| **Versionamento** de posts (histórico de edições) | v1 sobrescreve sem histórico. | Se houver necessidade de auditoria. |
| **Webhook do Google** (notificação em tempo real) | v1 usa cron. Latência: até 6h. | Se latência virar problema (ex: marketing quer ver no app em segundos). |
| **Suporte a múltiplas planilhas** (1 por rede, ou 1 por campanha) | v1 lê 1. | Se estrutura organizacional demandar. |
| **Botão "↻" inline em cada post** (resync individual) | v1 só tem "importar tudo". | Se algum post falhar e admin quiser retentar só ele. |
| **Conflict resolution** (se DB foi editado e sheet também) | Não aplicável v1 (DB é verdade). | Se sync virar bidirecional. |
| **Schema fixo `rede=instagram` como fallback** (post com host desconhecido) | Decisão pragmática v1. | Se aparecer host novo frequente, adicionar antes do fallback. |
| **Manual sheet → DB import via CLI/script** (sem cron, sem botão) | v1 tem botão no admin. | Se admin quiser agendar manualmente. |
| **Detecção automática de "stories" via login wall** (não só path) | v1 só path. | Se muitos stories passarem pelo path-match. |
| **Bulk re-sync all** (botão de "resetar e reimportar tudo do zero") | v1 só faz upsert. | Se admin precisar limpar inconsistências. |

## 19. Estrutura de pastas (mudanças)

```
supabase/
  migrations/
    0007_posts_external_id.sql                    # NEW
lib/
  sync/
    sheets.ts                                     # NEW (fetchSheetCSV)
    og-image.ts                                   # NEW (fetchOgImage)
    index.ts                                      # NEW (runSync)
app/
  actions/
    sync.ts                                       # NEW (runSyncAction)
  api/
    sync/
      route.ts                                    # NEW (POST /api/sync)
  (admin)/
    admin/posts/page.tsx                          # MODIFY (adiciona SyncButton)
components/
  admin/
    sync-button.tsx                               # NEW
vercel.json                                       # NEW
docs/superpowers/
  specs/
    2026-06-21-sebraeiers-sheets-sync-design.md   # ESTE DOC
  plans/
    2026-06-21-sebraeiers-sheets-sync-implementation.md  # a ser criado
```
