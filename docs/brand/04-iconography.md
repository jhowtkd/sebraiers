# 04 — Iconografia

## Bibliotecas usadas

| Biblioteca | Onde | Por quê |
|---|---|---|
| **[Lucide](https://lucide.dev)** | UI geral (botões, navegação, estados) | Open source, traço consistente, 1.500+ ícones |
| **Ícones de redes sociais** | Cards de post, perfil do usuário | SVG próprio + biblioteca [simple-icons](https://simpleicons.org) |
| **Ícones proprietários** | Emblemas de tier, logo SEBRAEIERS, ícone do app | Desenhados por nós (ver abaixo) |

> Toda escolha de ícone tem que respeitar o **cap. 3, p. 125** do brandbook: "Iconografia — auxilia na representação visual de conceitos e ações". Usamos ícones pra **apoiar** texto, nunca pra substituir.

---

## Tamanhos padrão

| Token | Tamanho | Onde |
|---|---|---|
| `--icon-xs` | 12px | Inline em texto, badges pequenos |
| `--icon-sm` | 16px | Botões com label, breadcrumb |
| `--icon-md` | 20px | Botões de ação (Curti/Comentei/Comparti), inputs |
| `--icon-lg` | 24px | Header, ícones de seção |
| `--icon-xl` | 32px | Empty states, ilustração inline |
| `--icon-2xl` | 48px | Ícones de feature em página de boas-vindas |

**Regra:** ícone e texto adjacente devem ter **altura óptica igual**. Se o ícone tem 20px e a label é 15px, alinha pelo centro (não pela base).

---

## Ícones de redes sociais

Cada rede tem um ícone oficial + cor de marca. Esses são os ícones que aparecem no app:

| Rede | Cor oficial | Onde aparece |
|---|---|---|
| Instagram | `#E4405F` (gradiente oficial simplificado) | Card de post, perfil |
| LinkedIn | `#0A66C2` | Card de post, perfil |
| Facebook | `#1877F2` | Card de post, perfil |
| TikTok | `#000000` (com detalhe vermelho `#FF0050` e ciano `#00F2EA`) | Card de post, perfil |
| YouTube | `#FF0000` | Card de post, perfil |
| Threads | `#000000` | Card de post, perfil |

> **Nota do brandbook (cap. 5, p. 173):** submarcas devem usar cores da paleta SEBRAE. **Exceção pra ícones de redes sociais** — usa a cor oficial da rede pra reconhecibilidade. Caso a aprovação visual seja sensível, a cor pode ser substituída por Atlântico (`#0B2574`).

### Como renderizar

```tsx
import { Instagram, Linkedin, Facebook, Youtube } from 'lucide-react';

// Componente wrapper
<NetworkIcon network="instagram" size={20} />
```

```tsx
// Implementação
const NETWORK_ICONS = {
  instagram: Instagram,
  linkedin: Linkedin,
  facebook: Facebook,
  tiktok: null,           // ícone próprio (TikTok tem formato único)
  youtube: Youtube,
  threads: null,          // ícone próprio
};
```

**Implementação completa dos ícones próprios de TikTok e Threads:** ver `components/ui/network-icon.tsx` (a ser criado na fase de implementação).

---

## Badges de status

Pequenos marcadores circulares ou em pill que identificam **o estado de algo** no app. Sempre combinam **cor + ícone + texto** (WCAG 1.4.1).

### Status de check-in

| Status | Cor de fundo | Cor do texto | Ícone | Label |
|---|---|---|---|---|
| **Pendente** | `--gam-ipe` (`#F2AFAB`) | `--text-primary` | `Clock` | "Aguardando aprovação" |
| **Aprovado** | `--state-success` (`#61B466`) | `--text-on-primary` (branco) | `CheckCircle2` | "Aprovado" |
| **Rejeitado** | `--state-error` (`#E0565D`) | `--text-on-primary` | `XCircle` | "Rejeitado" |

### Status de tier

| Tier | Cor | Ícone | Label |
|---|---|---|---|
| Bronze | `--tier-bronze` (`#F39D72`) | Medal | "Bronze — 50 pts" |
| Prata | `--tier-prata` (`#E0565D`) | Medal | "Prata — 100 pts" |
| Ouro | `--tier-ouro` (`#FBEC76`) | Medal (com brilho) | "Ouro — 250 pts" |
| Platina | `--tier-platina` (`#FF80C8`) | Trophy | "Platina — 500 pts" |
| Diamante | `--tier-diamante` (`#BE64E3`) | Crown | "Diamante — 1000 pts" |

> Os **ícones de tier** (medal, trophy, crown) são **decorativos**. A informação de tier é dada também pela **cor + texto** — nunca dependa só do ícone.

---

## Emblemas de tier (SVG inline)

São as insígnias visuais que aparecem no perfil do usuário. Cada uma tem um desenho próprio, derivado da paleta diversa.

### Bronze

```
   ┌──────────┐
   │   ╱╲     │   disco Acerola (#F39D72)
   │  ╱  ╲    │   com "50" no centro
   │  ╲  ╱    │   fonte: Figtree Bold
   │   ╲╱     │   cor texto: Atlântico
   └──────────┘
```

### Prata

```
   ┌──────────┐
   │   ╱╲     │   Tiê (#E0565D)
   │  ╱  ╲    │   hexágono com "100"
   │  ╲  ╱    │
   │   ╲╱     │
   └──────────┘
```

### Ouro

```
   ┌──────────┐
   │   ✦      │   Canário (#FBEC76) com brilho
   │  ╱╲╱╲    │   estrela de 5 pontas
   │  ╲╱╲╱    │   "250" no centro
   │   ✦      │
   └──────────┘
```

### Platina

```
   ┌──────────┐
   │   ♛      │   Begônia (#FF80C8)
   │  ╱│╲     │   coroa estilizada
   │  ╲│╱     │   "500" no centro
   │   │      │
   └──────────┘
```

### Diamante

```
   ┌──────────┐
   │   ◆      │   Manacá (#BE64E3)
   │  ╱ ╲     │   diamante facetado
   │  ╲ ╱     │   com brilho interno
   │   ◆      │
   └──────────┘
```

> **Implementação SVG completa** em `components/ui/tier-badge.tsx` — cada emblema é um componente React que recebe `tier` e `points` como props.

---

## Emblemas do pódio (top 3 do ranking)

🥇 **1º lugar** — fundo Canário, medalha "1" em Atlântico
🥈 **2º lugar** — fundo Tiê (versão clara), medalha "2" em branco
🥉 **3º lugar** — fundo Acerola, medalha "3" em branco

**Implementação:** emojis Unicode padrão são suficientes aqui. Não precisa SVG próprio, eles são universalmente reconhecidos. Mas se quiser uma versão mais "marca", tem componente próprio em `components/ranking/podium.tsx`.

---

## Ícones de ação do app (3 botões de check-in)

São os 3 botões mais importantes da tela — eles que fazem o app funcionar.

| Ação | Ícone Lucide | Cor de hover | Cor de confirmado |
|---|---|---|---|
| **Curti** | `ThumbsUp` | `--brand-ceu` claro | `--state-success` |
| **Comentei** | `MessageCircle` | `--brand-ceu` claro | `--state-success` |
| **Compartilhei** | `Share2` | `--brand-ceu` claro | `--state-success` |

> **Por que a mesma cor de confirmado pra todos?** Porque **todos são engajamento positivo**. Diferenciar visualmente por cor causaria confusão ("compartilhar é melhor que curtir?"). A diferenciação fica no **label do botão** e nos **pontos** (1, 2, 3).

---

## Estados de botão

| Estado | Como fica |
|---|---|
| Default | outline sutil, ícone na cor `--text-secondary` |
| Hover | fundo `--brand-ceu-100` (azul claro), ícone `--brand-azul` |
| Confirmado (após clique) | fundo `--state-success`, ícone branco, label "Confirmado" |
| Disabled | cor `--text-disabled`, cursor `not-allowed` |
| Loading | spinner `Loader2` rotacionando, label oculto |

---

## Empty states

Quando não tem nada (zero posts, zero check-ins, sem conexão):

| Contexto | Ícone | Mensagem exemplo |
|---|---|---|
| Timeline vazia | `Inbox` | "Ainda não tem posts por aqui. Volta amanhã!" |
| Sem check-ins | `Sparkles` | "Sua jornada de engajamento começa agora. Curtiu um post? Declara aqui!" |
| Sem conexão | `WifiOff` | "Sem internet. Reconecta aí e tenta de novo." |
| Erro genérico | `AlertTriangle` | "Algo deu errado. Tenta de novo em alguns segundos." |

> O ícone sempre tem **32px** (icon-xl) e fica centralizado acima do texto. Texto segue o padrão de voz do [05-voice-tone.md](./05-voice-tone.md).

---

## Acessibilidade

- Todo ícone funcional tem `aria-label` descritivo.
- Ícones decorativos têm `aria-hidden="true"` + texto adjacente carregando o significado.
- Foco visível em **todo** botão que contém só ícone (border de 2px em `--border-focus`).
- Contraste mínimo do ícone contra o fundo: 3:1 (WCAG 1.4.11).

---

**Próximo:** [05-voice-tone.md](./05-voice-tone.md) — tom de voz, microcopy, exemplos bons/ruins.
