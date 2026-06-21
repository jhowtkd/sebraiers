# SEBRAEIERS — Design Spec: Reações & Comentários (MVP Lúdico)

**Data:** 2026-06-21
**Versão:** 1.0
**Status:** Pronto para implementação

> **Brandbook:** todos os tokens visuais e componentes estão definidos em [`../../brand/`](../../brand/). Este spec adiciona uma camada social (reações + comentários) e ajustes de microcopy lúdica — não altera o design system base.
>
> **Spec base:** [`./2026-06-21-sebraeiers-design.md`](./2026-06-21-sebraeiers-design.md) — features, RLS, fluxos, ranking, admin continuam regidos pelo spec v1 (já implementado).

## 1. Resumo

Adiciona interações sociais leves ao SEBRAEIERS: reações emoji em posts e check-ins, e comentários simples (sem threads). Tom levemente mais informal/lúdico nas novas telas, sem renomear termos existentes (Post, Check-in, Ranking, Meu desempenho, Colaborador).

**Escopo:** MVP. Sem notificações, sem threads, sem likes em comentário, sem moderação, sem edição.

## 2. Decisões travadas (após brainstorming)

| Decisão | Escolha | Motivo |
|---|---|---|
| Onde aplicar reações/comentários | Posts **E** check-ins | Maximiza engajamento social; cada um com regras próprias (5 emojis em post, 1 em checkin) |
| Profundidade | MVP lúdico | Sem threads, sem likes em comentário, sem @mention, sem notificação |
| Reação em post | 5 emojis: 🔥💪👏🙌😂 | Cobre "amei", "motivacional", "comemoro", "valeu", "engraçado" sem poluir |
| Reação em checkin | 1 emoji: 👏 "Tamo junto" | Checkin é sobre celebrar conquista; reação multi-emoji diluiria o significado |
| Toggle vs acumulativo | Toggle | UX simples: clicar remove; clicar noutro emoji troca |
| Renomear termos existentes | Não | "Post", "Check-in", "Ranking" continuam — ludicidade fica só no microcopy novo |
| Edição de comentário | Não | Imutável no v1. Erro = viver com ele (consistente com simplicidade) |
| Ordenação de comentários | Mais recentes no topo | Mais engaging em contexto de gamificação |
| Notificações | Não (v1) | YAGNI explícito |
| Dark mode | Não (v1) | Já fora do escopo no spec base |

## 3. Mudanças vs spec v1 (sem impacto no que já existe)

- **Tabelas novas:** 4 (`post_reactions`, `post_comments`, `checkin_reactions`, `checkin_comments`).
- **Migration nova:** `supabase/migrations/0004_engagement.sql`.
- **Server actions novas:** 4 (`setPostReactionAction`, `addPostCommentAction`, `setCheckinReactionAction`, `addCheckinCommentAction`).
- **Queries novas:** `getPostEngagement(postId)`, `getCheckinEngagement(checkinId)`, `getPostsEngagementBatch(postIds[])` — evita N+1 na timeline.
- **Componentes novos:** `components/social/{reaction-bar,reaction-button,comments,comment-form}.tsx` + `lib/social/emojis.ts`.
- **Páginas modificadas:** `components/posts/post-card.tsx` (timeline), `app/(app)/post/[id]/page.tsx` (detail), `components/posts/checkin-history-list.tsx` (meu-desempenho).
- **RLS:** habilitado em todas as 4 novas tabelas, padrão "qualquer logado lê, dono escreve, admin deleta qualquer".
- **Reuso:** todas as ações usam `requireUser()` (já existente) + `createClient()` (já existente). Sem dependência de service_role.
- **Sem alteração** no design system (tokens, tipografia, componentes primitivos) — apenas adiciona camada social.

## 4. Modelo de dados (4 tabelas novas)

Todas em `public.*`. RLS habilitado em todas.

### 4.1 `post_reactions` (N:N user ↔ post por reaction)
```sql
post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE
user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
reaction    text NOT NULL CHECK (reaction IN ('fire','muscle','clap','raised','laugh'))
created_at  timestamptz NOT NULL DEFAULT now()
PRIMARY KEY (post_id, user_id, reaction)
```
PK composta garante "uma reação por (user, post, reaction)" — toggle = `delete` + `insert` em transação.

