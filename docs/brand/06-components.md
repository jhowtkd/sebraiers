# 06 — Componentes

Guia de cada peça de UI do app: anatomia, estados, regras de uso. Cada componente respeita os tokens de [02-cores](./02-colors.md), [03-tipografia](./03-typography.md) e [07-espaçamento](./07-spacing-grid.md).

> **Biblioteca:** shadcn/ui como base (acessível, copy-paste, sem vendor lock-in). Tudo aqui é **adaptação** ou **wrapper** em cima do shadcn.

---

## 1. Button

Ação principal de cada tela. Três variantes + estados derivados.

### Variantes

| Variante | Uso | Aparência |
|---|---|---|
| **Primary** | Ação principal (Curtir, Comentar, Compartilhar, Salvar) | Fundo `--brand-azul`, texto branco, hover escurece 10% |
| **Secondary** | Ação secundária (Cancelar, Voltar) | Fundo transparente, borda `--border-strong`, texto `--text-primary` |
| **Ghost** | Ação terciária (Ajuda, Pular) | Sem fundo, sem borda, texto `--text-secondary`, hover com fundo `--brand-ceu-100` |
| **Danger** | Ação destrutiva (Rejeitar, Excluir) | Fundo `--state-error`, texto branco |
| **Success** | Confirmação positiva (Aprovar check-in) | Fundo `--state-success`, texto branco |

### Tamanhos

| Tamanho | Altura | Padding | Uso |
|---|---|---|---|
| `sm` | 36px | 12px / 16px | Em cards, tabelas |
| `md` | 44px | 14px / 20px | **Padrão do app** — toque mínimo WCAG |
| `lg` | 52px | 16px / 24px | CTAs de página (Login, Cadastrar post) |

### Estados

| Estado | Como fica |
|---|---|
| Default | Cor base da variante |
| Hover | Escurece 8% (primary) / clareia (ghost) |
| Focus | Borda externa `3px` em `--brand-azul` com opacidade 32% (`--shadow-focus`) |
| Disabled | Cor `--text-disabled`, cursor `not-allowed`, sem hover |
| Loading | Spinner `Loader2` à esquerda, label oculto mas aria-label mantido |

### Anatomia (Primary md)

```
┌──────────────────────────────────────┐
│  [icon]  Label do botão             │  ← 44px altura
└──────────────────────────────────────┘
   ↑ opcional      ↑ Figtree Semibold, 15px
```

### Regra crítica

> **Nunca** dois botões `primary` lado a lado. Hierarquia é clara: um primário, outros secundários/ghost.

---

## 2. Input (campo de texto)

### Variantes

| Variante | Aparência |
|---|---|
| Default | Borda `--border-subtle`, fundo `--surface-elevated` |
| Focus | Borda `--border-focus` + `--shadow-focus` |
| Error | Borda `--state-error` + `--shadow-focus-error`, texto de erro embaixo |
| Disabled | Fundo `--surface-sunken`, texto `--text-disabled` |

### Anatomia

```
┌──────────────────────────────────────┐
│  Label do campo                      │  ← overline 11px
│  ┌────────────────────────────────┐  │
│  │ [icon]  placeholder...         │  │  ← 44px altura
│  └────────────────────────────────┘  │
│  Texto de ajuda                       │  ← caption 12px
└──────────────────────────────────────┘
```

### Estados

| Estado | Quando |
|---|---|
| Vazio + foco | Mostra placeholder em `--text-muted` |
| Preenchido | Label flutua em cima, valor dentro |
| Erro | Borda vermelha + texto de erro (`Mensagem clara do que tá errado`) |

### Regra

> **Sempre** label visível (mesmo no estado filled). Nunca depender só do placeholder.

---

## 3. Card de post

O componente mais importante do app — onde o colaborador vê o conteúdo e decide engajar.

### Anatomia

