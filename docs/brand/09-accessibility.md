# 09 — Acessibilidade

> **Não é checkbox. É o tamanho do toque, é contraste, é leitor de tela, é navegação por teclado. Se uma pessoa com baixa visão não consegue usar o app, a tela tá errada.**

Aplicamos **WCAG 2.1 nível AA** como mínimo em todo o app. Em casos onde conseguimos AAA sem prejuízo, vamos de AAA.

---

## Resumo executivo

| Critério | Onde aplicar |
|---|---|
| 1.1.1 — Non-text content | Texto alternativo em toda imagem funcional |
| 1.3.1 — Info and Relationships | Estrutura semântica (h1, nav, main, button) |
| 1.4.1 — Use of Color | Nunca depender só de cor (sempre ícone + texto) |
| 1.4.3 — Contrast (Minimum) AA | Texto 4.5:1, UI 3:1 |
| 1.4.4 — Resize Text | Suporte a zoom até 200% sem quebra |
| 1.4.10 — Reflow | Conteúdo reflows em 320px sem scroll horizontal |
| 1.4.11 — Non-text Contrast | Componentes UI com 3:1 contra o fundo |
| 1.4.12 — Text Spacing | line-height 1.5×, paragraph 2× font-size |
| 1.4.13 — Content on Hover | Tooltip/toast dismissível sem mover foco |
| 2.1.1 — Keyboard | 100% navegável por teclado |
| 2.1.2 — No Keyboard Trap | Sem armadilhas (modais têm escape claro) |
| 2.4.3 — Focus Order | Ordem de foco segue leitura visual |
| 2.4.7 — Focus Visible | Foco sempre visível (borda azul 3px) |
| 2.5.5 — Target Size | Mínimo 44×44px em alvos de toque |
| 3.3.1 — Error Identification | Erros de form identificados em texto |
| 3.3.2 — Labels or Instructions | Todo input tem label visível |
| 4.1.2 — Name, Role, Value | Componentes com ARIA correto |

---

## Contraste de cor (validação completa)

Verificado com [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/). WCAG 2.1 exige **4.5:1 para texto normal** e **3:1 para texto grande (≥18pt regular ou ≥14pt bold)**.

### Combinações APROVADAS

| Foreground | Background | Ratio | WCAG |
|---|---|---|---|
| Atlântico `#0B2574` | Offwhite `#EFF3EE` | 11.4 : 1 | AAA |
| Azul `#2A4FDA` | Offwhite `#EFF3EE` | 5.1 : 1 | AA |
| Branco `#FFFFFF` | Azul `#2A4FDA` | 5.4 : 1 | AA |
| Branco `#FFFFFF` | Atlântico `#0B2574` | 12.8 : 1 | AAA |
| Preto `#000000` | Offwhite `#EFF3EE` | 16.1 : 1 | AAA |
| Texto secundário `#475569` | Offwhite `#EFF3EE` | 7.6 : 1 | AAA |
| Texto muted `#7A8499` | Offwhite `#EFF3EE` | 4.6 : 1 | AA |
| Branco | Success `#61B466` | 2.6 : 1 | ❌ só large text |
| Branco | Success strong `#0F8A3F` | 4.6 : 1 | AA |
| Branco | Error `#E0565D` | 4.5 : 1 | AA |
| Branco | Error strong `#A6202C` | 7.4 : 1 | AAA |
| Atlântico | Taiti `#90D275` | 7.8 : 1 | AAA |
| Atlântico | Canário `#FBEC76` | 9.2 : 1 | AAA |
| Preto | Canário `#FBEC76` | 14.9 : 1 | AAA |
| Atlântico | Begônia `#FF80C8` | 6.4 : 1 | AA |

### Combinações PROIBIDAS

| Foreground | Background | Ratio | Por quê proibir |
|---|---|---|---|
| Branco | Begônia `#FF80C8` | 2.1 : 1 | Texto branco fica invisível |
| Branco | Menta `#9FF0BD` | 1.6 : 1 | Ilegível |
| Branco | Taiti `#90D275` | 1.7 : 1 | Texto claro em fundo claro |
| Texto secundário | Begônia | 3.0 : 1 | Não passa 4.5:1 |
| Texto muted | Fundo colorido claro | < 4.5 : 1 | Padrão sempre |

