# SEBRAEIERS — Design Spec

**Data:** 2026-06-21
**Versão:** 1.0
**Status:** Em implementação

> **Brandbook:** todos os tokens visuais, paleta, tipografia, componentes, tom de voz e regras de acessibilidade estão definidos em [`../../brand/`](../../brand/) (Brandbook SEBRAEIERS v1.0). Este spec é o **design funcional** (stack, modelo de dados, fluxos) — o brandbook é a fonte da verdade visual.

## 1. Resumo

**SEBRAEIERS** é uma plataforma gamificada para colaboradores do SEBRAE Goiás engajarem com as redes sociais oficiais da instituição. Colaboradores visualizam publicações, declaram ações de engajamento (curtir/comentar/compartilhar) que são validadas manualmente pelo administrador, acumulam pontos e disputam um ranking interno. O app é uma camada de **gestão e motivação**, sem nunca automatizar interações nas redes sociais — o colaborador é sempre direcionado ao post original.

## 2. Decisões travadas (após brainstorming)

| Decisão | Escolha | Motivo |
|---|---|---|
| Método de autenticação | Email + senha (Supabase Auth) | Funciona offline no dev, sem provider OAuth pra configurar, fluxo de teste direto |
| Provisionamento de admins | Lista de emails via env var `ADMIN_EMAILS` (CSV) | Seguro, flexível, declarativo — sem SQL manual nem race condition de "primeiro user" |
| Critério de desempate no ranking | Última ação aprovada mais recente (`max(approved_at)`) | Incentiva constância; quem engajou por último fica acima |

## 3. Stack escolhida

- **Next.js 14 (App Router) + TypeScript** — SSR/SSG/CSR no mesmo projeto, roteamento por arquivos, server components para reduzir JS no cliente, server actions para mutações.
- **Tailwind CSS** — design system utilitário, rápida iteração visual, suporte nativo a dark mode.
- **Supabase** — Postgres gerenciado + Auth + Storage + Row Level Security num único BaaS. Resolve autenticação, banco, storage de imagens e regras de acesso sem backend custom.
- **shadcn/ui + lucide-react** — componentes acessíveis e copiáveis (não viram dependência rígida), ícones limpos.
- **Zod** — validação de inputs em todas as fronteiras (server actions, server components, formulários).
- **React Hook Form** — formulários performáticos com validação client-side espelhada no servidor.
- **@supabase/ssr** — cliente Supabase para Next.js App Router (cookies, server components, server actions).
- **Vercel** — deploy com zero-config para Next.js.

## 4. Arquitetura geral

```
┌──────────────────────────────────────────────────────┐
│ Next.js App Router (Vercel)                          │
│  ├── app/(auth)/login            ← público           │
│  ├── app/(auth)/signup           ← público           │
│  ├── app/(onboarding)/perfil     ← logado            │
│  ├── app/(app)/timeline          ← logado            │
│  ├── app/(app)/post/[id]         ← logado            │
│  ├── app/(app)/ranking           ← logado            │
│  ├── app/(app)/meu-desempenho    ← logado            │
│  ├── app/(admin)/admin/...       ← admin             │
│  └── api/                        ← sem rotas próprias│
│                                                       │
│  Server Components = leitura (fetch direto no Supabase)│
│  Server Actions   = mutação (com Zod + RLS)           │
│  Client Components= interatividade (forms, filtros,  │
│                     modal de check-in)                │
└──────────────────────────────────────────────────────┘
              │
              │ @supabase/ssr (cookies httpOnly)
              ▼
┌──────────────────────────────────────────────────────┐
│ Supabase (Postgres + Auth + Storage + RLS)           │
│  ├── auth.users                   ← Supabase Auth     │
│  ├── public.profiles              ← 1:1 com auth.user │
│  ├── public.user_socials          ← perfis sociais    │
│  ├── public.posts                 ← publicações       │
│  ├── public.checkins              ← ações declaradas  │
│  ├── public.checkin_approvals     ← log de aprovação  │
│  ├── public.user_points           ← view materializada│
│  │                                  de pontos totais  │
│  └── storage.post-covers          ← bucket público    │
└──────────────────────────────────────────────────────┘
```

