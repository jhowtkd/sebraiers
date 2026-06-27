<!-- generated-by: gsd-doc-writer -->

# SEBRAEIERS

Plataforma gamificada interna do SEBRAE Goiás para engajamento de colaboradores nas redes sociais oficiais.

![Version](https://img.shields.io/badge/version-1.0.0-blue)

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS 3.4
- Supabase (Postgres, Auth, Storage, RLS)
- Zod + React Hook Form
- Vitest + Testing Library
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
3. Suba o Supabase local e aplique migrations:

   ```bash
   pnpm dlx supabase start
   pnpm dlx supabase db reset
   ```

4. Inicie o servidor de desenvolvimento:

   ```bash
   pnpm dev
   ```

   Acesse http://localhost:3000 — usuários autenticados vão para `/timeline`; visitantes são redirecionados para `/login`.

### Primeiro admin (agência)

Crie a conta em `/signup` com um email `@conteudoedu.com.br`. O provisionamento server-side define `is_admin=true` automaticamente.

## Usage examples

### Desenvolvimento e qualidade

```bash
pnpm dev          # servidor de desenvolvimento (porta 3000)
pnpm build        # build de produção
pnpm test         # suite Vitest
pnpm typecheck    # verificação TypeScript
pnpm lint         # ESLint (next lint)
```

### Preview e deploy no Cloudflare

```bash
pnpm preview      # build OpenNext + preview local via Wrangler
pnpm deploy       # build OpenNext + deploy para Cloudflare Workers
```

Configure os secrets do Worker (por exemplo `CRON_SECRET`, variáveis Supabase) no painel Cloudflare ou via `wrangler secret put`. <!-- VERIFY: URL de produção no Cloudflare Workers -->

### Sync manual de planilha Google

Com `SHEET_ID` e `CRON_SECRET` configurados:

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "x-cron-secret: $CRON_SECRET"
```

Em produção no Cloudflare, o cron `0 */6 * * *` dispara o sync automaticamente via `cloudflare/worker.mjs`.

## Funcionalidades

- Auth e-mail/senha (Supabase) com provisionamento server-side de admins
- Onboarding de perfis sociais (handles por rede)
- Timeline de publicações com filtro por rede
- Detalhe de publicação com check-in (Curti / Comentei / Compartilhei)
- Ranking com pódio e posição do usuário
- Meu desempenho: pontos, status e histórico
- Painel admin: métricas, top 5, engajamento por rede
- Admin: CRUD de posts com upload de capa
- Admin: aprovação/rejeição de check-ins
- Admin: gestão de usuários com trava de último admin
- Sync de posts a partir de Google Sheets (`/api/sync`)
- RLS e triggers de segurança no Postgres

## Estrutura do projeto

```
app/              # App Router — rotas, layouts, server actions, API
lib/              # Supabase clients, sync, utilitários
supabase/         # Migrations, seed e config local
cloudflare/       # Worker entry (cron de sync)
tests/            # Testes Vitest
wrangler.jsonc    # Configuração Cloudflare Workers
```

## Documentação adicional

Consulte os arquivos em `docs/` (quando disponíveis) para arquitetura, desenvolvimento, testes, API, configuração e deploy.