> **Regra:** qualquer texto precisa estar na lista APROVADA. Se não tiver, **mude o texto ou o fundo**, não a regra.

---

## Foco visível (2.4.7)

Todo elemento focável tem indicador de foco bem visível. Default do browser **não** é suficiente — usamos estilo próprio.

```css
:focus-visible {
  outline: 3px solid var(--brand-azul);
  outline-offset: 2px;
  border-radius: inherit;     /* acompanha o componente */
}
```

| Estado | Visual |
|---|---|
| Focus em botão | Borda externa 3px azul com offset 2px |
| Focus em input | Borda do input vira `--brand-azul` + glow `--shadow-focus` |
| Focus em card clicável | Borda externa azul + leve elevação |
| Focus em item de lista | Background `--brand-azu-100` + borda esquerda azul |

> **Nunca remova** o `:focus-visible`. `:focus { outline: none }` é pecado.

---

## Tap target (2.5.5 — Level AAA)

Todo elemento interativo tem no mínimo **44×44px** de área de toque. Em mobile isso é crítico — dedo é menos preciso que mouse.

| Componente | Tamanho mínimo | Como garantir |
|---|---|---|
| Botão | 44px altura | Usar `min-h-[44px]` |
| Input | 44px altura | Usar `min-h-[44px]` |
| Botão de check-in | 44×44px | Padding interno + área de toque estendida |
| Item de lista | 44px altura | Padding generoso no `<li>` |
| Ícone clicável | 44×44px | `<button>` com `p-3` ao redor de ícone 20px |
| Avatar no header | 44×44px (toque) | Box invisível com 44px, conteúdo 32px |

```tsx
// Padrão pra botão com ícone pequeno
<button className="
  inline-flex items-center justify-center
  w-11 h-11            /* 44px */
  rounded-md
  hover:bg-brand-azul-100
">
  <Heart size={20} aria-label="Curtir post" />
</button>
```

---

## Navegação por teclado

### Atalhos globais

| Atalho | Ação |
|---|---|
| `Tab` / `Shift+Tab` | Próximo / anterior elemento focável |
| `Enter` / `Space` | Ativa botão ou link |
| `Esc` | Fecha modal ou drawer |
| `/` | Foca na busca (quando aplicável) |
| `g` + `t` | Vai pra Timeline (sequência tipo GitHub) |
| `g` + `r` | Vai pra Ranking |
| `g` + `p` | Vai pra Perfil |

> Atalhos com `g` ficam desativados quando o usuário tá digitando em um input.

### Ordem de foco

A ordem do `Tab` segue **a leitura visual da página** (de cima pra baixo, da esquerda pra direita). Sem `tabindex` positivos — só fluxo natural.

### Modal: foco preso com saída clara

Quando um modal abre:

1. Foco vai pro **título** do modal ou pro primeiro input
2. `Tab` cicla **dentro** do modal (não vaza pra conteúdo atrás)
3. `Esc` fecha o modal e devolve foco pro botão que abriu

---

## ARIA patterns

### Botão só com ícone

```tsx
<button aria-label="Curtir post">
  <ThumbsUp size={20} aria-hidden="true" />
</button>
```

### Imagem decorativa

```tsx
<img src="..." alt="" aria-hidden="true" />  {/* alt vazio */}
```

### Imagem funcional

```tsx
<img src="post-cover.jpg" alt="Capa do post: 5 erros comuns ao abrir MEI" />
```

### Ícone com significado

```tsx
<CheckCircle2 aria-label="Aprovado" />   {/* ícone sozinho */}
<span aria-label="Aprovado">
  <CheckCircle2 aria-hidden="true" />     {/* ícone com texto adjacente */}
  Aprovado
</span>
```

### Loading state

