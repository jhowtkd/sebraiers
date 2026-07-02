# Sebraiers — Consolidação, Auditoria e Limpeza

**Data:** 2026-07-02
**Status:** Spec aprovada (brainstorming)
**Escopo:** Consolidar o projeto atual do SEBRAE Goiás — não transformar em produto/SaaS.

## Contexto e motivação

O Sebraiers (plataforma gamificada do SEBRAE Goiás para engajamento em redes sociais) foi aprovado/entregue como v1.0.0 e é funcional: backend Supabase real (RLS, RPCs, 13 migrations), server actions com persistência, cron automatizado em produção (Cloudflare Workers/OpenNext) e 111 testes (Vitest).

Uma auditoria identificou, porém, dívida técnica de polimento e um risco crítico de processo. O atrito sentido é de **quem mantém o código**, não dos usuários finais. Esta spec endereça essa dívida numa limpeza completa, organizada em fases isoladas e auditáveis.

## Decisões de escopo (do brainstorming)

- **Escopo:** consolidar o projeto atual; **não** virar SaaS/multi-tenant nesta rodada.
- **Foco:** reduzir o atrito de manutenção (deploy, código morto, segurança).
- **Mock mode:** **remover completamente** (inclui `design-preview`).
- **Apetite:** limpeza completa — crítico + mock + código morto + CI/CD + lacunas UX.

## Abordagem

**Por camadas com gates de verificação** (Abordagem A). Cada fase é um branch/PR separado, terminando com `pnpm typecheck` + `pnpm test` + `pnpm build` + `pnpm lint` (erros) passando. Cada fase é independente, auditável e revertível.

### Ordem e dependências

1. **Segurança** — sem dependências.
2. **Remover mock mode + design-preview** — depende da Fase 1 apenas conceitualmente; a remoção do mock cria código morto que é varrido na Fase 3.
3. **Código morto + deduplicação** — varre o morto remanescente (incl. o que a Fase 2 gera).
4. **Robustez** — RPC de reações (4.1, PR isolado) e allowlist de OG image (4.2).
5. **CI/CD** — nasce protegendo o código já limpo; captura regressões das fases anteriores em PRs futuros.
6. **Lacunas UX** — polimento independente.

O CI (Fase 5) fica **depois** das mudanças estruturais para já proteger o código limpo.

---

## Fase 1 — Segurança

**Objetivo:** eliminar o risco crítico de processo (service_role key em texto plano em `.env.local`).

- **Rotacionar a `service_role` key** no painel do Supabase.
- **Criar `docs/SECURITY.md`** documentando: onde cada secret vive (Cloudflare Worker secrets em produção via `wrangler secret put`; `.env.local`/`.dev.vars` apenas em dev), quais são (lista alinhada ao `.env.example`), e a regra de "nunca commitar `.env*.local`".
- **Confirmar** que `.env.local` e `.dev.vars` estão no `.gitignore` e não estão no histórico do git.

**Não fazer (YAGNI):** migrar para secrets manager (Vault, Doppler, etc.). O porte da app não justifica; os secrets do Worker + `.env.example` documentado resolvem.

**Gates:** `.gitignore` confirmado; `docs/SECURITY.md` criado; typecheck/test/build passando (só doc, sem mudança de código).

---

## Fase 2 — Remover mock mode + design-preview

**Objetivo:** eliminar o `USE_MOCK` (risco de segurança se ligado em produção: bypassa auth e Supabase) e a página demo órfã. ~1.200+ linhas removidas.

### Estratégia: de fora pra dentro (folhas → raiz)

**Passo 1 — Consumidores primeiro:**
- `lib/queries/*` (`posts.ts`, `checkins.ts`, `ranking.ts`, `me.ts`, `timeline-page.ts`) — remover o ramo `if (IS_MOCK) return mock...`, deixando só o caminho Supabase.
- `lib/auth.ts` — remover os 6 pontos `if (IS_MOCK)` das funções `getSession`, `getCurrentProfile`, `getAuthHeaderContext`, `requireUser`, `requireAdmin`.
- `middleware.ts` — remover o `if (IS_MOCK) return response` (linhas 9-11) que bypassava a auth.

