# 07 — Espaçamento, Grid, Sombras e Raios

## Escala de espaçamento (base 4)

Escala em **múltiplos de 4px**, pra alinhar com pixels de tela e dar ritmo consistente.

| Token | Valor | Uso típico |
|---|---|---|
| `--space-0` | 0px | Reset |
| `--space-1` | 4px | Entre ícone e label no mesmo botão, gaps em overline |
| `--space-2` | 8px | Gaps verticais entre texto pequeno |
| `--space-3` | 12px | Padding interno de badge, gap entre meta e título |
| `--space-4` | 16px | **Padding padrão de cards e inputs** |
| `--space-5` | 20px | Padding generoso de modal |
| `--space-6` | 24px | Gap entre seções de uma página |
| `--space-8` | 32px | Padding de seção, gap entre cards |
| `--space-10` | 40px | Margin entre blocos maiores |
| `--space-12` | 48px | Padding de tela cheia em mobile |
| `--space-16` | 64px | Hero / seção de destaque |
| `--space-20` | 80px | Espaçamento de página em desktop |
| `--space-24` | 96px | Apenas em hero / landing |

> **Regra:** em mobile, prefira valores menores (8, 12, 16). Em desktop, mais generoso (16, 24, 32). Nunca `< 4px` ou `> 96px` no app.

---

## Grid e containers

### Breakpoints

| Token | Largura | Contexto |
|---|---|---|
| `--bp-sm` | 640px | Smartphone landscape |
| `--bp-md` | 768px | Tablet portrait |
| `--bp-lg` | 1024px | Tablet landscape, notebook pequeno |
| `--bp-xl` | 1280px | Desktop |
| `--bp-2xl` | 1536px | Telas grandes |

### Containers

| Token | Largura máxima | Onde |
|---|---|---|
| `--container-max` | 1200px | Container geral do app |
| `--container-narrow` | 720px | Texto longo, formulários, detalhe de post |
| `--container-full` | 100% | Header, hero |

### Padding lateral responsivo

| Breakpoint | Padding |
|---|---|
| `< 640px` (mobile) | 16px |
| `640-1024px` | 24px |
| `≥ 1024px` | 32px |

> Mobile-first: o padding base é 16px e cresce com a tela.

---

## Layout da timeline (grid de cards)

### Mobile (`< 768px`)

```
┌──────────────────┐
│                  │
│   Card 1         │  ← largura cheia - 32px
│                  │
├──────────────────┤
│                  │
│   Card 2         │
│                  │
└──────────────────┘
```

1 coluna, espaçamento vertical de `--space-6` (24px).

### Tablet (`768-1024px`)

```
┌──────────────────┬──────────────────┐
│   Card 1         │   Card 2         │
├──────────────────┴──────────────────┤
│   Card 3 (full width)                │
└──────────────────────────────────────┘
```

2 colunas, com possibilidade de card destaque em largura cheia.

### Desktop (`≥ 1024px`)

```
┌──────────────┬──────────────┬──────────────┐
│   Card 1     │   Card 2     │   Card 3     │
└──────────────┴──────────────┴──────────────┘
```

3 colunas. Cada card: ~360px de largura.

> **Gap entre cards:** sempre `--space-6` (24px), nunca menos em desktop, nunca mais em mobile.

---

## Border radius

Cantos arredondados são parte da identidade visual do SEBRAE (cap. 3 do brandbook usa formas suaves).

| Token | Valor | Onde |
|---|---|---|
| `--radius-sm` | 6px | Badge, pill pequena |
| `--radius-md` | 10px | Botão, input, tag |
| `--radius-lg` | 16px | Card pequeno, modal em desktop |
| `--radius-xl` | 24px | Card padrão (post, ranking) |
| `--radius-2xl` | 32px | Card grande, hero, capa de modal |
| `--radius-full` | 9999px | Avatar, badge circular, pill |

### Por elemento

```
Avatar              → radius-full
Botão (44px altura) → radius-md (10px)
Input               → radius-md (10px)
Card de post        → radius-xl (24px)
Card de ranking     → radius-lg (16px)
Modal (mobile)      → radius-2xl no topo (32px)
Modal (desktop)     → radius-xl (24px)
Badge               → radius-full
Toast               → radius-lg (16px)
```

> **Regra:** cantos arredondados crescem com o tamanho do elemento. Botão pequeno = raio pequeno. Card grande = raio grande. Manter essa proporção dá sensação de maciez sem infantilizar.

---

## Sombras

Diretrizes do brandbook (cap. 3, p. 76): "Partindo sempre do nosso grid, temos a liberdade de criar composições dinâmicas." Sombras seguem o Atlântico com opacidade baixa pra dar profundidade sem pesar.

### Tokens

