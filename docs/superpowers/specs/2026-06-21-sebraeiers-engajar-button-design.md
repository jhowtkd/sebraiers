# SEBRAEIERS — Design Spec: Botão ENGAJAR no Feed

**Data:** 2026-06-21
**Versão:** 1.0
**Status:** Pronto para implementação

> **Specs base:**
> - [`./2026-06-21-sebraeiers-design.md`](./2026-06-21-sebraeiers-design.md) — design v1
> - [`./2026-06-21-sebraeiers-feed-ig-design.md`](./2026-06-21-sebraeiers-feed-ig-design.md) — redesign IG do feed (acabei de implementar)
>
> Este spec adiciona **1 botão CTA grande** no footer de cada card do feed. Mudança puramente visual/estrutural, sem alteração de modelo de dados, RLS, fluxos ou outras páginas.

## 1. Resumo

Substitui o footer atual do `PostCard` (timestamp + link externo pequeno `via {network} ↗`) por um botão CTA grande **ENGAJAR** (full-width, pill, brand-azul, uppercase) que leva o usuário à publicação original (`post.original_url`) em nova aba. Abaixo do CTA, uma linha de meta menor com tempo + rede.

**Escopo:** apenas o `PostCard`. Post detail, /meu-desempenho, /ranking, /admin, auth e outras telas ficam intactas.

## 2. Decisões travadas (após brainstorming)

| Decisão | Escolha | Motivo |
|---|---|---|
| O que o botão faz | Abre `post.original_url` em nova aba | Mesmo destino do link `via {network} ↗` atual, mas como CTA explícito |
| Posição | Footer do card (substitui o footer atual) | Hierarquia: ação principal vem ANTES de meta info |
| Visual | Full-width pill, `bg-brand-azul`, texto branco uppercase | IG-minimalista; brand color é institucional SEBRAE; pill é IG-padrão |
| Texto | "ENGAJAR" (maiúsculas) | Spec do usuário, verb de ação direto |
| Ícone | Sem ícone | Texto bold + uppercase já comunica ação; ícone polui |
| Meta info (tempo + rede) | Mantém, em linha menor abaixo do CTA, sem link | "Ver no Instagram" era meio do link externo; agora fica como info |
| Tracking "já engajou" | Não | Confunde com check-in do detail page; não temos dado de tracking |
| Botão no post detail | Não | Detail já tem a lógica de check-in formal (Curti/Comentei/Compartilhei) |

## 3. Mudanças vs specs anteriores

- **`components/posts/post-card.tsx`**: `<footer>` substituído. Antes tinha `time` + `<a>` externo; agora tem CTA + meta linha.
- **Sem alteração** em:
  - Tipo `Post`, query `getTimeline`, RLS, reactions, comments
  - Header (avatar + autor + handle + tempo + rede)
  - Action bar (5 reações + 💬)
  - Caption (autor + título + descrição + "Ver todos os comentários")
  - Cover (1:1)
  - Post detail page, /meu-desempenho, /ranking, /admin, auth
  - `PostFilters` no topo do feed

## 4. Layout do footer (novo)

```
┌─────────────────────────────────────────┐
│                                         │
│        ┌───────────────────────┐        │
│        │       ENGAJAR         │        │   CTA: full-width pill, brand-azul
│        └───────────────────────┘        │
│                                         │
│        há 2 horas · via Instagram        │   meta: texto menor, centralizado
└─────────────────────────────────────────┘
```

## 5. Estrutura HTML (nova)

```tsx
<footer className="px-3 pb-3 space-y-2">
  <a
    href={post.original_url}
    target="_blank"
    rel="noopener noreferrer"
    className="block"
  >
    <Button className="w-full" size="lg">
      ENGAJAR
    </Button>
  </a>
  <p className="text-caption text-text-muted text-center">
    {time} · via {networkLabel}
  </p>
</footer>
```

**Notas:**
- `<a>` envolvendo `<Button>` para o link externo (target="_blank" + rel="noopener noreferrer" para segurança).
- `<Button>` da primitiva existente (`components/ui/button.tsx`), variante padrão `primary` que já é `bg-brand-azul`. Sem precisar de variante nova.
- `size="lg"` dá o padding generoso (h-12).
- `<p>` centralizado com `text-center` mostra tempo + rede como info menor.

## 6. Mudanças específicas no PostCard

### Removido (footer antigo):
```tsx
<footer className="px-3 pb-3 flex items-center justify-between text-caption text-text-muted">
  <time dateTime={post.published_at}>{time}</time>
  <a href={post.original_url} target="_blank" rel="noopener noreferrer"
     className="inline-flex items-center gap-1 hover:text-brand-azul">
    via {networkLabel} <ExternalLink className="h-3 w-3" />
  </a>
</footer>
```

### Adicionado (footer novo):
```tsx
<footer className="px-3 pb-3 space-y-2">
  <a
    href={post.original_url}
    target="_blank"
    rel="noopener noreferrer"
    className="block"
  >
    <Button className="w-full" size="lg">
      ENGAJAR
    </Button>
  </a>
  <p className="text-caption text-text-muted text-center">
    {time} · via {networkLabel}
  </p>
</footer>
```

**Imports:**
- Adicionar: `import { Button } from '@/components/ui/button';`
- Remover: `import { ... ExternalLink } from 'lucide-react';` (não é mais usado)

## 7. Estados

- **Loading:** tratado pelo root `loading.tsx` (não muda).
- **Hover do botão:** `hover:bg-brand-azul-600` (já é o hover default da variante `primary` do Button).
- **Focus do botão:** `focus:shadow-focus` (já é o focus default).
- **Sem rede / sem internet:** o `<a target="_blank">` é uma navegação padrão do browser; o browser lida com offline.

## 8. Out of scope (YAGNI)

- ❌ Tracking se o user "engajou" (não tem conceito de engajamento persistido aqui)
- ❌ Botão diferente por rede (sempre "ENGAJAR", mesmo texto)
- ❌ Confetti / animação no click
- ❌ Modal de "compartilhe antes de engajar"
- ❌ Tooltip / microcopy ao hover
- ❌ Mudar o botão pra "JÁ ENGAJOU" baseado em histórico
- ❌ Botão no post detail page (detail já tem check-in formal)
- ❌ Mudar o tipo/forma do botão (variação visual por status, ex: pending check-in)

## 9. Critérios de sucesso (auto-check)

- [ ] Cada card no feed tem um botão "ENGAJAR" full-width pill, brand-azul, texto branco uppercase.
- [ ] Click no botão abre `post.original_url` em nova aba.
- [ ] Footer do card mostra tempo + "via {network}" centralizado, em fonte menor.
- [ ] Header, action bar, caption, cover intactos.
- [ ] Post detail page intacta.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` todos limpos.
- [ ] 42+ testes passando.

## 10. Estrutura de pastas (mudanças)

```
components/
  posts/
    post-card.tsx               # MODIFY (footer substituído)
docs/superpowers/
  specs/
    2026-06-21-sebraeiers-engajar-button-design.md  # ESTE DOC
  plans/
    2026-06-21-sebraeiers-engajar-button-implementation.md  # a ser criado pelo writing-plans
```
