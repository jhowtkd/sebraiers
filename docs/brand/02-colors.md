# 02 — Cores

## Filosofia

A paleta é **100% derivada do Brandbook oficial SEBRAE 2026** (cap. 3, p. 67-80). Não inventamos nenhuma cor. O que fizemos foi **organizar as cores em camadas funcionais** pro app:

1. **Identidade** — o azul e seus derivados (marca-mãe sempre presente).
2. **Apoio /Gamificação** — a paleta diversa (Begônia, Manacá, Taiti, Guaco, etc.) pra dar vida sem inventar.
3. **Semântica** — feedback de estado (sucesso, erro, alerta, info), usando tons da paleta diversa.
4. **Superfícies e textos** — neutros (offwhite, branco, preto) e cinzas pra construir a interface.

> **Regra de ouro (cap. 3, p. 87):** *"Priorize o uso de textos em preto, branco, azul e atlântico, pois essas são as cores que oferecem melhor contraste sobre a maioria dos fundos."*

---

## Camada 1 — Identidade (marca-mãe sempre presente)

| Token | Nome | Hex | RGB | CMYK | Pantone | Onde usar |
|---|---|---|---|---|---|---|
| `--brand-azul` | **Azul SEBRAE** | `#2A4FDA` | 42, 79, 218 | 100, 63, 0, 2 | 2935 C | Botões primários, links, header, foco |
| `--brand-atlantico` | **Atlântico** | `#0B2574` | 11, 37, 116 | 100, 92, 0, 26 | 2756 C | Logo da wordmark, texto sobre fundos claros, headers |
| `--brand-ceu` | **Céu** | `#65B7FB` | 101, 183, 251 | 43, 3, 0, 0 | 2905 C | Hover, fundo de destaque secundário, ilustrações |
| `--brand-offwhite` | **Offwhite** | `#EFF3EE` | 239, 243, 238 | 10, 7, 5, 0 | Cool Gray 1 C | Fundo geral do app (light mode) |
| `--brand-preto` | **Preto** | `#000000` | 0, 0, 0 | 0, 0, 0, 100 | Process Black C | Texto principal sobre fundos claros |

### Uso de Azul x Atlântico no app

- **Azul (`#2A4FDA`)** = ação. Botão primário, link, item ativo, foco. **Sempre sobre fundo claro.**
- **Atlântico (`#0B2574`)** = peso. Cabeçalho de página, título de seção, texto de marca, logo. **Funciona sobre claro e escuro.**

### Gradientes oficiais (cap. 3, p. 76-80)

Gradientes são sempre **50% cada cor** e a **45°**. A lista abaixo é a aprovada pelo brandbook pro ambiente digital — pode ser usada à vontade no SEBRAEIERS.

| Nome | De | Para | Uso |
|---|---|---|---|
| `gradient-azul-taiti` | Azul `#2A4FDA` | Taiti `#90D275` | Splash, fundo da home logada |
| `gradient-ceu-begonia` | Céu `#65B7FB` | Begônia `#FF80C8` | Empty states, ilustrações de celebração |
| `gradient-canario-umbu` | Canário `#FBEC76` | Umbu `#E7F79E` | Banner de destaque, "novidade" |
| `gradient-atlantico-ceu` | Atlântico `#0B2574` | Céu `#65B7FB` | Onboarding, telas de boas-vindas |
| `gradient-acelola-tie` | Acerola `#F39D72` | Tiê `#E0565D` | Notificação de urgência (com moderação) |

> Mais combinações estão no brandbook (p. 77-80). Use como inspiração, mas sempre **respeitando contraste** — testa o texto por cima antes de aprovar.

---

## Camada 2 — Gamificação (paleta diversa)

Cada tier do ranking tem uma cor **oficial da paleta diversa**. Quando o colaborador sobe de nível, a cor é uma celebração visual da conquista — não precisa inventar gradiente nem emoji.

| Tier | Cor oficial | Hex | Onde aparece |
|---|---|---|---|
| **Bronze** | Acerola | `#F39D72` | Emblema + barra de progresso (50 pts) |
| **Prata** | Tiê | `#E0565D` | Emblema + barra de progresso (100 pts) |
| **Ouro** | Canário | `#FBEC76` | Emblema + barra de progresso (250 pts) |
| **Platina** | Begônia | `#FF80C8` | Emblema + barra de progresso (500 pts) |
| **Diamante** | Manacá | `#BE64E3` | Emblema + barra de progresso (1000 pts) |

### Cores auxiliares da paleta diversa (pra cards, badges, ilustrações)

| Cor | Hex | Uso típico |
|---|---|---|
| Menta | `#9FF0BD` | "Aprovado" — sutil |
| Taiti | `#90D275` | "Compartilhei" (ação +3 pontos), destaque ".iers" do logo |
| Guaco | `#61B466` | "Aprovado" — versão mais saturada |
| Jacarandá | `#8F85F4` | Badge de admin |
| Ipê | `#F2AFAB` | "Pendente" — calmo |
| Pera | `#CADF61` | "Em análise" |

