# 01 — Logotipo

## Conceito

A wordmark **SEBRAEIERS** é a assinatura visual do app. Ela combina dois elementos:

1. **"SEBRAE"** — preservado íntegro da marca-mãe, em azul institucional, na tipografia **Univers Extra Bold Italic** (fonte oficial do logo SEBRAE). É a herança, o lastro de credibilidade.
2. **".iers"** — sufixo proprietário que dá identidade ao produto. Em destaque, na cor **Taiti** (`#90D275`, verde da paleta diversa), mesmo peso/tipografia. É o sufixo que cria pertencimento sem desvincular da marca-mãe.

> **Por que ".iers"?** É o coletivo de quem faz — "Sebrae + makers/criadores/jogadores". Funciona como sufixo de grupo (`developers`, `engineers`, `iers`). Reforça que o app é sobre **as pessoas que se engajam**, não sobre o software.

## Wordmark principal

```
┌──────────────────────────────────────────────┐
│                                              │
│   SEBRAEiers                                 │
│   ██████ ██████ ███████  ███ ██████ ██████   │
│                                              │
└──────────────────────────────────────────────┘
   ↑ azul #2A4FDA      ↑ verde Taiti #90D275
```

**Onde fica:** cabeçalho do app, página de login, e-mail marketing, materiais impressos (crachá de acesso, adesivo em eventos internos).

## Variações

| Variação | Uso | Arquivo |
|---|---|---|
| **Principal colorida** | Telas claras, fundo branco ou offwhite | `assets/logo-sebraiers.svg` |
| **Monocromática azul** | Quando só o azul institucional tá disponível (1 cor) | `assets/logo-sebraiers-mono.svg` |
| **Monocromática branca** | Sobre fundos escuros (azul, preto, fotos escuras) | usar a mono invertida |
| **Ícone (S+i)** | Favicon, app icon (PWA), avatar em redes | `assets/logo-icon.svg` |

### Quando usar cada uma

- **Telas claras do app** → principal colorida (`logo-sebraiers.svg`)
- **E-mail marketing / login** → principal colorida
- **Materiais impressos em 1 cor** → monocromática azul
- **Post em rede social sobre fundo azul** → monocromática branca
- **Favicon / app icon / ícone PWA** → apenas o ícone (`logo-icon.svg`)
- **Assinatura em crachá** → monocromática azul (redução extrema)

## Área de proteção

Nenhum elemento pode invadir o retângulo que tangencia os pontos extremos da wordmark. Use a **altura da letra "S"** como unidade de medida (igual ao logo oficial SEBRAE, cap. 6 do brandbook).

```
        ┌─────────────────────────────────────┐
        │                                     │
   ┌────┤   SEBRAEiers                       ├────┐
   │ X  │                                     │  X │
   └────┤                                     ├────┘
        │                                     │
        └─────────────────────────────────────┘
```

> **X = altura da letra "S" de SEBRAE.** Mínimo de X em todos os lados. Em pixel, no app, isso vira ~16px de padding mínimo ao redor.

## Redução máxima

| Contexto | Largura mínima |
|---|---|
| Telas mobile (header) | 96px |
| E-mail marketing | 120px |
| Material impresso A4 | 25mm |
| Favicon / app icon | 32px (usar **só** o ícone) |
| Crachá | 18mm (usar **só** o ícone) |

Abaixo de 96px de largura, troque a wordmark completa pelo **ícone**.

## Construção do ícone (logo-icon.svg)

O ícone é derivado das **barras do logo SEBRAE** (o "S" estilizado das barras inclinadas a 77,7°), acrescido de um "i" minimalista que reforça "iers" / "i" = identidade.

```
┌─────────────┐
│ ╱╱          │
│╱╱  •        │  ← barras SEBRAE + ponto do "i"
│             │
└─────────────┘
```

- Fundo: azul Atlântico (`#0B2574`)
- Barras: branco (`#FFFFFF`)
- Ponto do "i": Taiti (`#90D275`) — pra conectar com o destaque da wordmark

> Detalhe de construção: as barras seguem a mesma inclinação do logo SEBRAE (77,7°). Respeitar essa inclinação é o que mantém o vínculo com a marca-mãe.

## Coexistência com a marca-mãe (cap. 5 do brandbook)

Quando o SEBRAEIERS aparecer **ao lado** do logo SEBRAE (ex.: e-mail marketing institucional, banner em evento), siga a regra de **assinaturas compartilhadas**:

- O logo SEBRAE sempre fica à **esquerda** ou **acima**
- O SEBRAEIERS sempre fica à **direita** ou **abaixo**
- Alturas devem ser **opticamente iguais**
- Distância entre eles: pelo menos **2x a altura da barra** do logo SEBRAE

**Exemplo correto:**

```
┌─────────────┐                             
│   SEBRAE    │  ┃┃  SEBRAEIERS             
│   Goiás     │                             
└─────────────┘                             
       ↑                ↑
   marca-mãe        submarca
   (à esquerda)   (à direita, mesma altura)
```

**O que NÃO fazer:**

- ❌ SEBRAEIERS sozinho sem nenhum contexto (em materiais externos, sempre acompanhado da marca-mãe)
- ❌ SEBRAEIERS maior que a marca-mãe (hierarquia visual sempre favorece o SEBRAE)
- ❌ Trocar a cor do "SEBRAE" — sempre azul institucional
- ❌ Usar outra tipografia pra "SEBRAE" — sempre Univers Extra Bold Italic
- ❌ Esticar, condensar, girar, inclinar a wordmark

## Tipografia da wordmark

| Trecho | Fonte | Peso | Cor |
|---|---|---|---|
| "SEBRAE" | Univers Extra Bold Italic | Extra Bold Italic | `#2A4FDA` (Azul SEBRAE) |
| ".iers" | Univers Extra Bold Italic | Extra Bold Italic | `#90D275` (Taiti) |

> **Fallback web:** como a Univers é proprietária (não distribuível em web), os SVGs já vêm **com o texto convertido em curvas/path**. Quem for usar a wordmark no app deve sempre usar o SVG, nunca digitar o texto direto.

## Referências no brandbook oficial

- **Cap. 3 (p. 66)** — logotipo SEBRAE, "configuração original e padrão que nunca deve ser alterada".
- **Cap. 5 (p. 156)** — logos monolíticos 01 (assim como o SEBRAEIERS faz, com símbolo + texto na mesma linha).
- **Cap. 5 (p. 159)** — "O que não fazer em submarcas": referência direta do que evitar no SEBRAEIERS.
- **Cap. 6 (p. 198, 202, 203)** — assinatura simples, área de proteção e redução máxima (mesmas regras que aplicamos aqui).

---

**Próximo:** [02-colors.md](./02-colors.md) — paleta oficial + tons funcionais do app.