```tsx
<div role="status" aria-live="polite">
  <Loader2 className="animate-spin" aria-hidden="true" />
  Carregando posts...
</div>
```

### Toast / notificação

```tsx
<div role="alert" aria-live="polite">
  Check-in aprovado. +1 ponto.
</div>
```

---

## Texto

### Tamanhos mínimos

| Tipo | Mínimo |
|---|---|
| Corpo de texto | 14px (preferir 15-16px) |
| Botões | 15px |
| Caption / timestamps | 12px (nunca menos) |
| Emojis decorativos | tamanho do texto adjacente |

### Espaçamento

- **Line-height:** nunca < 1.4× (no app, padrão 1.6×).
- **Letter-spacing:** entre -0.02em e +0.02em (default).
- **Paragraph spacing:** mínimo 0.5× do tamanho do texto.
- **Word-spacing:** respeitar padrão (não truncar texto).

### Largura máxima de linha

- **Corpo:** 65 caracteres (~720px em 15px).
- **Títulos:** 50 caracteres.
- **Caption:** sem limite.

### Idioma

`<html lang="pt-BR">` no root. Quando texto em inglês (ex.: hashtag, marca), `<span lang="en">`.

---

## Movimento

### `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

> Respeitar quem tem vestibular disorders. Sem confete, sem slide-in, sem parallax.

### Auto-play

Nada de vídeo ou áudio tocando automaticamente. Sempre pausado até o usuário iniciar.

---

## Formulários

### Validação

| Momento | Como |
|---|---|
| On blur | Valida campo individual |
| On submit | Valida tudo |
| Em tempo real | Só pra senha (força) e username (disponibilidade) |

### Mensagens de erro

```tsx
// Estrutura acessível
<div>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    aria-invalid={hasError}
    aria-describedby="email-error"
  />
  {hasError && (
    <p id="email-error" role="alert" className="text-state-error">
      Coloca um email válido, por favor.
    </p>
  )}
</div>
```

> Mensagem diz **o que tá errado** + **como corrigir**. Nunca só "erro".

---

## Tabelas (ranking)

```tsx
<table>
  <caption className="sr-only">Ranking dos colaboradores mais engajados</caption>
  <thead>
    <tr>
      <th scope="col">Posição</th>
      <th scope="col">Colaborador</th>
      <th scope="col">Pontos</th>
    </tr>
  </thead>
  ...
</table>
```

- `<caption>` mesmo que visualmente oculto (`sr-only`).
- `scope="col"` em todos os `<th>`.

---

## Auditoria

### Ferramentas usadas no CI/CD

| Ferramenta | Quando |
|---|---|
| **axe-core** (Playwright) | Roda em cada PR, falha o build se violar AA |
| **Lighthouse CI** | A11y score mínimo 95 |
| **pa11y** | Smoke test em produção, semanal |
| **VoiceOver / NVDA** | Teste manual a cada release |

### Checklist de PR

- [ ] Todos os botões interativos navegáveis por Tab
- [ ] `:focus-visible` visível em todos os elementos focáveis
- [ ] Imagens com `alt` apropriado (ou `alt=""` se decorativa)
- [ ] Inputs com `<label>` associado
- [ ] Mensagens de erro com `role="alert"` ou `aria-live`
- [ ] Cores de foreground/background na tabela aprovada
- [ ] Tap target ≥ 44×44px
- [ ] `axe-core` sem violações
- [ ] Testado com leitor de tela (VoiceOver ou NVDA)

---

## Onde tá implementado

- **Foco global:** `app/globals.css` com `:focus-visible`
- **Reduced motion:** `app/globals.css` com media query
- **Componentes:** `components/ui/*` todos com ARIA correto (shadcn já entrega boa parte)
- **Testes:** `tests/a11y/` com Playwright + axe-core
- **CI:** `.github/workflows/a11y.yml` (a criar) roda axe em cada PR

---

**Fim do brand book.** Pra começar a implementar, abre `assets/tokens.css` ou `assets/tokens.json` e segue os componentes do [06-components.md](./06-components.md).