```
┌──────────────────────────────────────┐
│ ┌──────────────────────────────────┐ │
│ │                                  │ │
│ │     [capa do post 16:9]          │ │  ← rounded-t-2xl
│ │                                  │ │
│ └──────────────────────────────────┘ │
│  [network-icon] Instagram · 2h      │  ← overline 11px + meta
│  Título do post                      │  ← H3 22px
│  Descrição opcional do post          │  ← body 15px (max 2 linhas)
│  que o admin cadastrou no app        │
│                                       │
│  ┌──────┐ ┌────────┐ ┌───────────┐  │
│  │Curtir│ │Comentar│ │Compartilhar│  │  ← 3 botões de check-in
│  └──────┘ └────────┘ └───────────┘  │
└──────────────────────────────────────┘
```

### Estados

| Estado | Como fica |
|---|---|
| Default | Sombra `--shadow-sm`, borda sutil |
| Hover | Sombra `--shadow-md`, leve elevação |
| Já tem check-in aprovado | Badge verde "✓ Engajado" no canto superior direito |
| Algum check-in pendente | Badge amarelo "⏳ Aguardando" no canto superior direito |
| Sem rede (post inativo) | Opacidade 60%, label "Post desativado" |

### Especificações

- **Padding interno:** 16px (`--space-4`)
- **Border radius:** `--radius-2xl` (32px) — combina com o cap. 3, p. 76 do brandbook (formas arredondadas)
- **Sombra:** `--shadow-sm` repouso, `--shadow-md` hover
- **Gap entre elementos:** 12px (`--space-3`)

---

## 4. Botão de check-in (Curtir / Comentar / Compartilhar)

São os 3 botões do post. Visual similar, comportamento individual.

### Aparência base (não clicado)

```
┌─────────────────────┐
│  [icon]  Curtir     │
│                     │
│      +1 ponto       │
└─────────────────────┘
   ↑ ThumbsUp    ↑ 1 ponto (caption)
```

- Fundo `--surface-elevated`
- Borda `--border-subtle`
- Ícone em `--text-secondary`
- Label em `--text-primary`
- Pontos em `--text-secondary` com tabular nums

### Estado confirmado (após clicar, status pendente)

```
┌─────────────────────┐
│  [✓]   Aguardando   │  ← muda label
│                     │
│      +1 ponto       │
└─────────────────────┘
```

- Fundo `--brand-azu-100` (azul clarinho)
- Borda `--brand-azul`
- Ícone `--brand-azul`
- Label "Aguardando"

### Estado aprovado (após admin aprovar)

```
┌─────────────────────┐
│  [✓]   Confirmado   │
│                     │
│      +1 ponto ✓    │  ← marca verde
└─────────────────────┘
```

- Fundo `--state-success`
- Borda `--state-success-strong`
- Texto branco

### Estado rejeitado

```
┌─────────────────────┐
│  [✗]   Não aprovado  │
└─────────────────────┘
```

- Fundo `--surface-sunken`
- Borda `--border-subtle`
- Texto `--text-secondary` (mais discreto)
- Sem ícone destacado

---

## 5. Badge de status

Pequenos marcadores circulares ou em pill. Combinam cor + ícone + texto (nunca só cor).

### Tipos

| Tipo | Aparência | Uso |
|---|---|---|
| **Status de check-in** | Pill arredondado, ícone + texto | "Aguardando", "Aprovado", "Rejeitado" |
| **Status de usuário** | Pill, texto apenas | "Admin", "Desativado" |
| **Tier** | Disco colorido, emblema central | Bronze/Prata/Ouro/Platina/Diamante |
| **Contador** | Número em destaque | "3 check-ins hoje", "+12 posições" |

### Anatomia (pill de status)

```
┌──────────────────┐
│ ● Aprovado       │   ← 24px altura
└──────────────────┘
   ↑ 6px dot        ↑ caption 12px / 600
```

### Cores por status

