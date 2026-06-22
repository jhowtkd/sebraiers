# 08 — Imagem

## Princípios do brandbook (cap. 3, p. 95-104)

Três diretrizes que guiam tudo que aparece visualmente no app:

1. **Somos reais** — gente comum, histórias reais, sem filtros ou expressões artificiais.
2. **Somos inspiradores** — histórias reais de evolução, conquistas, brilho no olhar.
3. **Somos fazedores** — pessoas em ação, de forma espontânea, nada posado.

> **Regra de ouro:** *"Nossa marca é pautada na verdade. Preferimos algo mais próximo, pessoas e histórias reais."* — cap. 7, p. 229.

---

## Tipos de imagem no app

| Tipo | Onde aparece | Quem produz | Formato |
|---|---|---|---|
| **Avatar de usuário** | Header, ranking, perfil | Usuário (upload) ou iniciais geradas | JPG, PNG, WebP |
| **Capa de post** | Card de post, detalhe | Admin (upload) | JPG, PNG, WebP |
| **Logo SEBRAEIERS** | Header, login, materiais | Design (asset) | SVG |
| **Ícones** | Toda UI | Design / Lucide | SVG |
| **Ilustrações vazias** | Empty states | Design (próprio) ou Lottie | SVG, Lottie JSON |
| **Background decorativo** | Splash, hero | Design | SVG, gradiente CSS |

---

## Avatares de usuário

### Especificações

| Spec | Valor |
|---|---|
| Tamanho de upload mínimo | 200×200px |
| Tamanho de upload máximo | 5MB |
| Formatos aceitos | JPG, PNG, WebP |
| Aspect ratio | 1:1 (quadrado) —强制 crop no cliente |
| Resolução exibida | até 144×144px (perfil) |

### Quando o usuário não tem foto

Gerar **iniciais** em fundo `--brand-azu-100` (`#E0E7FB`) com texto `--brand-azul` (`#2A4FDA`):

```
┌──────────┐
│          │
│    MS    │   ← Maria Silva
│          │      Figtree Bold 32px
└──────────┘
   96×96px
```

- **Cor de fundo:** uma das 4 variações da paleta diversa pra dar diversidade visual sem virar circo:
  - `--gam-menta` (`#9FF0BD`)
  - `--gam-ipe` (`#F2AFAB`)
  - `--gam-canario` (`#FBEC76`) — só com texto Atlântico
  - `--brand-azu-100`
- **Cor do texto:** sempre escura (`--brand-atlantico` ou `--text-primary`)
- **Fonte:** Figtree Bold, peso 700, tamanho proporcional ao container

> **Por que não fundo colorido aleatório pra cada usuário?** Porque avatar é identidade. Iniciais em Atlântico + branco é consistente e profissional. A cor entra **só quando o usuário explicitamente escolhe foto colorida**.

---

## Capas de post

### Especificações de upload (admin)

| Spec | Valor |
|---|---|
| Dimensão recomendada | 1200×675px (16:9) |
| Dimensão mínima | 600×400px |
| Tamanho máximo | 5MB |
| Formatos | JPG, PNG, WebP |
| Mime-type whitelist | `image/jpeg`, `image/png`, `image/webp` |

> **Validação no cliente E no servidor** (Zod + bucket policy).

### Como呈现 no card

- Aspect ratio **16:9** sempre (recorta no servidor se vier diferente)
- Border-radius `--radius-xl` no topo
- Sem overlay de cor (a imagem deve aparecer natural)
- Lazy loading nativo (`<img loading="lazy">`)

### Quando o post não tem capa

Placeholder derivado do **grid SEBRAE** (cap. 3, p. 105) — barras paralelas a 77,7° em Atlântico sobre Offwhite:

```
┌──────────────────────────────────────┐
│ ╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱│
│ ╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱│
│ ╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱│
└──────────────────────────────────────┘
   fundo #EFF3EE + barras #0B2574 a 77,7°
```

> Detalhe que conecta com a herança da marca-mãe sem precisar de logo.

---

## Imagens em empty states

Quando não tem conteúdo, a ilustração vazia precisa ser **acolhedora**, nunca triste. Segue o cap. 2, p. 50 do brandbook sobre uso de emojis: *"usados sem exageros para não 'infantilizar' a comunicação"*.