**Passo 2 — A raiz:**
- Deletar `lib/mock/` inteiro (incl. `db.ts`, 615 linhas).
- Deletar `lib/data-source/` (`env.ts` + `index.ts`) — a flag `IS_MOCK` deixa de existir.

**Passo 3 — A página demo:**
- Deletar `app/design-preview/` (527 linhas, órfã, 21 imports mortos).
- Remover as 3 referências a `design-preview` no `middleware.ts` (linha 20 e linha 72 do matcher).

**Passo 4 — Variáveis de ambiente:**
- Remover `USE_MOCK` e `MOCK_USER_ID` do `.env.example` e do `.env.local`.
- Atualizar docs que mencionam "demo mode" / `USE_MOCK` (`README.md`, `docs/CONFIGURATION.md`, etc.).

**Passo 5 — Testes:**
- Mapear quais specs dependem do mock. Specs que testavam comportamento do mock em si → deletados. Specs que testavam queries via mock → ajustados para mockar o Supabase diretamente (o projeto já tem esse padrão no `tests/setup.ts`) ou removidos se forem só cobertura de mock.
- **Incidente controlável:** se a reescrita de testes de query inflar muito, separar os testes num sub-PR para não travar a remoção do mock em si.

**Gates:** typecheck limpo (nenhum import quebrado de `lib/mock` ou `lib/data-source`); `pnpm test` passando; `pnpm build` sem erros; `pnpm lint` sem erros novos.

**Resultado:** auth/middleware/queries ficam mais diretos e legíveis; risco de "flag acidental em produção" desaparece.

---

## Fase 3 — Limpeza de código morto + deduplicação

**Natureza:** subtrativa, baixo risco, sem mudança de comportamento.

### Código morto a remover

| Item | Arquivo | Ação |
|---|---|---|
| `getClient()` + arquivo inteiro | `lib/supabase/client.ts` | Deletar (ninguém importa — app usa server actions) |
| `getMyCheckins` (`@deprecated`) | `lib/queries/me.ts:139` | Deletar |
| `getPostEngagement` (variante single) | `lib/queries/posts.ts` | Deletar (só `*Batch` e `*WithComments` são usadas) |
| `isAgencyAdminEmail` + `AGENCY_ADMIN_EMAIL_DOMAIN` | `lib/auth.ts:86` | Deletar |
| `userToggleSchema` + `UserToggleInput` | `lib/validation.ts` | Deletar |
| `postReactionKindSchema` | `lib/validation.ts` | Deletar (só `postReactionSetSchema` é usado) |
| `toEngagementRows` + `toCommentCountRows` | `lib/social/engagement.ts` | Deletar |

### Deduplicação

- **`requireAdminOrFail`** — cópia idêntica em `app/actions/posts.ts` e `app/actions/users.ts`. Extrair para helper único `app/actions/_shared/admin-guard.ts`.
- **Upload de capa** — bloco de ~10 linhas repetido em `createPostAction` e `updatePostAction` (`app/actions/posts.ts`). Extrair para helper `uploadPostCover(file, postId)`.
- **Parsing manual de FormData** — `createPostAction` e `updatePostAction` montam o objeto do `safeParse` duplicado. Unificar num construtor de payload.

### Cautela
Confirmar cada remoção com busca de referências antes de deletar. Se algo for referenciado de um arquivo não varrido pela auditoria (ex.: teste isolado), preservar e reportar.

**Gates:** typecheck limpo (confirma que nada importava o removido); `pnpm test` passando (deletar specs que cobriam funções removidas); `pnpm lint` com menos warnings.

---

## Fase 4 — Robustez

Altera comportamento — maior cuidado com regressão. **4.1 isolado num PR próprio**, separado de 4.2.

### 4.1 — RPC atômica para reações (PR isolado)

