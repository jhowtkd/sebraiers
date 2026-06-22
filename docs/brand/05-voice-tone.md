# 05 — Voz e Tom

## De onde viemos

Este capítulo é **derivado direto** do cap. 2 do Brandbook oficial SEBRAE 2026 (p. 31-58). Aplicamos os princípios gerais ao contexto do SEBRAEIERS — um app interno, gamificado, feito pra colaboradores.

> **A regra-mãe do SEBRAE:** *"Não somos protagonistas. Somos facilitadores. Estamos lado a lado."*

No SEBRAEIERS isso significa: o **colaborador** é quem engaja nas redes, quem ganha pontos, quem sobe no ranking. A gente só **celebra junto**, mostra o caminho e dá visibilidade.

---

## Quem somos em 3 adjetivos

**Próximos · Reais · Versáteis.**

| Diretriz | Como se traduz no app |
|---|---|
| **Próximos** | Saudação pelo nome, congratula por conquistas, lembra de check-ins pendentes com delicadeza |
| **Reais** | Sem promessas de "viralizar". Sem "você vai bombar!". Fala dos números reais do SEBRAE |
| **Versáteis** | Linguagem adapta ao contexto: empolgada em celebração, direta em ação, cuidadosa em rejeição |

---

## Princípios de microcopy

Cada texto da interface é uma **micro-conversa**. Segue 6 regras práticas:

### 1. Chama pelo nome

Quando souber o nome do usuário, usa. Quando não souber, usa "você".

```
✓  "Boa, Maria! Você chegou no tier Ouro."
✓  "Curtiu o post? Conta pra gente aqui."
✗  "Olá, usuário! Notamos que você atingiu..."
✗  "Amigo!! Parabéns pelo engajamento!!"
```

### 2. Energia positiva com moderação

Ponto de exclamação? **No máximo um por mensagem**. E nunca em sequência.

```
✓  "Pronto, agora é só esperar a aprovação."
✓  "Boa! Você saltou 4 posições no ranking."
✗  "PARABÉNS!!! VOCÊ É DEMAIS!!!"
✗  "Obaaaaaaaaa!"
```

### 3. Mostra que entende

Quando rejeitar um check-in, **não é robô**. Explica o motivo com cuidado.

```
✓  "Esse check-in foi rejeitado. Se achar que foi um engano, fala com a Comunicação."
✗  "Check-in rejeitado. Status: rejected."
```

### 4. Linguagem de gente

Contrações, interjeições pontuais, frase como se fala.

```
✓  "Curtiu o post? Conta pra gente."
✓  "Calma, a aprovação pode levar até 24h."
✗  "Realizou a ação? Por favor, submeta o check-in para análise."
```

### 5. Colabora, não protagoniza

Sempre que der, coloca o usuário como agente. "Vamos juntos" em vez de "o SEBRAE faz".

```
✓  "Bora compartilhar esse post?"
✓  "Vamos juntos amplificar a voz do empreendedorismo."
✗  "O SEBRAE está impulsionando seu engajamento."
```

### 6. Linguagem inclusiva

Segue o cap. 2, p. 52 do brandbook:

| ❌ Evitar | ✓ Preferir |
|---|---|
| "os usuários" | "quem usa" / "as pessoas" |
| "todos os homens" | "todo mundo" / "humanidade" |
| "os dentistas" | "quem é dentista" / "dentistas" (sem artigo) |
| "bem-vindo" (genérico) | "bem-vinda, Maria" / "bem-vindo, João" |

---

## Exemplos práticos no app

### Onboarding (1ª vez)

```
┌──────────────────────────────────────────────┐
│                                              │
│  Bem-vindo ao SEBRAEIERS                     │
│                                              │
│  Você chegou. Agora é só conectar suas       │
│  redes sociais pra gente conseguir            │
│  acompanhar seu engajamento.                  │
│                                              │
│  Leva menos de 2 minutos.                    │
│                                              │
│  [Vamos lá →]                                │
│                                              │
└──────────────────────────────────────────────┘
```

### Confirmação de check-in

```
┌──────────────────────────────────────────────┐
│                                              │
│  ✓  Pronto! Curtida registrada.              │
│                                              │
│  Seu check-in foi enviado pra aprovação.     │
│  Em até 24h ele aparece no seu placar.       │
│                                              │
│  [Voltar pra timeline]                       │
│                                              │
└──────────────────────────────────────────────┘
```