**Princípios arquiteturais:**

1. **Server-first**: leitura via Server Components, mutação via Server Actions. Cliente só pra interatividade.
2. **RLS como contrato de segurança**: o Postgres recusa tudo que o usuário não tem direito; nada de checagem só no client.
3. **Tipos compartilhados**: `Database` type gerado do Supabase fica em `types/database.ts` e é a fonte da verdade.
4. **Sem scraping, sem OAuth de redes**: o app não toca nas contas dos colaboradores.

## 5. Modelo de dados

Todas as tabelas em `public.*`. RLS habilitado em 100% delas.

### 5.1 `profiles` (1:1 com `auth.users`)
```sql
id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
full_name       text NOT NULL CHECK (length(full_name) BETWEEN 2 AND 120)
username        text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_.]{3,30}$')
is_admin        boolean NOT NULL DEFAULT false
is_active       boolean NOT NULL DEFAULT true
avatar_url      text
created_at      timestamptz NOT NULL DEFAULT now()
```

### 5.2 `user_socials` (1:1 com `profiles`)
```sql
user_id         uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE
instagram       text  -- armazenado como @usuario (sem URL)
linkedin        text
facebook        text
tiktok          text
youtube         text
threads         text
updated_at      timestamptz NOT NULL DEFAULT now()
```

### 5.3 `posts` (publicações do SEBRAE Goiás)
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
title           text NOT NULL CHECK (length(title) BETWEEN 3 AND 200)
description     text
network         text NOT NULL CHECK (network IN
                  ('instagram','linkedin','facebook','tiktok','youtube','threads'))
original_url    text NOT NULL  -- URL do post original
cover_url       text           -- URL pública no Storage
published_at    timestamptz NOT NULL
created_by      uuid NOT NULL REFERENCES profiles(id)
is_active       boolean NOT NULL DEFAULT true
created_at      timestamptz NOT NULL DEFAULT now()
updated_at      timestamptz NOT NULL DEFAULT now()
```

### 5.4 `checkins` (ações autodeclaradas)
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
post_id         uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE
action          text NOT NULL CHECK (action IN ('like','comment','share'))
status          text NOT NULL DEFAULT 'pending' CHECK (status IN
                  ('pending','approved','rejected'))
points          integer NOT NULL  -- 1, 2 ou 3 conforme action
declared_at     timestamptz NOT NULL DEFAULT now()
decided_at      timestamptz
decided_by      uuid REFERENCES profiles(id)
admin_note      text
```
- **Constraint UNIQUE** `(user_id, post_id, action)` — usuário não pode declarar a mesma ação no mesmo post duas vezes.
- Trigger atualiza `points` automaticamente a partir de `action` no INSERT.

### 5.5 `checkin_approvals` (log imutável)
```sql
id              bigserial PRIMARY KEY
checkin_id      uuid NOT NULL REFERENCES checkins(id) ON DELETE CASCADE
admin_id        uuid NOT NULL REFERENCES profiles(id)
decision        text NOT NULL CHECK (decision IN ('approved','rejected'))
note            text
created_at      timestamptz NOT NULL DEFAULT now()
```

### 5.6 View `user_points` (comum, não materializada)
```sql
SELECT
  c.user_id,
  SUM(c.points) AS total_points,
  COUNT(*)      AS approved_checkins,
  MAX(c.decided_at) AS last_approved_at
FROM checkins c
WHERE c.status = 'approved'
GROUP BY c.user_id
```
View comum (recalculada a cada query). Para volume baixo de checkins, isso é suficiente. Se virar gargalo, migrar para materializada com `REFRESH MATERIALIZED VIEW CONCURRENTLY` em trigger.

### 5.7 RLS — resumo das políticas

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | qualquer logado | próprio user | próprio user (sem `is_admin`/`is_active`) | — |
| user_socials | próprio + admin | próprio | próprio | — |
| posts | qualquer logado (ativo) / admin (tudo) | admin | admin | admin |
| checkins | próprio + admin | próprio (status='pending') | admin (status) | — |
| checkin_approvals | admin | admin | — | — |