**Problema:** `setPostReactionAction` e `setCheckinReactionAction` (`app/actions/social.ts`) fazem "ler → deletar → inserir" em 3 chamadas separadas sem transação. Race condition sob cliques concorrentes: dois cliques podem ler `current` vazio e ambos inserirem → erro de unicidade. Os `delete()` também ignoram o `error`.

**Solução:** mover para RPC atômica no Postgres.

Nova migration `supabase/migrations/0013_toggle_reaction_rpc.sql` com duas funções:
- `toggle_post_reaction(p_post_id uuid, p_user_id uuid, p_reaction text)` → retorna `'set' | 'removed'`
- `toggle_checkin_reaction(p_checkin_id uuid, p_user_id uuid, p_reaction text)` → retorna `'set' | 'removed'`

Lógica dentro da RPC (transacional, `SECURITY DEFINER`):
1. `SELECT` a reação atual do usuário.
2. Existe e é igual à nova → `DELETE` → retorna `'removed'`.
3. Existe e é diferente → `UPDATE` → retorna `'set'`.
4. Não existe → `INSERT` → retorna `'set'`.

Tudo numa transação → imune a race condition (Postgres serializa via lock de linha na PK composta).

**Segurança:** `SECURITY DEFINER` em schema seguro; `EXECUTE` só para `authenticated`; valida internamente que `p_user_id = auth.uid()`. A RLS da tabela não é burlada.

As actions em `social.ts` passam a ser uma única chamada `.rpc(...)` ramificando só no valor de retorno.

### 4.2 — Allowlist de host no OG image

**Problema:** `fetchOgImage(url)` (`lib/sync/og-image.ts`) faz `fetch(url)` com a `original_url` da planilha, sem validar host. SSRF potencial (mitigado no Cloudflare, mas não no código).

**Solução:** allowlist de hosts das redes sociais, validado antes do fetch:

```ts
const ALLOWED_HOSTS = [
  'instagram.com', 'www.instagram.com',
  'linkedin.com', 'www.linkedin.com',
  'facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com',
  'tiktok.com', 'www.tiktok.com',
  'youtube.com', 'www.youtube.com', 'youtu.be',
  'threads.net', 'www.threads.net',
];
```

Antes do fetch: `new URL(url)`, normalizar hostname (lowercase), checar membership. Se não permitido → retornar `null` sem fetch. Rejeitar explicitamente hosts internos (`localhost`, `127.*`, `169.254.*`, `10.*`, `192.168.*`, `*.internal`). A flag `isValidPostImage` existente (rejeita avatares do Twitter) é preservada.

### Gates
- `pnpm typecheck` + `pnpm test` + `pnpm build`.
- Testes novos:
  - RPC: os 3 caminhos (set novo, troca de reação, toggle off). Como RPC em Postgres só roda de verdade com Supabase local (`supabase start`), os testes da RPC ficam como smoke test manual documentado em `docs/TESTING.md`; a action `social.ts` é testada mockando o `.rpc()`.
  - og-image: allowlist (host permitido → fetch; host bloqueado → null sem fetch).
- **Teste manual:** rodar a migration local (`supabase db reset`) e validar a RPC no banco.

---

## Fase 5 — CI/CD

**Objetivo:** automatizar os gates manuais, proteger `main` de regressões. Hoje não há pipeline; deploy é manual via `pnpm deploy`.

**Criar `.github/workflows/ci.yml`** — roda em todo PR e push para `main`:

1. Checkout + setup PNPM + Node (cache de `~/.pnpm-store`).
2. `pnpm install --frozen-lockfile` — falha se o lockfile não bate.
3. `pnpm typecheck` — `tsc --noEmit`.
4. `pnpm lint` — `next lint` (falha só em erros; warnings não quebram).
5. `pnpm test` — Vitest em modo run com `--reporter=verbose`.

Falha em qualquer passo bloqueia o merge.