### Toast de aprovação (pós-decisão do admin)

```
┌──────────────────────────────────────────────┐
│ ✓  +1 ponto! Curtida aprovada.               │
└──────────────────────────────────────────────┘
```

### Toast de rejeição

```
┌──────────────────────────────────────────────┐
│ ✗  Curtida não aprovada.                     │
│    Fala com a Comunicação se achar           │
│    que foi engano.                           │
└──────────────────────────────────────────────┘
```

### Subiu de tier

```
┌──────────────────────────────────────────────┐
│                                              │
│  🎉  Você chegou no tier OURO!               │
│                                              │
│  250 pontos. Daqui pra frente cada           │
│  ação vale ainda mais — porque você          │
│  já provou que tá junto.                     │
│                                              │
│  [Ver meu perfil]                            │
│                                              │
└──────────────────────────────────────────────┘
```

### Ranking (descrição da página)

```
Top 50 colaboradores mais engajados
do SEBRAE Goiás este mês. Atualizado em
tempo real conforme os check-ins são aprovados.
```

### Empty state (sem posts)

```
┌──────────────────────────────────────────────┐
│              📭                               │
│                                              │
│  Nenhum post por aqui ainda.                 │
│  A Comunicação costuma postar de manhã —     │
│  volta mais tarde pra ver o que tá saindo!   │
│                                              │
└──────────────────────────────────────────────┘
```

### Empty state (sem check-ins)

```
┌──────────────────────────────────────────────┐
│              ✨                               │
│                                              │
│  Sua jornada de engajamento começa agora.    │
│  Curtiu algum post? É só voltar aqui         │
│  e contar pra gente.                         │
│                                              │
└──────────────────────────────────────────────┘
```

### Erro genérico

```
┌──────────────────────────────────────────────┐
│              ⚠️                               │
│                                              │
│  Algo deu errado. Pode ser uma instabilidade │
│  no servidor — tenta de novo em alguns       │
│  segundos. Se persistir, fala com a gente.    │
│                                              │
│  [Tentar de novo]                            │
│                                              │
└──────────────────────────────────────────────┘
```

### Sem internet

```
┌──────────────────────────────────────────────┐
│              📡                               │
│                                              │
│  Tá sem internet. Quando voltar,             │
│  a gente atualiza tudo certinho.             │
│                                              │
└──────────────────────────────────────────────┘
```

---

## Microcopy por tela

### Login

- **Título:** "Entrar no SEBRAEIERS"
- **Subtítulo:** "Use seu email @sebrae.com.br"
- **CTA:** "Entrar"
- **Link pra signup:** "Primeira vez? Cria sua conta."

### Signup

- **Título:** "Criar conta"
- **Subtítulo:** "Bem-vindo à turma que faz o SEBRAE Goiás chegar mais longe."
- **CTA:** "Criar conta"
- **Microcopy do campo username:** "Só letras minúsculas, números e _ ou . — entre 3 e 30 caracteres"
- **Já tem conta:** "Já tem conta? Entra aqui."

### Perfil (onboarding)

- **Título:** "Seus perfis de rede"
- **Subtítulo:** "Preenche só os que você usa. A gente não publica nada por você — só precisa pra validar suas ações."
- **Placeholder Instagram:** "@seuuser"
- **CTA:** "Salvar e começar"

### Timeline

- **Título da página:** "Posts do SEBRAE"
- **Subtítulo:** "Tá saindo agora das redes oficiais. Curte, comenta, compartilha — e volta aqui pra registrar."
- **Filtro "Todas" / "Instagram" / "LinkedIn" / etc.**
- **CTA "Carregar mais":** "Ver mais posts"

### Detalhe do post

- **CTA "Curti":** "Curti" / após: "Curtido ✓"
- **CTA "Comentei":** "Comentei" / após: "Comentário registrado ✓"
- **CTA "Compartilhei":** "Compartilhei" / após: "Compartilhamento registrado ✓"
- **Link pra rede:** "Abrir post original no Instagram ↗"

### Meu desempenho

- **Título:** "Meu desempenho"
- **Subtítulo:** "Sua jornada de engajamento, em números."
- **Empty state:** "Ainda não tem check-ins aprovados. Bora começar?"

### Ranking

- **Título:** "Ranking"
- **Subtítulo:** "Top 50 colaboradores mais engajados este mês."
- **Sua posição** (fora do top 50): "Você está na posição **#23**."