**Proteção de colunas `is_admin` / `is_active` em `profiles`:**
- A policy `profiles_update_self` precisa ter `with check` que rejeite tentativas de alterar essas colunas. A forma idiomática no Postgres é uma `BEFORE UPDATE` trigger que valida `OLD.is_admin = NEW.is_admin` e `OLD.is_active = NEW.is_active` para usuários não-admin, ou comparar `auth.jwt() ->> 'is_admin'`. **Gap a corrigir na migration v2**: adicionar trigger `protect_admin_fields` ou usar `with check` que exige `(SELECT is_admin FROM profiles WHERE id = auth.uid()) = is_admin`.

**Mecanismo de `is_admin` (provisão):**
- No signup, o **servidor Next** (server action) valida se o email está em `ADMIN_EMAILS` (env var CSV) **antes** de chamar `supabase.auth.signUp()`. Se sim, passa `options.data.admin_email_hint = email` no payload (o cliente não pode forjar isso se a chamada for server-side).
- No banco, o trigger `handle_new_user` lê `raw_user_meta_data->>'admin_email_hint'` e, se bater com `new.email`, marca `is_admin=true`. **Belt-and-suspenders**: também existe tabela `admin_whitelist` (editável via SQL) como fallback.
- Claims do JWT (`auth.jwt() ->> 'is_admin'`) são lidos pelas RLS policies e mantidos em sincronia via trigger em `UPDATE profiles` (a definir na migration v2).

**Gap funcional — trava de "último admin":**
- Spec §6.6 exige "não rebaixar o último admin". Não há trigger/função que enforce isso. **A resolver no plano**: criar trigger `prevent_last_admin_demote` que faz `RAISE EXCEPTION` se a operação resultaria em zero admins ativos.

## 6. Fluxos principais

### 6.1 Signup → Onboarding → Timeline
1. Usuário acessa `/signup`, preenche nome, email, senha, username.
2. Supabase Auth cria `auth.users`. Trigger SQL insere `profiles` (com `is_admin = email IN (...)`).
3. Redirect para `/perfil` (onboarding) → usuário informa handles de redes sociais (opcional por rede).
4. Redirect para `/timeline` → primeira tela logada.

### 6.2 Check-in de ação
1. Usuário clica em "Curti" / "Comentei" / "Compartilhei" no card do post (ou no detalhe).
2. Server action `declareCheckin({postId, action})` valida com Zod, verifica se já existe `checkin` aprovado/pendente para mesma `(user, post, action)`, insere com `status='pending'` e `points` derivado.
3. Toast: "Aguardando aprovação do administrador."
4. A ação **não soma pontos** ainda. Aparece em "Meu desempenho" com status pendente.

### 6.3 Aprovação pelo admin
1. Admin acessa `/admin/checkins` (filtro default: pendentes).
2. Clica em "Aprovar" ou "Rejeitar" (com nota opcional).
3. Server action `decideCheckin({id, decision, note})` valida admin (RLS + server check), atualiza `checkins`, insere `checkin_approvals`, refresh de `user_points`.
4. Trigger notifica o usuário (futuro: in-app notification; v1: usuário vê ao logar).

### 6.4 Ranking
1. View `user_points` ordenada por `total_points DESC, last_approved_at DESC`.
2. Página `/ranking` exibe top 50 + posição do usuário logado.

### 6.5 Admin: CRUD de posts
1. `/admin/posts` lista posts (com filtro por rede, ativo/inativo).
2. Botão "Novo post" abre form: título, descrição, rede, URL, data publicação, upload de capa (Storage).
3. Edição/remoção via actions server-side.

### 6.6 Admin: gestão de usuários
1. `/admin/users` lista com busca.
2. Admin pode ativar/desativar (`is_active=false` → usuário não consegue logar: RLS bloqueia SELECT em `profiles`, e trigger de auth checa `is_active`).
3. Admin pode promover/rebaixar `is_admin` (com cautela: não pode rebaixar o último admin).

## 7. Pontuação

| Ação | Pontos |
|---|---|
| Curtida (`like`) | 1 |
| Comentário (`comment`) | 2 |
| Compartilhamento (`share`) | 3 |