### 4.2 `post_comments` (1:N post → comments)
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE
user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
body        text NOT NULL CHECK (length(body) BETWEEN 1 AND 500)
created_at  timestamptz NOT NULL DEFAULT now()
```
Índices: `(post_id, created_at DESC)` para lista por post ordenada por mais recente.

### 4.3 `checkin_reactions` (N:N user ↔ checkin)
```sql
checkin_id  uuid NOT NULL REFERENCES checkins(id) ON DELETE CASCADE
user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
reaction    text NOT NULL DEFAULT 'clap' CHECK (reaction IN ('clap'))
created_at  timestamptz NOT NULL DEFAULT now()
PRIMARY KEY (checkin_id, user_id, reaction)
```

### 4.4 `checkin_comments` (1:N checkin → comments)
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
checkin_id  uuid NOT NULL REFERENCES checkins(id) ON DELETE CASCADE
user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
body        text NOT NULL CHECK (length(body) BETWEEN 1 AND 300)
created_at  timestamptz NOT NULL DEFAULT now()
```
Índices: `(checkin_id, created_at DESC)`.

## 5. RLS

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `post_reactions` | qualquer logado | próprio user_id | — | próprio user_id; admin pode deletar qualquer |
| `post_comments` | qualquer logado | próprio user_id | — | próprio user_id; admin pode deletar qualquer |
| `checkin_reactions` | próprio + admin | próprio | — | próprio; admin pode deletar qualquer |
| `checkin_comments` | próprio user + admin + autor do checkin (ver abaixo) | próprio | — | próprio; admin pode deletar qualquer |

**Detalhe `checkin_comments` SELECT:** além do autor e do admin, **o dono do checkin** (o user que fez o checkin) também pode ver — caso contrário, a função de "apoia o mano" no `/meu-desempenho` não funciona. Concretamente:

- SELECT: `auth.uid() = user_id` OR `EXISTS (SELECT 1 FROM checkins WHERE checkins.id = checkin_comments.checkin_id AND checkins.user_id = auth.uid())` OR `is_admin = true`.
- Mesma lógica para `checkin_reactions`.

**INSERT em `post_reactions` / `checkin_reactions`:** precisa de `WITH CHECK` que garante:
- `user_id = auth.uid()` (não pode reagir em nome de outro)
- target existe e está ativo: `EXISTS (SELECT 1 FROM posts WHERE posts.id = post_reactions.post_id AND posts.is_active = true)`.

**Sem `UPDATE` em nenhuma tabela** — todas imutáveis. Reação errada = `delete` + `insert` (toggle).

**Sem `admin delete` automático:** a policy `DELETE` usa `auth.uid() = user_id OR is_admin = true` para cobrir ambos os casos. Implementação: `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)`.

## 6. Server actions

Todas em arquivos novos. Server-first, RLS-enforced, Zod-validated.

### 6.1 `setPostReactionAction({ post_id, reaction })`
- Valida com `postReactionSetSchema` (Zod: `post_id: uuid`, `reaction: enum`).
- Verifica que post existe e `is_active=true`.
- **Semântica "set"** (não toggle simples): dada a reação clicada:
  1. Lê as reações atuais do user para esse post.
  2. Se a reação clicada já é a única atual: **remove** (set vazio).
  3. Caso contrário: **remove todas** as atuais e **adiciona** a clicada (substitui).
- Implementação: 3 queries em transação (`select` + `delete` + condicional `insert`). Retorna `{ ok: true, reaction: 'fire' | null }` (estado final).
- `revalidatePath('/timeline')`, `revalidatePath('/post/[id]')`.

### 6.2 `addPostCommentAction({ post_id, body })`
- Valida com `postCommentSchema` (Zod: `post_id: uuid`, `body: 1..500`).
- Verifica que post existe e `is_active=true` (RLS também enforce).
- Insere com `user_id = auth.uid()`.
- Revalida `/timeline` e `/post/[id]`.

### 6.3 `setCheckinReactionAction({ checkin_id, reaction: 'clap' })`
- Mesma lógica "set" do 6.1 mas para checkin. Reaction hardcoded como `'clap'`.
- Verifica que checkin existe e `status='approved'` (não faz sentido aplaudir checkin pendente/rejeitado).
- Revalida `/meu-desempenho` do autor + do reator.

### 6.4 `addCheckinCommentAction({ checkin_id, body })`
- Mesma lógica do 6.2 mas para checkin.
- Verifica que checkin existe e `status='approved'` (não faz sentido comentar em pendente/rejeitado).
- Revalida `/meu-desempenho` do autor + do comentador.

## 7. Queries (server-only)

