# SEBRAEIERS — Brand Book

Guia de marca e design system do **SEBRAEIERS**, plataforma interna de engajamento em redes sociais do **SEBRAE Goiás**.

> Submarca endossada do SEBRAE. Todo material respeita o [Brandbook oficial do SEBRAE 2026](../superpowers/specs/2026-06-21-sebraeiers-design.md) e convive com a marca-mãe.

---

## Sumário

| # | Documento | O que tem dentro |
|---|---|---|
| 00 | [Visão geral](./00-overview.md) | Propósito do branding, personalidade, princípios, papel na arquitetura de marcas |
| 01 | [Logotipo](./01-logo.md) | Wordmark "SEBRAEIERS", variações (mono, ícone, fundo claro/escuro), área de proteção, redução |
| 02 | [Cores](./02-colors.md) | Paleta oficial SEBRAE, tons funcionais do app (semânticos, tiers, gamificação) |
| 03 | [Tipografia](./03-typography.md) | Famílias, hierarquia, regras de uso, fallbacks para web |
| 04 | [Iconografia](./04-iconography.md) | Ícones de redes sociais, badges de status, emblemas de tier |
| 05 | [Voz e tom](./05-voice-tone.md) | Tom de voz no app, microcopy de UX, exemplos bons/ruins |
| 06 | [Componentes](./06-components.md) | Cards, botões, badges, pódio, barras de progresso, ranking |
| 07 | [Espaçamento e grid](./07-spacing-grid.md) | Grid, espaçamentos, sombras, raios, escala |
| 08 | [Imagem](./08-imagery.md) | Avatares, capas de posts, placeholder, uso de IA |
| 09 | [Acessibilidade](./09-accessibility.md) | WCAG 2.1, contraste, navegação por teclado, foco |

### Assets e tokens

- **`assets/logo-sebraiers.svg`** — wordmark principal (azul + ".iers" verde Taiti)
- **`assets/logo-sebraiers-mono.svg`** — versão monocromática (preto/branco)
- **`assets/logo-icon.svg`** — ícone do app (favicon, PWA, app icon)
- **`assets/og.png`** — Open Graph para redes e links compartilhados (1080×630)
- **`assets/tokens.css`** — design tokens em CSS custom properties
- **`assets/tokens.json`** — design tokens em JSON (compatível com Style Dictionary / Tailwind)

---

## Como usar este guia

1. **Você é dev?** Pega os **tokens** (`tokens.css` ou `tokens.json`) e usa direto. Tudo que tá no `.md` virou variável.
2. **Você é designer?** Os `.md` mostram as regras, exemplos bons/ruins e referências do brandbook oficial. Os SVGs são a base pra derivar mais materiais.
3. **Você é PM/copy?** Foca no [05-voice-tone.md](./05-voice-tone.md) e nos exemplos do [06-components.md](./06-components.md).
4. **Você tá revisando algo?** Começa pelo [00-overview.md](./00-overview.md) e segue linear.

---

## Princípios inegociáveis

Estes 5 pontos vêm direto do brandbook oficial do SEBRAE e **não podem ser quebrados**:

1. **A marca-mãe sempre que possível deve estar presente.** Por isso o "SEBRAE" aparece integral no wordmark, e o azul institucional é a cor primária.
2. **Cores só da paleta.** Nada de cor inventada. Cores da gamificação são todas da paleta diversa do brandbook.
3. **Tipografia proprietária quando der.** `Figtree` no web (gratuita, alinhada com a `Campuni` do brandbook). `Inter` como fallback.
4. **Acessibilidade não é decoração.** WCAG 2.1 AA mínimo em todos os textos, foco visível em todo elemento interativo.
5. **Tom próximo, facilitador, real.** Nunca protagonista — o colaborador é quem engaja, a gente só celebra.

---

## Referências

- **Brandbook oficial SEBRAE 2026** — fonte de verdade pra cor, tipografia, tom e arquitetura.
- **Spec do projeto SEBRAEIERS** (`../superpowers/specs/2026-06-21-sebraeiers-design.md`) — contexto funcional, stack, fluxos.

---

**Mantenedor:** Equipe de Comunicação do SEBRAE Goiás + time de produto SEBRAEIERS.
**Versão:** 1.0 — Junho de 2026.
