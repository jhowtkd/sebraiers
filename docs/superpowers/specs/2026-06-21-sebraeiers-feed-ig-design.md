# SEBRAEIERS — Design Spec: Feed estilo Instagram

**Data:** 2026-06-21
**Versão:** 1.0
**Status:** Pronto para implementação

> **Specs base:**
> - [`./2026-06-21-sebraeiers-design.md`](./2026-06-21-sebraeiers-design.md) — design v1 (sistema completo)
> - [`./2026-06-21-sebraeiers-social-features-design.md`](./2026-06-21-sebraeiers-social-features-design.md) — design da camada social (reações + comentários)
>
> Este spec é uma **mudança de layout do feed (timeline)** apenas. Não altera modelo de dados, RLS, sistema de reactions/comments, nem fluxos. O post detail page, /meu-desempenho, /ranking, /admin e autenticação ficam como estão.

## 1. Resumo

Redesenha o feed (`/timeline`) com layout single column estilo Instagram web: card por post com header (autor + tempo + rede discreta), cover image 1:1, action bar com 5 reações + link de comentário, caption com autor + título + descrição, e footer com tempo e link pro post original. Sistema de reactions/comments intacto.

**Escopo:** apenas o feed (timeline page + post-card). Não toca detail, /meu-desempenho, /ranking, /admin, nem auth.

## 2. Decisões travadas (após brainstorming)

| Decisão | Escolha | Motivo |
|---|---|---|
| Layout do feed | Single column ~600px max, centralizado | IG web é single column. Foco em 1 post por vez, scroll vertical |
| Aspect ratio do cover | 1:1 (quadrado) com `object-cover` | IG padrão. Corta imagens landscape do seed (já feito com `object-cover`) |
| Reações | Manter 5 emojis (🔥💪👏🙌😂) na action bar | Sistema multi-reaction é diferencial do app; não regredir pra single heart |
| Header do post | Avatar + nome + @handle + rede discreta ("via Instagram") | IG mostra o user; a gente tem 6 redes mas não pode esconder |
| Click no card inteiro | Vai pra `/post/[id]` (detail) | IG: qualquer área da imagem abre o modal/detail |
| Click no `↗` do footer | Abre `post.original_url` em nova aba | Link externo, comportamento IG |
| Post detail page | NÃO MUDA | Já tem ReactionBar grande + Conversa; foge do escopo |
| Seed: avatares nos fake users | Opcional, pode ser feito depois | Nice-to-have, não bloqueia |

## 3. Mudanças vs specs anteriores

- **`app/(app)/timeline/page.tsx`**: container vira `max-w-[600px] mx-auto` (em vez de herdar `max-w-7xl` do layout pai)
- **`components/posts/post-card.tsx`**: reescrita quase completa — estrutura nova com header semântico
- **`lib/queries/posts.ts`**: `getTimeline` ganha embed do autor (PostgREST: `author:profiles!posts_created_by_fkey(full_name, username, avatar_url)`)
- **`lib/types.ts`**: `Post` ganha campo opcional `author?: { full_name: string; username: string; avatar_url: string | null } | null`
- **Sem alteração** em:
  - `ReactionBar`, `ReactionButton` (reutilizados como compact na action bar)
  - Sistema de reactions, comments, RLS, triggers
  - `PostFilters` (rede + busca) — continua no topo, IG-style
  - Post detail page, /meu-desempenho, /ranking, /admin, auth
  - `EmptyState`, `Skeleton`, demais primitivos
  - Brandbook (cores, tipografia, espaçamento)

## 4. Layout do card (visual)