### YAGNI deliberado
- **Sem deploy automatizado para Cloudflare:** funciona manual; automatizar exigiria secrets do CF no Actions + lidar com `wrangler deploy` em CI. Item futuro.
- **Sem E2E (Playwright) no CI:** caro/lento; os 111 specs unitários cobrem a lógica. Upgrade futuro.
- **Sem Husky/pre-commit:** o CI no PR já protege; hooks locais adicionam fricção por máquina.
- **Sem gate de cobertura (Codecov):** threshold força testes pra satisfazer métrica. Monitorar é útil, gatear não.

### Detalhe técnico
Job em `ubuntu-latest`, Node LTS `20.x`, ~2-3 min/run. Sem services extras (testes em happy-dom sem DB, conforme `vitest.config.ts`).

**Gates (meta):** workflow passa verde num PR de teste; um commit propositalmente quebrado → CI fica vermelho (validação do gate).

---

## Fase 6 — Lacunas UX

Polimento de fricções pequenas (documentadas em `.superpowers/sdd/progress.md`). Itens independentes, baixo risco.

### 6.1 — Login `?next=` funcionando
**Hoje:** o middleware seta `?next=/rota` no redirect (linha 55), o form coleta, mas `signInAction` ignora e sempre manda para `/timeline`.
**Solução:** `signInAction` recebe e valida `next` (path relativo começando com `/`, **não** pode ser `/login` ou `/signup` para evitar redirect loop); redireciona para lá em caso de sucesso. A página de login passa `next` (do search param) como campo hidden.

### 6.2 — Busca na lista de usuários (admin)
**Hoje:** `app/(admin)/admin/users/page.tsx` lista até 500 usuários sem filtro.
**Solução:** input de busca (nome/username/email) com query param `?q=`; a query filtra no Supabase via `ilike`. Sem paginação virtual (YAGNI para centenas de usuários). Reusar o padrão visual de filtros da timeline (`PostFilters`).

### 6.3 — Menu de usuário acessível
**Hoje:** `UserMenu` dropdown abre só por hover. Sem teclado/touch, sem `aria-haspopup`/`aria-expanded`.
**Solução:** converter para toggle por clique com:
- Botão com `aria-haspopup="menu"` e `aria-expanded` refletindo o estado.
- Fechar ao clicar fora (`pointerdown` no document) e ao pressionar `Escape`.
- Foco: ao abrir, focar o primeiro item.
- Visual atual mantido — só o comportamento muda de hover → click.

### 6.4 — README: resolver placeholder
**Hoje:** linha 76 tem `<!-- VERIFY: URL de produção do Worker no Cloudflare -->`. A URL real (`sebraiers.jhonatansoares.com`) está no `DECISIONS.md`.
**Solução:** substituir o placeholder pela URL confirmada.

**Gates:** typecheck + test + lint + build passando. Testes novos: validar `signInAction` respeita/rejeita `next`; validar a query de busca de usuários com filtro.

---

## Resumo

| Fase | Natureza | Risco | Volume |
|---|---|---|---|
| 1. Segurança | Documentação + processo | Baixo | Pequeno |
| 2. Remover mock + design-preview | Subtrativa | Médio (entranhado) | Grande (~1.200 linhas removidas) |
| 3. Código morto + deduplicação | Subtrativa | Baixo | Médio |
| 4.1 RPC de reações (PR isolado) | Aditiva + schema | Médio | Médio |
| 4.2 Allowlist OG image | Aditiva | Baixo | Pequeno |
| 5. CI/CD | Aditiva (infra) | Baixo | Pequeno |
| 6. Lacunas UX | Aditiva | Baixo | Médio |

## Fora de escopo (YAGNI / explícito)

- SaaS / multi-tenant.
- Secrets manager (Vault, Doppler).
- Deploy automatizado para Cloudflare no CI.
- E2E (Playwright) no CI.
- Husky / pre-commit hooks.
- Gate de cobertura de testes.
- Migração de `<img>` para `next/image` (decisão consciente do brief original, ligada ao loader do Cloudflare).