| Token | Definição | Uso |
|---|---|---|
| `--shadow-xs` | `0 1px 2px 0 rgba(11,37,116,0.06)` | Sutil, divisor, separador |
| `--shadow-sm` | `0 1px 3px 0 rgba(11,37,116,0.08), 0 1px 2px 0 rgba(11,37,116,0.04)` | **Card padrão em repouso** |
| `--shadow-md` | `0 4px 12px -2px rgba(11,37,116,0.10), 0 2px 4px -2px rgba(11,37,116,0.06)` | **Card em hover** |
| `--shadow-lg` | `0 12px 24px -4px rgba(11,37,116,0.12), 0 4px 8px -2px rgba(11,37,116,0.08)` | Modal, dropdown, popover |
| `--shadow-xl` | `0 24px 48px -8px rgba(11,37,116,0.16)` | Toast de celebração, modal full |
| `--shadow-focus` | `0 0 0 3px rgba(42,79,218,0.32)` | **Estado de foco em todo input/botão** |
| `--shadow-focus-error` | `0 0 0 3px rgba(224,86,93,0.32)` | Estado de foco em erro |

> **Por que Atlântico e não preto puro?** O Atlântico (`#0B2574`) tem um leve tom azulado. Sombra preta pura ficaria cinza morta — sombra azulada mantém a personalidade cromática da marca.

### Hierarquia

```
sem sombra  →  xs  →  sm  →  md  →  lg  →  xl
  ↑           ↑      ↑      ↑      ↑      ↑
divisor    hr    card    hover   modal  hero
```

**Regra:** só 1 nível de sombra por elemento. Não combine `--shadow-sm` + `--shadow-md`.

---

## Animações e transições

### Tokens

| Token | Definição | Uso |
|---|---|---|
| `--transition-fast` | `120ms cubic-bezier(0.4, 0, 0.2, 1)` | Mudança de estado de botão, toggle |
| `--transition-base` | `200ms cubic-bezier(0.4, 0, 0.2, 1)` | Hover de card, mudança de página |
| `--transition-slow` | `320ms cubic-bezier(0.4, 0, 0.2, 1)` | Modal, drawer, toast |

### Curva preferida

```css
cubic-bezier(0.4, 0, 0.2, 1)  /* Material "standard" */
```

> Suave no início e fim, sem quicar. A marca é séria sem ser engessada.

### Animações que valem a pena

| Onde | Animação |
|---|---|
| Check-in aprovado | Toast desliza de cima + confete discreto (CSS) |
| Tier subido | Modal de celebração com emblema crescendo + brilho |
| Hover de card | Sombra cresce + 1px de elevação |
| Botão primário | Escurece 8% em 120ms |
| Troca de filtro (timeline) | Fade de 200ms |
| Skeleton loading | Shimmer da esquerda pra direita, loop infinito |

### Animações que **não** valem a pena

- ❌ Parallax
- ❌ Texto aparecendo letra por letra
- ❌ Bounce exagerado
- ❌ Auto-play de vídeos sem som
- ❌ Cursor customizado
- ❌ Mais de 1 animação concorrente na mesma tela

> **Regra do brandbook (cap. 3, p. 76):** *"Dinamismo e movimento"* são parte da identidade, mas o app é **ferramenta de trabalho**. Animação que distrai = animação que prejudica.

---

## Z-index

Hierarquia clara pra evitar sobreposição inesperada:

| Token | Valor | Quem usa |
|---|---|---|
| `--z-base` | 0 | Tudo no fluxo normal |
| `--z-dropdown` | 10 | Dropdown de filtro, select |
| `--z-sticky` | 20 | Header fixo, tab bar |
| `--z-overlay` | 30 | Overlay de modal (fundo escuro) |
| `--z-modal` | 40 | Conteúdo do modal |
| `--z-toast` | 50 | Toast/notificação |
| `--z-tooltip` | 60 | Tooltip sobre tudo |

> Toast sobre modal sobre header sobre conteúdo. Sempre.

---

## Densidade de informação

### Mobile (polegar cansado, leitura rápida)

- Padding generoso (`--space-4` ou maior)
- Linhas mais altas (1.6× line-height)
- Elementos tocáveis com no mínimo 44×44px

### Desktop (mouse preciso, mais espaço)

- Padding pode ser menor (`--space-3`)
- Mais informação por tela (3 colunas no grid)
- Hover rico como feedback

---

## Alinhamento vertical

| Contexto | Alinhamento |
|---|---|
| Texto em botão | `align-items: center` |
| Texto em card | `align-items: flex-start` (top) |
| Lista de ranking | baseline alinhado entre nome e pontos |
| Avatar + texto | `align-items: center` |
| Ícone + label | `align-items: center`, gap `--space-2` |

---

## Regras de composição

### Card de post (resumo de proporções)

```
┌──────────────────────────────────────────┐
│ padding 16px                             │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │                                  │   │
│   │      capa 16:9 (cheia)          │   │
│   │                                  │   │
│   └──────────────────────────────────┘   │
│   ↑ radius-t-2xl                         │
│                                          │
│   gap 12px ──── [icon] Instagram · 2h    │
│                                          │
│   gap 8px ──── Título do post (22px)     │
│                                          │
│   gap 8px ──── Descrição (15px, 2 lin)  │
│                                          │
│   gap 16px ──── ┌──┐ ┌──┐ ┌──┐          │
│                  │  │ │  │ │  │          │
│                  └──┘ └──┘ └──┘          │
│                                          │
└──────────────────────────────────────────┘
   ↑ radius-2xl
```

---

**Próximo:** [08-imagery.md](./08-imagery.md) — avatares, capas de post, uso de imagem.