```
┌─────────────────────────────────────────┐
│ [avatar] Maria Silva              há 2h  │   header
│          @maria · via Instagram          │   sub-header
├─────────────────────────────────────────┤
│                                         │
│         COVER IMAGE (1:1)               │   cover (object-cover)
│                                         │
├─────────────────────────────────────────┤
│ 🔥 3  💪 1  👏 0  🙌 0  😂 0  💬 2      │   action bar
├─────────────────────────────────────────┤
│ Maria Silva  5 erros comuns ao abrir...  │   caption (autor + título em negrito)
│ Descrição do post pode ter 2-3 linhas  │   descrição (line-clamp-3)
│                                         │
│ Ver todos os 2 comentários              │   link pra detail
├─────────────────────────────────────────┤
│ há 2 horas • via Instagram ↗            │   footer
└─────────────────────────────────────────┘
         max-w-[600px] mx-auto
```

## 5. Estrutura HTML do card (semântica)

```tsx
<article className="bg-surface-elevated rounded-xl border border-border-subtle overflow-hidden">
  {/* header */}
  <header className="flex items-center gap-3 p-3">
    <Avatar className="h-8 w-8">
      {post.author?.avatar_url && <AvatarImage src={post.author.avatar_url} alt={post.author.full_name} />}
      <AvatarFallback className="bg-brand-azul text-white text-caption font-semibold">
        {initials(post.author?.full_name ?? '?')}
      </AvatarFallback>
    </Avatar>
    <div className="flex-1 min-w-0">
      <p className="text-body-sm font-semibold text-text-primary truncate">
        {post.author?.full_name ?? 'Anônimo'}
      </p>
      <p className="text-caption text-text-muted truncate">
        @{post.author?.username ?? 'anônimo'} · via {NETWORK_LABELS[post.network]}
      </p>
    </div>
    <time dateTime={post.published_at} className="text-caption text-text-muted">
      {formatRelative(post.published_at)}
    </time>
  </header>

  {/* cover (clickable to detail) */}
  <Link href={`/post/${post.id}`}>
    <figure className="aspect-square w-full bg-surface-sunken overflow-hidden">
      <img src={post.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
    </figure>
  </Link>

  {/* action bar */}
  <div className="flex items-center gap-1 px-3 py-2 border-b border-border-subtle">
    <ReactionBar target="post" targetId={post.id} engagement={engagement} compact />
    <Link href={`/post/${post.id}#conversa`} className="ml-auto inline-flex items-center gap-1 text-caption text-text-muted hover:text-brand-azul">
      <MessageCircle className="h-4 w-4" />
      <span className="tabular-nums">{engagement.commentCount}</span>
    </Link>
  </div>

  {/* caption */}
  <div className="px-3 py-3 space-y-1">
    <p className="text-body-sm text-text-primary">
      <span className="font-semibold">{post.author?.username ?? 'anônimo'}</span>{' '}
      {post.title}
    </p>
    {post.description && (
      <p className="text-body-sm text-text-secondary line-clamp-3">
        {post.description}
      </p>
    )}
    {engagement.commentCount > 0 && (
      <Link href={`/post/${post.id}#conversa`} className="block text-caption text-text-muted hover:text-brand-azul">
        Ver todos os {engagement.commentCount} comentários
      </Link>
    )}
  </div>

  {/* footer */}
  <footer className="px-3 pb-3 flex items-center justify-between text-caption text-text-muted">
    <time dateTime={post.published_at}>{formatRelative(post.published_at)}</time>
    <a href={post.original_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-brand-azul">
      via {NETWORK_LABELS[post.network]} <ExternalLink className="h-3 w-3" />
    </a>
  </footer>
</article>
```

## 6. Query (muda)

`getTimeline` em `lib/queries/posts.ts` ganha embed do autor:

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

**Nome do FK no embed:** `posts_created_by_fkey` é o nome auto-gerado pelo Postgres para `created_by uuid references public.profiles(id)` em `0001_init.sql:39`. Se a migration local gerou nome diferente, ajustar.

## 7. Tipo (muda)

`Post` em `lib/types.ts` ganha campo opcional:

```ts
export interface Post {
  // ... campos existentes
  author?: {
    full_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
}
```

O `?` + `| null` é porque `getTimeline` faz `.from('posts').select('*')` (que é `select *` — retorna todas as colunas + embedded), e o embed pode vir null se a FK falhar (improvável mas defensivo). A página verifica `post.author?.full_name` e cai num fallback (`'Anônimo'`, `@anônimo`) se vier null.

## 8. Timeline page (muda)

`app/(app)/timeline/page.tsx`:

- Remove o wrapper `max-w-7xl` herdado (ele já não está aqui — está em `app/(app)/layout.tsx`).
- O layout pai continua com `max-w-7xl`. O feed vai precisar de **container interno** que sobreponha: `mx-auto max-w-[600px]`.
- Isso é o **único mudança no page**; o resto (filtros, engagement batch, lista) continua igual.

Detalhe: o `PostFilters` (rede + busca) **fica em cima do feed** mas o container de 600px também envolve os filtros? **Decisão:** filtros ficam em container 600px (alinhados com o feed). Mais consistente visualmente. Se o filtro for grande, pode precisar de mais espaço, mas pra v1 fica.

```tsx
<div className="mx-auto max-w-[600px] px-4 sm:px-0 space-y-4">
  <PostFilters />
  {posts.length === 0 ? <EmptyState ... /> : (
    <ul className="space-y-6">
      {posts.map((p) => <li key={p.id}><PostCard post={p} engagement={engagementMap.get(p.id)} /></li>)}
    </ul>
  )}
</div>
```

(Substitui o wrapper `grid sm:grid-cols-2 lg:grid-cols-3` atual.)

## 9. Estados

- **Loading:** mantém o atual (root `loading.tsx`).
- **Empty:** mantém `<EmptyState>`.
- **Sem cover image:** o `<figure>` é renderizado vazio com bg `surface-sunken` (defensivo).
- **Author null (raro):** fallbacks `Anônimo` / `@anônimo` na UI; o card ainda funciona.

## 10. Out of scope (YAGNI)

- ❌ Stories (topo do feed tipo IG)
- ❌ Reels (vídeo vertical)
- ❌ Carousel de múltiplas imagens por post (1 imagem por post)
- ❌ Modal de "ver todos os comentários" (leva ao detail page)
- ❌ Salvar post (🔖 bookmark)
- ❌ Compartilhar pra outro app (share sheet do OS)
- ❌ Edit/legendas
- ❌ Dark mode
- ❌ Skeleton específico pro novo card (usa `<Skeleton>` existente)
- ❌ Animações (fade-in/slide no card)
- ❌ Click no avatar → perfil (não existe feature de perfil)
- ❌ "Seguir" usuário
- ❌ Post detail com mesmo layout IG (mantém o atual)
- ❌ Paginação infinita (continua com `.limit(100)`)

## 11. Critérios de sucesso (auto-check)

- [ ] Single column ~600px centralizado no desktop; idêntico no mobile.
- [ ] Cada card mostra: header (avatar+nome+@handle+tempo+badge de rede), cover 1:1, action bar (5 reações + 💬), caption (autor + título + descrição), footer (tempo + via {network} ↗).
- [ ] Click em qualquer parte do card (exceto botões de reação, comentário, ou link externo) → `/post/[id]`.
- [ ] Click no `↗` do footer → abre `post.original_url` em nova aba.
- [ ] Reações funcionam igual (toggle/set semantic, optimistic update).
- [ ] Post detail page continua com o layout atual (ReactionBar grande + Conversa).
- [ ] Empty state aparece quando não há posts.
- [ ] Filtros (rede + busca) continuam funcionais.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` todos limpos.
- [ ] 42+ testes passando.

## 12. Estrutura de pastas (mudanças)

```
lib/
  queries/posts.ts                              # MODIFY (getTimeline ganha embed)
  types.ts                                      # MODIFY (Post.author?)
app/
  (app)/
    timeline/page.tsx                           # MODIFY (container 600px)
components/
  posts/
    post-card.tsx                               # REWRITE (estrutura nova)
docs/superpowers/
  specs/
    2026-06-21-sebraeiers-feed-ig-design.md     # ESTE DOC
  plans/
    2026-06-21-sebraeiers-feed-ig-implementation.md  # a ser criado pelo writing-plans
```