---

## Camada 3 — Semântica (feedback de estado)

Estados visuais do app. Sempre em **conjunto** com ícone + texto (nunca só cor — WCAG 1.4.1).

| Estado | Token | Hex | Cor da paleta diversa original |
|---|---|---|---|
| **Sucesso / aprovado** | `--state-success` | `#61B466` | Guaco |
| **Sucesso forte** | `--state-success-strong` | `#0F8A3F` | derivação mais escura do Guaco (contraste AA em branco) |
| **Erro / rejeitado** | `--state-error` | `#E0565D` | Tiê |
| **Erro forte** | `--state-error-strong` | `#A6202C` | derivação escura do Tiê |
| **Alerta / atenção** | `--state-warning` | `#FBEC76` | Canário (precisa de texto escuro — ver nota abaixo) |
| **Info** | `--state-info` | `#65B7FB` | Céu |
| **Neutro / pendente** | `--state-neutral` | `#7A8499` | cinza institucional (derivado do Atlântico com luminosidade ajustada) |

> **⚠️ Atenção com Canário (#FBEC76):** ele falha WCAG AA pra texto branco em cima. Use **só como fundo**, sempre com texto **preto ou atlântico**.

---

## Camada 4 — Superfícies e textos (light mode default)

| Token | Hex | Uso |
|---|---|---|
| `--surface-canvas` | `#EFF3EE` | Fundo geral do app (Offwhite oficial) |
| `--surface-elevated` | `#FFFFFF` | Cards, modais, popovers |
| `--surface-sunken` | `#E0E5DD` | Header sticky, áreas "abaixo" do conteúdo |
| `--text-primary` | `#0B2574` | Atlântico — títulos, texto principal |
| `--text-secondary` | `#475569` | cinza escuro — texto de apoio, legendas |
| `--text-muted` | `#7A8499` | placeholder, disabled |
| `--text-on-primary` | `#FFFFFF` | texto sobre fundo azul |
| `--text-on-accent` | `#0B2574` | texto sobre Taiti/Canário (são claros) |
| `--border-subtle` | `#D8DDD6` | borda de inputs, divisores |
| `--border-strong` | `#0B2574` | borda com peso (foco, ativo) |

---

## Camada 5 — Dark mode (v2)

> O MVP é light mode. A estrutura abaixo já tá prevista nos tokens pra quando entrar.

| Token | Light | Dark |
|---|---|---|
| `--surface-canvas` | `#EFF3EE` | `#0E1320` |
| `--surface-elevated` | `#FFFFFF` | `#1A1F2E` |
| `--text-primary` | `#0B2574` | `#EFF3EE` |
| `--text-secondary` | `#475569` | `#A3A9B8` |
| `--border-subtle` | `#D8DDD6` | `#2A3142` |

> **Por que `#0E1320` e não Atlântico puro?** Pra não competir com o logo e os botões primários. O dark mode usa um **quase-preto azulado** que mantém o caráter da marca mas não cansa.

---

## Combinações aprovadas (cap. 3, p. 87-89 do brandbook)

Texto sobre fundo — ordem de preferência:

| Fundo | Texto aceito |
|---|---|
| Branco, Offwhite, tons de azul claro | **todas** as cores da paleta |
| Cor sólida da paleta diversa (Begônia, Manacá, Taiti, etc.) | **só** preto, branco, Azul ou Atlântico |

> Lê de novo: em cima de fundo colorido, **nunca** usa outra cor colorida por cima. É preto, branco ou azul. Sempre.

---

## Acessibilidade (resumo — ver 09-accessibility.md)

| Combinação | Ratio | Status WCAG |
|---|---|---|
| Atlântico sobre Offwhite | 11.4 : 1 | AAA |
| Azul sobre Offwhite | 5.1 : 1 | AA |
| Branco sobre Azul | 5.4 : 1 | AA |
| Branco sobre Atlântico | 12.8 : 1 | AAA |
| Preto sobre Offwhite | 16.1 : 1 | AAA |
| Cinza secundário sobre Offwhite | 7.6 : 1 | AAA |
| Branco sobre Taiti | 1.7 : 1 | ❌ nunca pra texto |
| Atlântico sobre Taiti | 7.8 : 1 | AAA |
| Preto sobre Canário | 14.9 : 1 | AAA |
| Branco sobre Begônia | 2.1 : 1 | ❌ nunca pra texto |

> Toda cor do app foi checada. Se algum dia precisar adicionar uma nova, **roda o teste WCAG antes** ([WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)).

---

## Onde tá implementado

- `assets/tokens.css` — CSS custom properties prontas pra Tailwind/CSS-in-JS
- `assets/tokens.json` — JSON pra Style Dictionary / Figma Tokens / Tailwind config

---

**Próximo:** [03-typography.md](./03-typography.md) — Figtree, Inter, hierarquia e regras.