### Admin — Check-ins pendentes

- **Título:** "Check-ins pendentes"
- **Subtítulo:** "{N} aguardando sua decisão."
- **Botão aprovar:** "Aprovar"
- **Botão rejeitar:** "Rejeitar"
- **Placeholder da nota:** "Motivo (opcional, visível pro usuário)"
- **Confirmação:** "Pronto! Decisão registrada."

### Admin — Posts

- **Título:** "Posts"
- **Subtítulo:** "Cadastre os posts do SEBRAE Goiás. Colaboradores engajam e ganham pontos."
- **Botão novo:** "Novo post"

### Admin — Usuários

- **Título:** "Colaboradores"
- **Subtítulo:** "Gerencie quem entra e o que pode fazer no app."
- **Estado "desativado":** "Conta desativada — não consegue entrar."

---

## Brasileirismos e expressões

OK usar (são da fala natural):

- "bora", "vamos lá", "vamos juntos"
- "tá", "tá saindo", "tá bom"
- "contar pra gente", "conta aqui"
- "Curtiu? Comenta!", "compartilha aí"
- "Boa!", "Massa!", "Show!" (em contexto informal)

**Evitar** (forçar tom):

- "Pessoal, estamos thrilled to announce..."
- "Faça o download do app" (formal demais)
- "Prezado colaborador" (distante)

---

## Estruturas que funcionam

### Saudação + ação + convite

```
✓  "Boa, Maria! Curtiu o post? Conta pra gente."
✓  "E aí, Pedro! Já viu o post de hoje?"
✗  "Olá, senhor Pedro. Gostaríamos de informar..."
```

### Conquista + consequência + celebração

```
✓  "Você chegou no tier Ouro! Agora cada ação vale ainda mais."
✗  "Parabéns! Você desbloqueou a conquista OURO."
```

### Pedido de feedback com suavidade

```
✓  "Curtiu o post? Clica aqui pra registrar."
✗  "Submeta seu check-in."
```

---

## Quando NÃO usar linguagem do brandbook

| Contexto | Tom |
|---|---|
| Texto jurídico (termos de uso, política de privacidade) | Formal, técnico |
| Mensagens de erro críticas | Direto, claro, sem floreio |
| Notificações de admin (ex.: "post removido por violar regras") | Sério, factual |
| E-mails transacionais (ex.: "sua senha foi alterada") | Objetivo, sem calor |

> A marca tem personalidade, mas **não substitui a clareza** quando o assunto é sério. Nesses casos, copy técnica primeiro, personalidade depois (se couber).

---

## Glossário da marca

| Termo | Como usar |
|---|---|
| **SEBRAEIERS** | Sempre em maiúsculas. Nunca "sebraeiers", "Sebraiers" ou "SEBRAE IERS" |
| **SEBRAE** | Sempre em maiúsculas. Respeita a marca-mãe. |
| **SEBRAE Goiás** | "SEBRAE" maiúsculo + "Goiás" capitalizado (não "SEBRAE GOIÁS" nem "sebrae goiás") |
| **Check-in** | Hífen entre check e in. **Sempre minúsculo** (não "Check-in" no meio de frase) |
| **Tier** | Em inglês mesmo, é o termo universal. Não traduz pra "nível" |
| **Engajamento** | Sempre minúsculo, sem aspas |
| **Post** | Minúsculo, sem aspas. Plural "posts" |
| **Colaborador** | Nunca "funcionário" — somos todos colaboradores do SEBRAE |

---

## Checklist de revisão de copy

Antes de aprovar qualquer texto que vai pro app, passa por aqui:

- [ ] Tem o nome do usuário quando possível?
- [ ] Tem no máximo um ponto de exclamação por bloco?
- [ ] Evita ser protagonista — usuário é quem age?
- [ ] Linguagem inclusiva? ("quem" em vez de "os usuários")
- [ ] É como a gente fala? (testa lendo em voz alta)
- [ ] Curto e direto? (remove palavras que não carregam sentido)
- [ ] Tem personalidade sem infantilizar?
- [ ] CTA começa com verbo no imperativo? ("Curtir", "Compartilhar", "Salvar")
- [ ] Estado de erro tem texto claro + ação de recuperação?

---

**Próximo:** [06-components.md](./06-components.md) — botões, cards, badges, ranking.