- Pontos entram no ranking **apenas** com `status='approved'`.
- Ranking ordenado: `total_points DESC, last_approved_at DESC, username ASC` (desempate terciário alfabético — estável e justo).

## 8. Redes sociais suportadas

`instagram`, `linkedin`, `facebook`, `tiktok`, `youtube`, `threads`. Cada `post.network` é uma dessas; cada `user_socials.*` armazena o **handle** (ex: `@sebraego`) — não a URL completa. O app concatena a URL pública ao montar o link de destino.

**Mapeamento rede → URL base:**

| Rede | Handle armazenado | URL construída |
|---|---|---|
| instagram | `sebraego` | `https://instagram.com/sebraego` |
| linkedin | `sebrae-goias` | `https://linkedin.com/company/sebrae-goias` |
| facebook | `sebraego` | `https://facebook.com/sebraego` |
| tiktok | `sebraego` | `https://tiktok.com/@sebraego` |
| youtube | `UCxxxx...` | `https://youtube.com/@sebraego` |
| threads | `sebraego` | `https://threads.net/@sebraego` |

Para `posts.original_url` (URL do post específico), o admin cola a URL completa — sem normalização.

## 9. Telas

| Rota | Quem | Descrição |
|---|---|---|
| `/login` | público | Email + senha + link pra signup |
| `/signup` | público | Nome + email + senha + username |
| `/perfil` | logado | Onboarding/edição dos perfis sociais |
| `/timeline` | logado | Feed de posts, filtro por rede, card clicável |
| `/post/[id]` | logado | Detalhe do post + botões de check-in |
| `/ranking` | logado | Top 50 + posição do usuário |
| `/meu-desempenho` | logado | Pontos, gráfico de evolução, histórico de check-ins com status |
| `/admin` | admin | Dashboard com métricas (cards + gráficos simples) |
| `/admin/posts` | admin | CRUD de publicações |
| `/admin/checkins` | admin | Aprovação/rejeição de check-ins |
| `/admin/users` | admin | Lista/bloqueio de usuários |

## 10. Estados transversais

Toda tela trata: **loading** (skeleton), **vazio** (empty state com CTA), **erro** (mensagem + retry), **sem permissão** (redirect ao login). Nenhuma tela assume dados existentes.

## 11. Visual & UX

- **Marca:** wordmark "SEBRAEIERS" no header (SVG inline, com ".iers" em destaque verde).
- **Paleta:**
  - Primary: `#0A2540` (navy institucional)
  - Accent: `#00B86B` (verde SEBRAE)
  - Highlight: `#FFB800` (ouro — pódio)
  - Surface: `#F5F7FA` / dark `#0E1320`
- **Tipografia:** Inter (sans-serif moderna), tabular nums pra pontos.
- **Componentes:** cards com sombra suave, bordas arredondadas (`rounded-2xl`), ícones de redes (lucide), badges de status (cores semânticas).
- **Gamificação discreta:** pódio (🥇🥈🥉) no top 3, pontos exibidos em destaque com tabular nums. Sistema de níveis/tiers (Bronze/Prata/Ouro/Platina/Diamante) está fora do escopo v1 — apenas pontuação numérica.
- **Responsivo:** mobile-first, layout em coluna no celular, grid 2-3 colunas no desktop.

## 12. Variáveis de ambiente

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # apenas server-side
ADMIN_EMAILS=admin@sebrae.com.br,gestor@sebrae.com.br
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 13. Como rodar localmente

```bash
pnpm install
pnpm run dev      # http://localhost:3000

# 1. Subir Supabase local (Docker)
pnpm dlx supabase start

# 2. Rodar migrations + seed
pnpm dlx supabase db reset

# 3. Adicionar .env.local com as variáveis acima
cp .env.example .env.local
# editar ADMIN_EMAILS com seu email pra virar admin
```

## 14. Segurança