### 7.1 `getPostEngagement(postId)`
Retorna:
```ts
{
  reactions: { fire: number; muscle: number; clap: number; raised: number; laugh: number },
  myReactions: Set<'fire'|'muscle'|...>,  // subset que o user logado reagiu
  comments: { id, body, created_at, user: { full_name, username, avatar_url } }[]
}
```
2 queries: `post_reactions` agregada por reaction + `post_comments` com join em profiles. Sem N+1.

### 7.2 `getCheckinEngagement(checkinId)`
Mesma forma, escopo checkin.

### 7.3 `getPostsEngagementBatch(postIds[])`
Para a timeline. Retorna `Map<postId, { reactions, myReactions, commentCount }>`. Comentários em si não são incluídos (lazy no detail page). 2 queries agregadas (`group by post_id`).

## 8. UI

### 8.1 `lib/social/emojis.ts`
```ts
export const POST_REACTIONS = {
  fire: { emoji: '🔥', label: 'Arrasou' },
  muscle: { emoji: '💪', label: 'Força' },
  clap: { emoji: '👏', label: 'Aplausos' },
  raised: { emoji: '🙌', label: 'Comemorando' },
  laugh: { emoji: '😂', label: 'Engraçado' },
} as const;

export const CHECKIN_REACTIONS = {
  clap: { emoji: '👏', label: 'Tamo junto' },
} as const;
```

### 8.2 Componentes

**`<ReactionBar target postId | checkinId reactions myReactions canReact />`** (server)
- Renderiza os 5 botões (post) ou 1 botão (checkin).
- Cada botão: `<ReactionButton>` (client child) com emoji + contador.
- Se `reactions[reaction] === 0 && !myReactions.has(reaction)`, mostra botão "fantasma" (sem contador visível mas clicável).
- Empty state: "Bora dar um 🔥".

**`<ReactionButton emoji label count active target reaction />`** (client, `'use client'`)
- Estado: `idle | busy`. `onClick` chama `togglePostReactionAction` ou `toggleCheckinReactionAction`.
- Visual: emoji 20px + contador 12px. Quando `active`, bg `bg-tier-ouro/20` + borda. Hover: `bg-surface-sunken`. Click: feedback "pop" (animate-fade-in 200ms).
- Toast em sucesso: "🔥 adicionado!" ou "👋 removido".

**`<Comments target postId | checkinId comments currentUserId />`** (server)
- Lista de comentários (mais recentes no topo).
- Cada item: avatar 32px + nome + `@username · formatRelative(body.created_at)` + body.
- Empty state: "Ninguém falou nada ainda. Fala aí."
- Rodapé: `<CommentForm>` (client child).

**`<CommentForm target postId | checkinId />`** (client, `'use client'`)
- RHF + Zod. Char counter (xxx/500 ou 300).
- Submit desabilitado se vazio, `busy` enquanto envia.
- Toast sucesso: "Comentário publicado".

### 8.3 Modificações

**`PostCard` (timeline):**
- Acima do "Abrir publicação original": `<ReactionBar>` com `compact=true` (5 botões menores).
- Ao lado: `💬 {commentCount}` clicável (leva ao `/post/[id]`, scroll até comentários).

**`app/(app)/post/[id]/page.tsx` (detail):**
- Após o `<CheckinButtons>`, novo `<Card>` com `<ReactionBar>` (full) + `<Comments>`.

**`CheckinHistoryList` (meu-desempenho):**
- Para cada checkin, abaixo do card, renderiza: `👏 3` + `💬 1`. Clicável expande inline (collapsible) com a lista de comentários.
- Se checkin é do próprio user logado, mostra TODOS os comentários e reações (não esconde nada). Se é de outro user, mostra os próprios comentários que o user fez + contagens totais (privacidade mínima: não vejo os comentários alheios no histórico de outra pessoa).

## 9. Microcopy (lúdico)

| Contexto | Texto |
|---|---|
| Toast: adicionar reação | `🔥 adicionado!` / `👏 Tamo junto!` |
| Toast: remover reação | `Removido` |
| Toast: comentar | `Comentário publicado` |
| Empty reactions (post) | `Bora dar um 🔥` |
| Empty reactions (checkin) | `Ninguém mandou energia ainda. Bora ser o primeiro!` |
| Empty comments | `Ninguém falou nada ainda. Fala aí.` |
| Placeholder comentário post | `Fala aí...` |
| Placeholder comentário checkin | `Deixa um elogio` |
| Título seção comentários | `Conversa` |
| Char counter (perto do limite) | `450/500` em tom-warning quando faltar 50 |

## 10. Estados transversais (já cobertos pelos componentes primitivos)