| Status | Fundo | Texto | Ícone |
|---|---|---|---|
| Pendente | `--gam-ipe` | `--text-primary` | `Clock` |
| Aprovado | `--state-success` | `--text-on-primary` | `CheckCircle2` |
| Rejeitado | `--state-error` | `--text-on-primary` | `XCircle` |
| Admin | `--gam-jacaranda` | `--text-on-primary` | `Shield` |

---

## 6. Pódio (top 3 do ranking)

Componente destaque da página de ranking. Mostra o top 3 em layout visualmente celebrativo.

### Layout

```
            ┌──────────┐
            │   🥈     │      ← 2º lugar (Tiê)
            │  Maria   │
            │ 1.180 pts│
            └──────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐
│   🥇     │ │   🥉     │ │   ?     │
│  João    │ │  Pedro   │ │  +47    │
│ 1.250 pts│ │ 1.045 pts│ │ Ver mais│
└──────────┘ └──────────┘ └──────────┘
```

- **1º lugar (🥇):** card maior, fundo `gradient-azul-taiti`, texto branco, sombra `--shadow-lg`
- **2º lugar (🥈):** card médio, fundo `--tier-prata`, texto branco
- **3º lugar (🥉):** card médio, fundo `--tier-bronze`, texto branco

### Hierarquia visual

- 1º lugar: 1.2× tamanho
- 2º e 3º: 0.95× tamanho
- Medalhas (🥇🥈🥉) em emoji Unicode, tamanho 48px

---

## 7. Tabela de ranking (4º ao 50º)

Lista compacta com posição, avatar, nome, pontos, tendência.

### Anatomia de cada linha

```
┌────┬──────┬──────────────────────────────┬──────────┬────────┐
│ #  │ [📷] │ Nome completo                │ 980 pts  │ ↑ +3   │
└────┴──────┴──────────────────────────────┴──────────┴────────┘
```

- **Posição:** tabular nums, `--font-bold`, 17px
- **Avatar:** 40×40px, rounded-full
- **Nome:** `--text-primary`, 15px
- **Pontos:** tabular nums, `--font-bold`, 15px, alinhado à direita
- **Tendência:** setinha (`↑` ou `↓` ou `—`) com cor semântica (verde / vermelho / cinza)

### Estados da linha

| Estado | Como fica |
|---|---|
| Default | Linha com fundo `--surface-elevated` |
| Você | Borda lateral esquerda `--brand-azul` 4px, fundo `--brand-azu-100` |
| Hover | Fundo `--brand-ceu-100` |

---

## 8. Barra de progresso (até o próximo tier)

Mostra quanto falta pro próximo nível.

### Anatomia

```
┌──────────────────────────────────────────────┐
│  Bronze → Prata                               │
│  ┌──────────────────────────────────────┐    │
│  │████████████░░░░░░░░░░░░░░░░░░░░░░░░│    │  ← 65 / 100 pts
│  └──────────────────────────────────────┘    │
│  Faltam 35 pontos pra Prata.                  │
└──────────────────────────────────────────────┘
```

- Trilho: `--surface-sunken`
- Preenchimento: cor do tier atual (gradiente suave pro próximo)
- Texto de status: acima da barra

### Animação

Quando o usuário atinge o tier e a barra preenche 100%:
1. Barra anima de 0% → 100% em 600ms
2. Toast "🎉 Você chegou no tier OURO!"
3. Modal de celebração (confete discreto)

---

## 9. Modal de celebração de tier

Tela cheia (mobile) ou centralizada (desktop) parabenizando o usuário.

### Layout mobile

```
┌──────────────────────────────────────┐
│                                      │
│         ✨                           │
│                                      │
│    Você chegou no OURO!              │
│                                      │
│    250 pontos. Daqui pra frente      │
│    cada ação vale ainda mais —      │
│    porque você já provou que tá      │
│    junto.                            │
│                                      │
│    [Ver meu perfil] [Voltar]         │
│                                      │
└──────────────────────────────────────┘
```