- Senhas: Supabase Auth (bcrypt, salted).
- Senhas de redes sociais: **nunca solicitadas, nunca armazenadas**.
- Credenciais Supabase: `anon key` é pública (RLS protege), `service_role` fica só no servidor.
- Validação: Zod em todo server action; CHECK constraints no banco; sanitização de inputs (`xss` via React default escape).
- Upload de imagens: bucket público com limite 5MB, mime-type whitelist (`image/png`, `image/jpeg`, `image/webp`).
- Rate limit (futuro): Vercel WAF + Supabase rate limits.

## 15. Limites do escopo v1 (YAGNI explícito)

Fora do escopo da primeira entrega:
- Notificações push/email ao ser aprovado/rejeitado.
- Sistema de níveis/badges (apenas pontuação numérica).
- Exportar ranking em CSV.
- Autenticação via Google/Microsoft.
- Multi-tenant (outras unidades SEBRAE).
- Moderação de comentários (assume que admin confere manualmente).
- App mobile nativo.

## 16. Critérios de sucesso (auto-check)

- [ ] Usuário comum: cadastra → vê posts → clica no link → declara ação → status "pendente" → após aprovação vê pontos no ranking.
- [ ] Admin: cadastra post → vê check-in pendente → aprova → pontos do usuário aparecem no ranking.
- [ ] Ranking reflete **apenas** ações aprovadas (verificado por SQL).
- [ ] Layout responsivo em 375px, 768px, 1280px.
- [ ] `pnpm run build` sem erros, `pnpm run lint` sem warnings críticos.
- [ ] README com setup + env vars + lista de features.

## 17. Estrutura de pastas (proposta)

```
Sebraiers/
├── README.md
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── .env.example
├── .gitignore
├── docs/
│   └── superpowers/specs/2026-06-21-sebraeiers-design.md
├── supabase/
│   ├── migrations/0001_init.sql
│   └── seed.sql
├── public/
│   ├── logo.svg
│   └── og.png
├── types/
│   └── database.ts          # gerado a partir do Supabase
├── lib/
│   ├── supabase/
│   │   ├── server.ts        # cliente server (cookies)
│   │   ├── client.ts        # cliente browser
│   │   └── admin.ts         # service role
│   ├── auth/
│   │   ├── session.ts       # getCurrentUser, requireAdmin
│   │   └── admin.ts         # ADMIN_EMAILS parsing
│   ├── validation/
│   │   └── schemas.ts       # Zod schemas
│   └── constants.ts         # redes, ações, pontos
├── components/
│   ├── ui/                  # shadcn-style (button, card, badge, ...)
│   ├── layout/
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   └── nav.tsx
│   ├── posts/
│   │   ├── post-card.tsx
│   │   ├── post-filters.tsx
│   │   └── checkin-actions.tsx
│   ├── ranking/
│   │   └── ranking-table.tsx
│   └── admin/
│       ├── metrics-cards.tsx
│       ├── checkin-row.tsx
│       └── post-form.tsx
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (onboarding)/
│   │   └── perfil/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx       # header + container logado
│   │   ├── timeline/page.tsx
│   │   ├── post/[id]/page.tsx
│   │   ├── ranking/page.tsx
│   │   └── meu-desempenho/page.tsx
│   ├── (admin)/
│   │   └── admin/
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── posts/page.tsx
│   │       ├── posts/new/page.tsx
│   │       ├── posts/[id]/edit/page.tsx
│   │       ├── checkins/page.tsx
│   │       └── users/page.tsx
│   ├── actions/             # server actions agrupadas
│   │   ├── auth.ts
│   │   ├── posts.ts
│   │   ├── checkins.ts
│   │   └── users.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx             # landing → redirect pra /login ou /timeline
└── middleware.ts            # proteção de rotas /admin, /perfil
```

## 18. Plano de execução

1. Scaffold Next.js + Tailwind + TS + shadcn básico.
2. Configurar Supabase local + migrations SQL + RLS + seed.
3. Auth (signup/login) + middleware de proteção de rotas.
4. Onboarding de perfis sociais.
5. Timeline + filtros + detalhe + check-in (3 botões).
6. Ranking + meu desempenho.
7. Painel admin (dashboard + posts + checkins + users).
8. Visual polish + estados vazios/loading/erro + responsivo.
9. README + .env.example + checklist de produção.