- Loading: `<Skeleton>` nos botões de reação e na lista de comentários.
- Erro: toast com `variant='error'`. `<ReactionButton>` volta pro estado anterior (reverter optimistic update).
- Sem permissão: `<ReactionButton>` desabilitado se `!canReact` (ex: user não logado em SSR — mas todas as páginas são logadas, então irrelevante).

## 11. Segurança

- **Sem SQL injection:** queries via PostgREST + RLS. Insert via `supabase.from(...).insert({...})` com `user_id = auth.uid()` enforced pelo `with check` da policy.
- **Sem XSS:** body do comentário é texto puro, React escapa por default. Sem `dangerouslySetInnerHTML`.
- **Rate limit:** YAGNI v1. Supabase tem rate limit built-in por IP (50 req/s por padrão).
- **Validação Zod** em todas as actions. CHECK constraints no DB (length 1..500, 1..300) como segunda linha de defesa.
- **Sem `is_active` check** em `post_comments` SELECT — comentários de posts inativos são invisíveis via join + RLS? **Não, na verdade:** política `post_comments SELECT` precisa de `EXISTS (SELECT 1 FROM posts WHERE posts.id = post_comments.post_id AND posts.is_active = true)` para esconder. Senão, quem sabe o ID acessa. **Decisão:** SELECT em `post_comments` requer post ativo OU ser admin OU ser autor do comentário. INSERT precisa de post ativo.

## 12. Out of scope (YAGNI explícito)

- ❌ Threads/replies em comentários
- ❌ Likes em comentários
- ❌ @menções
- ❌ Notificações (in-app, push, email)
- ❌ Edit/delete de comentários pelo autor
- ❌ Animações de "+1" flutuando
- ❌ "X pessoas reagiram" expandindo pra mostrar quem reagiu
- ❌ Moderação (reports, ban, mute)
- ❌ Reações customizadas pelo admin
- ❌ Confetti / gamificação visual extra
- ❌ Dark mode
- ❌ Migrar reactions/comments antigas (não existem — feature nova)

## 13. Critérios de sucesso (auto-check)

- [ ] User comum: abre timeline, reage com 🔥 num post → contador incrementa imediatamente (optimistic) → reverte se erro.
- [ ] User comum: comenta num post → comentário aparece no topo da lista, persiste após reload.
- [ ] User comum: reage num checkin de outro user com 👏 → reação aparece no /meu-desempenho do autor.
- [ ] User comum: NÃO consegue deletar reação/comentário de outro (RLS bloqueia).
- [ ] Admin: consegue deletar qualquer reação/comentário (moderation básica).
- [ ] Mobile: 5 botões de reação cabem em uma linha sem overflow (testar 375px).
- [ ] `pnpm build` sem erros, `pnpm lint` sem warnings críticos, `pnpm test` ≥ 35 testes passando (31 existentes + ~4 novos para as actions).

## 14. Estrutura de pastas (mudanças vs v1)

```
supabase/
  migrations/
    0001_init.sql (existente)
    0002_security_hardening.sql (existente)
    0003_decide_checkin_rpc.sql (existente)
    0004_engagement.sql                          # NOVO
lib/
  social/
    emojis.ts                                   # NOVO
  queries/
    posts.ts (existente — adiciona getPostEngagement, getPostsEngagementBatch)
    checkins.ts (existente — adiciona getCheckinEngagement)
  actions/
    social.ts                                   # NOVO (4 actions)
  validation.ts (existente — adiciona postReactionToggleSchema, postCommentSchema, checkinReactionToggleSchema, checkinCommentSchema)
app/
  actions/
    social.ts                                   # NOVO (re-export ou server actions direto)
components/
  social/
    reaction-bar.tsx                            # NOVO
    reaction-button.tsx                         # NOVO
    comments.tsx                                # NOVO
    comment-form.tsx                            # NOVO
  posts/
    post-card.tsx (existente — modifica pra incluir reaction bar + comment count)
  posts/checkin-history-list.tsx (existente — modifica pra mostrar reactions + comments inline)
app/
  (app)/
    post/[id]/page.tsx (existente — adiciona bloco de conversa)
tests/
  lib/actions/
    social.test.ts                              # NOVO (4 actions, ~8 testes)
docs/superpowers/
  specs/
    2026-06-21-sebraeiers-design.md (existente, v1)
    2026-06-21-sebraeiers-social-features-design.md  # ESTE DOC
  plans/
    2026-06-21-sebraeiers-social-features-implementation.md  # a ser criado pelo writing-plans
```
