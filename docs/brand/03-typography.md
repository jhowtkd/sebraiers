# 03 — Tipografia

## Família principal

**Figtree** — sans-serif moderna, base caligráfica que dá ritmo dinâmico. Disponível gratuitamente no Google Fonts.

> **Por que Figtree?** É a **tipografia de apoio oficial do SEBRAE** (cap. 3, p. 83 do brandbook). Foi escolhida pelo escritório de design justamente por sua "base caligráfica que confere um ritmo dinâmico e variado, tornando a leitura confortável" — exatamente o que precisamos num app com feed, ranking e muita leitura em tela pequena.

### Pesos usados no app

| Peso | Token CSS | Uso típico |
|---|---|---|
| Regular (400) | `--font-regular` | Corpo de texto, descrições |
| Medium (500) | `--font-medium` | Labels, ênfase sutil |
| SemiBold (600) | `--font-semibold` | Subtítulos, botões |
| Bold (700) | `--font-bold` | Títulos de seção, números de pontuação |
| ExtraBold (800) | `--font-extrabold` | — (reservado pra destaques muito fortes) |

> **Família de títulos do brandbook (Campuni Bold)** é proprietária e usada **só na wordmark do SEBRAEIERS** (convertida em path no SVG). No app, usamos Figtree Bold como título — visualmente coerente, tecnicamente viável.

---

## Família de fallback

**Inter** — quando Figtree não carrega (CDN offline, e-mail marketing HTML, fallback de sistema).

```css
font-family:
  'Figtree',           /* principal — web, app */
  'Inter',             /* fallback */
  -apple-system,       /* SF Pro no iOS */
  BlinkMacSystemFont,
  'Segoe UI',          /* Windows */
  Roboto,              /* Android */
  'Helvetica Neue',
  Arial,
  sans-serif;
```

> **Por que Inter e não só system-ui?** Inter tem **tabular nums** nativamente (`font-variant-numeric: tabular-nums`), que é crítico pro nosso app — pontuações, ranking e contadores de check-in precisam alinhar visualmente.

---

## Escala tipográfica (1.250 — major third)

| Token | Tamanho | Line-height | Uso |
|---|---|---|---|
| `--text-display` | 48px | 56px (1.17) | Só landing / onboarding — "Bem-vindo ao SEBRAEIERS" |
| `--text-h1` | 36px | 44px (1.22) | Título da página |
| `--text-h2` | 28px | 36px (1.29) | Título de seção |
| `--text-h3` | 22px | 30px (1.36) | Título de card |
| `--text-h4` | 18px | 26px (1.44) | Subtítulo forte |
| `--text-body-lg` | 17px | 26px (1.53) | Texto de destaque, intro de página |
| `--text-body` | 15px | 24px (1.60) | Corpo padrão — base do app |
| `--text-body-sm` | 14px | 22px (1.57) | Texto secundário, legendas |
| `--text-caption` | 12px | 18px (1.50) | Metadados, timestamp |
| `--text-overline` | 11px / 700 / 0.08em letter-spacing | 16px | Categorias, badges |

### Pontuação — escala especial

