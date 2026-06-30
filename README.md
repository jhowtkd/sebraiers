<!-- generated-by: gsd-doc-writer -->

# SEBRAEIERS

Plataforma gamificada interna do SEBRAE Goiás para engajamento de colaboradores nas redes sociais oficiais.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Private](https://img.shields.io/badge/private-true-lightgrey)

## Stack

- Next.js 15 (App Router) + React 18 + TypeScript 5
- Tailwind CSS 3.4 com tokens próprios (`app/tokens.css`)
- Supabase (Postgres, Auth, Storage e RLS)
- Zod + React Hook Form para validação e formulários
- Papa Parse para parsing CSV/sheets
- Vitest + Testing Library + happy-dom para testes
- OpenNext on Cloudflare Workers (`wrangler.jsonc`, `cloudflare/worker.mjs`)

## Installation

```bash
git clone https://github.com/jhowtkd/sebraiers.git
cd sebraiers
pnpm install
```

Copie `.env.example` para `.env.local` e preencha as variáveis (Supabase, admin bootstrap e, se usar sync, Google Sheets).

## Quick start

1. Instale dependências: `pnpm install`
2. Configure `.env.local` a partir de `.env.example`
3. Suba o Supabase local e aplique migrations + seed:

   ```bash
   pnpm dlx supabase start
   pnpm dlx supabase db reset
   ```

4. Inicie o servidor de desenvolvimento:

   ```bash
   pnpm dev
   ```

   Acesse `http://localhost:3000` — usuários autenticados vão para `/timeline`; visitantes são redirecionados para `/login`.

### Primeiro admin (agência)

Crie a conta em `/signup` com um email `@conteudoedu.com.br`. O provisionamento server-side define `is_admin=true` automaticamente.

## Usage examples

### Desenvolvimento e qualidade

```bash
pnpm dev          # servidor de desenvolvimento (porta 3000)
pnpm build        # build de produção
pnpm start        # inicia o build de produção localmente
pnpm test         # suite Vitest
pnpm test:watch   # Vitest em modo watch
pnpm test:ui      # Vitest UI
pnpm typecheck    # verificação TypeScript (tsc --noEmit)
pnpm lint         # ESLint (next lint)
```

### Preview e deploy no Cloudflare

```bash
pnpm preview      # build OpenNext + preview local via Wrangler
pnpm upload       # build OpenNext + upload do bundle
pnpm deploy       # build OpenNext + deploy para Cloudflare Workers
```

Configure os secrets do Worker (`CRON_SECRET`, variáveis Supabase) no painel Cloudflare ou via `wrangler secret put`. `pnpm cf-typegen` gera o tipo `cloudflare-env.d.ts` para bindings. <!-- VERIFY: URL de produção do Worker no Cloudflare -->

### Sync manual de planilha Google

Com `SHEET_ID` e `CRON_SECRET` configurados:

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "x-cron-secret: $CRON_SECRET"
```

Em produção no Cloudflare, o cron `0 */6 * * *` (configurado em `wrangler.jsonc` e despachado por `cloudflare/worker.mjs`) dispara o sync automaticamente a cada 6 horas, chamando o próprio Worker via binding `WORKER_SELF_REFERENCE`.

## Funcionalidades

- Auth e-mail/senha (Supabase) com provisionamento server-side de admins
- Onboarding de perfis sociais (handles por rede)
- Timeline de publicações com filtro por rede
- Detalhe de publicação com check-in (Curti / Comentei / Compartilhei)
- Ranking com pódio e posição do usuário
- Meu desempenho: pontos, status e histórico
- Painel admin: métricas, top 5, engajamento por rede
- Admin: CRUD de posts com upload de capa (Supabase Storage)
- Admin: aprovação/rejeição de check-ins
- Admin: gestão de usuários com trava de último admin
- Sync de posts a partir de Google Sheets (`/api/sync`) com auth via header `x-cron-secret`
- RLS e triggers de segurança no Postgres
- Cron job agendado no Cloudflare Workers para sync automática

## Estrutura do projeto

```
app/              # App Router — rotas (admin)/(app)/(auth)/onboarding, server actions, api/
lib/              # Supabase clients, sync, ranking, validation, social handles, types
supabase/         # Migrations, seed.sql, seed-demo.sql e config.toml
cloudflare/       # Worker entry (openNextWorker + cron handler)
components/       # Componentes compartilhados (admin, checkin, forms, layout, posts, ranking, social, ui)
tests/            # Vitest + Testing Library
middleware.ts     # Refresh de sessão Supabase
public/           # Assets estáticos
wrangler.jsonc    # Configuração Cloudflare Workers
next.config.mjs   # remotePatterns para imagens Supabase e Unsplash
```

## Documentação adicional

- `docs/ARCHITECTURE.md` — visão geral do sistema e componentes
- `docs/GETTING-STARTED.md` — pré-requisitos e primeiros passos
- `docs/DEVELOPMENT.md` — setup local, build e comandos
- `docs/TESTING.md` — como rodar e escrever testes
- `docs/API.md` — endpoints internos (ex.: `/api/sync`)
- `docs/CONFIGURATION.md` — variáveis de ambiente e bindings
- `docs/DEPLOYMENT.md` — pipeline de deploy no Cloudflare
- `docs/brand/` — sistema de design (logo, cores, tipografia, voz, componentes)