### Padrão

- Estilo: linha fina (1.5px) com cor `--text-muted`
- Fundo: nenhum (deixa o `--surface-elevated` aparecer)
- Cor de preenchimento: tom claro da paleta diversa (`--gam-umbu`, `--gam-ipe`)
- Tamanho: 80×80 a 120×120px
- **Sempre acompanhado de texto** (nunca só ilustração)

### Biblioteca de ilustrações

| Contexto | Ilustração |
|---|---|
| Sem posts | Caixa de correio aberta |
| Sem check-ins | Mãos aplaudindo (suave) |
| Sem conexão | Antena/wifi cortado |
| Sem permissão | Cadeado |
| Busca vazia | Lupa com traço |

> **Recomendação:** desenhar SVGs próprios (não usar stock illustration genérica que destoa da marca). Caso usar stock, **só** em mockups internos — nunca em produção.

---

## Uso de IA generativa (cap. 7, p. 226-231)

O brandbook tem postura clara: **IA é ferramenta, não essência**. Aplicado ao SEBRAEIERS:

### Permitido

- ✅ Mockups internos e protótipos visuais
- ✅ Variações de fundo e padrões geométricos
- ✅ Geração de capas placeholder durante desenvolvimento
- ✅ Tratamento de imagens (correção de cor, redimensionamento)
- ✅ Rascunhos de empty states pra acelerar design

### Não permitido (em produção)

- ❌ Foto de "pessoa genérica" como capa de post
- ❌ Avatar gerado por IA
- ❌ Ilustração de celebridade emprestada
- ❌ Conteúdo que finge ser real quando não é

> **Regra do brandbook (p. 229):** *"Considerar o uso de IA para: comunicações digitais de baixa perenidade, conteúdo sobre datas comemorativas, geração de fundos e grafismos abstratos."* — isso é o teto.

### Como declarar uso de IA

Quando usar imagem gerada por IA, marcar internamente com metadado `ai_generated: true` no Storage. Útil pra auditoria futura.

---

## Tratamento de imagem (cap. 3, p. 102)

| Diretriz | Como aplicar no app |
|---|---|
| Temperatura quente | Aplicar sutil filtro quente (saturação +5%, temperatura +3%) em pipeline de upload |
| Cenário natural | Recusar imagens com fundo artificial no upload (validar com moderador) |
| Diversidade | Estimular admin a variar rostos, idades, etnias nos posts cadastrados |

> **Implementação:** o admin faz upload da imagem crua. Pipeline server-side aplica ajuste de temperatura automaticamente (CSS filter ou ImageMagick).

---

## O que NÃO fazer (cap. 3, p. 104)

- ❌ Imagens com intervenções gráficas pesadas sobre pessoas
- ❌ Imagens com efeitos (filtros vintage, glitch, etc)
- ❌ Iluminação forçada ou posada
- ❌ Gestos ou poses forçadas
- ❌ **Preto e branco** (cap. 3, p. 104: *"devemos evitar o uso de imagens em preto e branco. Essa linguagem pode ser aproveitada em submarcas ou campanhas"* — não no app)

---

## Performance de imagem

| Spec | Valor |
|---|---|
| Formato preferido | WebP (com fallback PNG/JPG) |
| Quality | 80% no upload (servidor re-comprime) |
| Lazy loading | Em todas as imagens below-the-fold |
| Placeholder blur | Mostra blur de 8×8px até carregar (LQIP) |
| CDN | Supabase Storage com CDN habilitada |
| Cache | `Cache-Control: public, max-age=31536000, immutable` em imagens com hash |

> **Meta:** Largest Contentful Paint < 2.5s em 3G. Imagens são o maior vilão de performance — tratar com carinho.

---

## Onde implementar

| Componente | Path |
|---|---|
| Avatar com iniciais | `components/ui/avatar.tsx` (wrapper do shadcn) |
| Capa de post | `components/posts/post-cover.tsx` |
| Empty state illustrations | `components/ui/empty-state.tsx` |
| Upload + compressão | `lib/images/upload.ts` (server-side) |
| Validação Zod | `lib/validation/schemas.ts` |

---

**Próximo:** [09-accessibility.md](./09-accessibility.md) — WCAG, contraste, foco, navegação por teclado.