| Token | Tamanho | Peso | Uso |
|---|---|---|---|
| `--text-points` | 40px | 800 (ExtraBold) | Número de pontos no card "Meu desempenho" |
| `--text-points-hero` | 72px | 800 (ExtraBold) | Splash de celebração ao subir de tier |
| `--text-rank` | 32px | 700 (Bold) | Posição no ranking (#1, #2, #3) |

**Sempre com `font-variant-numeric: tabular-nums`** — os números ficam todos do mesmo tamanho, alinhados em coluna.

---

## Hierarquia na prática

### Tela de Timeline (exemplo)

```
┌────────────────────────────────────────┐
│ 28px H2  Posts do SEBRAE              │  ← h2 seção
│ 15px body  Veja o que tá saindo...     │  ← descrição da seção
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ 22px H3   Título do post           │ │  ← card título
│ │ 14px body Rede social · 2h atrás   │ │  ← meta
│ │ 15px body Descrição opcional...    │ │  ← corpo do card
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

### Tela de Ranking (exemplo)

```
┌────────────────────────────────────────┐
│ 36px H1   Ranking                     │
│ 17px body Top 50 colaboradores...      │
│                                        │
│ #1  João Silva        🥇  1.250 pts   │  ← rank + pontos com tabular nums
│ #2  Maria Souza       🥈  1.180 pts   │
│ #3  Pedro Lima        🥉  1.045 pts   │
│ #4  Ana Beatriz       ─   980 pts     │
└────────────────────────────────────────┘
```

### Tela de detalhe do post

```
┌────────────────────────────────────────┐
│ [Capa do post — full width]            │
│                                        │
│ 22px H3   Título do post               │
│ 14px body Instagram · 21/06/2026      │
│                                        │
│ 15px body Descrição completa          │
│ do post que o admin                    │
│ cadastrou no painel.                   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ [Curti]  [Comentei]  [Comparti] │   │  ← botões de check-in
│ └──────────────────────────────────┘   │
└────────────────────────────────────────┘
```

---

## Regras do brandbook que aplicamos

Do cap. 3 (p. 85-86), pegamos a **régua de flexibilização** e fixamos:

| Corpo | Entrelinha | Entreletra |
|---|---|---|
| **Padrão do app** | **1.5×** (Line-height / font-size) | `0` |
| **Aceitável** | 1.4× a 1.6× | -0.01 a +0.01em |
| **Evitar** | < 1.4× ou > 1.7× | > 0.02em ou < -0.02em |

> No app, **nunca** entrelinha abaixo de 1.4× em corpo de texto. Tela pequena + polegar cansado = leitura ruim.

---

## Uso em casos especiais

### Números grandes (pontuação, ranking)

```css
.points-hero {
  font-family: var(--font-family);
  font-weight: 800;
  font-size: 72px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;        /* apertado pra dar peso */
  color: var(--brand-atlantico);
}
```

### Números em tabela (ranking)

```css
.rank-number {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";   /* fallback pra browsers antigos */
}
```

### Texto em uppercase (categorias, badges)

```css
.overline {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
```

### Truncamento (títulos longos no card)

```css
.post-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

> Máximo **2 linhas** no card, **4 linhas** na página de detalhe. Acima disso, recorta com ellipsis.

---

## Tamanhos mínimos

| Contexto | Mínimo absoluto |
|---|---|
| Corpo de texto | **14px** (mobile) — WCAG recomenda 16px, aceitamos 14 só em texto secundário |
| Botões | **15px** com `font-weight: 600` |
| Legendas / timestamps | **12px** (nunca menos) |
| Emojis soltos | tamanho do texto adjacente + 4px |

---

## Acessibilidade

- **Contraste mínimo** texto/fundo: 4.5:1 (AA) — verificado, ver [02-colors.md](./02-colors.md) e [09-accessibility.md](./09-accessibility.md).
- **Espaçamento entre linhas:** nunca abaixo de 1.4× (já configurado).
- **Espaçamento entre parágrafos:** mínimo 0.5× do tamanho do texto (`margin-bottom: 0.5em`).
- **Largura máxima de linha:** **65 caracteres** (medida em "0" no chrome devtools) — pra corpo de texto em telas grandes. Em mobile cai naturalmente pra ~40.
- **Não substitui:** Figtree é uma fonte com boa altura-x. Mesmo assim, evita texto cinza-claro — vai de `#475569` pra cima.

---

## Onde tá implementado

- **CSS custom properties** em `assets/tokens.css` (variáveis `--font-*`)
- **Tailwind config** sugerido no fim dos tokens
- **Google Fonts:** [Figtree](https://fonts.google.com/specimen/Figtree) + [Inter](https://fonts.google.com/specimen/Inter) (já no link)

---

**Próximo:** [04-iconography.md](./04-iconography.md) — ícones, badges, emblemas.