- Fundo: `gradient-azul-taiti`
- Texto branco
- Emblema do tier centralizado (120px)
- Tipografia display 48px para o nome do tier

---

## 10. Toast (notificações efêmeras)

Feedback rápido após ação.

### Tipos

| Tipo | Cor | Uso |
|---|---|---|
| Sucesso | `--state-success` | Check-in aprovado, tier subiu |
| Erro | `--state-error` | Falha de rede, validação |
| Info | `--state-info` | Mensagens neutras |
| Aviso | `--state-warning` | "Saiu do app, salva antes" |

### Anatomia

```
┌──────────────────────────────────┐
│ ✓  +1 ponto! Curtida aprovada.  │
└──────────────────────────────────┘
   ↑ 24px          ↑ body 15px branco
```

- Posição: topo (mobile) ou inferior direito (desktop)
- Duração: 4s padrão
- Dismiss: clique no X, swipe ou timeout

---

## 11. Empty state

Quando não tem conteúdo. **Sempre com ilustração leve + texto acolhedor + CTA**.

### Padrão

```
┌──────────────────────────────────────┐
│                                      │
│            📭 (32px ícone)           │
│                                      │
│      Nenhum post por aqui ainda.     │
│                                      │
│   A Comunicação costuma postar       │
│   de manhã — volta mais tarde!       │
│                                      │
└──────────────────────────────────────┘
```

- Fundo `--surface-elevated`
- Padding generoso (64px vertical)
- Ícone em `--text-muted`
- Título em `--text-primary`, H3
- Descrição em `--text-secondary`, body
- CTA opcional quando aplicável

---

## 12. Header (topbar)

Aparece em todas as telas logadas.

### Estrutura

```
┌──────────────────────────────────────────────────────────┐
│  [logo SEBRAEIERS]      Timeline  Ranking  Perfil  [Sair] │
└──────────────────────────────────────────────────────────┘
   ↑ 32px altura                ↑ nav        ↑ ações
```

- Fundo `--surface-elevated` com borda inferior `--border-subtle`
- Logo à esquerda (32px de altura)
- Nav centralizada em desktop, drawer em mobile
- Avatar + nome à direita em desktop, só avatar em mobile

### Versão admin

Quando o usuário é admin, badge "Admin" em `--gam-jacaranda` aparece ao lado do nome, e o menu inclui link "Painel admin".

---

## 13. Avatares

### Tamanhos

| Token | Tamanho | Onde |
|---|---|---|
| `--avatar-xs` | 24px | Ranking row, comentários |
| `--avatar-sm` | 32px | Header mobile |
| `--avatar-md` | 40px | Ranking row (padrão) |
| `--avatar-lg` | 56px | Header desktop, perfil |
| `--avatar-xl` | 96px | Página de perfil |
| `--avatar-2xl` | 144px | Hero de perfil |

### Fallback (sem foto)

Iniciais do nome em fundo `--brand-azu-100` e texto `--brand-azul`. **Sempre** com `aria-label` contendo o nome completo.

---

## 14. Skeleton (loading state)

Para carregamento de listas.

### Padrão

- Fundo `--surface-sunken` com shimmer sutil
- Mesma altura e largura do componente final
- `aria-busy="true"` + `aria-label="Carregando"`

---

## Onde implementar

Todos os componentes aqui viram código em `components/ui/` (shadcn + customizações).

**Prioridade de implementação:**

1. **MVP essencial:** Button, Input, Card de post, Botões de check-in, Toast, Empty state
2. **Logo no header:** Header + Logo + Avatar
3. **Ranking:** Pódio + Tabela + Barra de progresso
4. **Admin:** Tabela de check-ins pendentes, formulário de post
5. **Polish:** Modal de celebração, animações de tier, dark mode

---

**Próximo:** [07-spacing-grid.md](./07-spacing-grid.md) — espaçamentos, grid, sombras, raios.
