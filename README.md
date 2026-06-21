# SEBRAEIERS

Plataforma gamificada interna do SEBRAE Goiás para engajamento de colaboradores nas redes sociais oficiais.

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS 3.4 (tokens em `tailwind.config.ts`)
- Supabase (Postgres + Auth + Storage + RLS)
- Zod + React Hook Form
- Vitest + @testing-library/react

## Setup local

### 1. Variáveis de ambiente
Copie `.env.example` para `.env.local` e preencha:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_EMAILS=seu-email@sebrae.com.br
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Subir Supabase
```bash
pnpm install
pnpm dlx supabase start
pnpm dlx supabase db reset   # aplica migrations + seed
```

### 3. Criar primeiro admin
- Insira seu email em `public.admin_whitelist` (via SQL editor do Supabase) **OU** coloque em `ADMIN_EMAILS` no `.env.local`.
- Crie conta via `/signup` — o `admin_email_hint` no server action vai setar `is_admin=true` automaticamente.

### 4. Rodar dev
```bash
pnpm dev
```
Acesse http://localhost:3000.

## Funcionalidades
- [x] Auth email+senha (Supabase) com provisionamento server-side de admins
- [x] Onboarding de perfis sociais (handles por rede)
- [x] Timeline de publicações com filtro por rede
- [x] Detalhe de publicação com check-in (Curti/Comentei/Compartilhei)
- [x] Ranking com pódio 🥇🥈🥉 e posição do usuário
- [x] Meu desempenho: pontos, status, histórico
- [x] Painel admin: métricas, top 5, engajamento por rede
- [x] Admin: CRUD de posts com upload de capa
- [x] Admin: aprovação/rejeição de check-ins
- [x] Admin: gestão de usuários com trava de último admin
- [x] RLS + triggers de segurança (colunas is_admin/is_active, JWT sync, login inativo)

## Comandos

```bash
pnpm dev          # dev server
pnpm build        # build de produção
pnpm typecheck    # tsc --noEmit
pnpm lint         # next lint
pnpm test         # vitest
```

## Recomendações antes de produção
- [ ] Configurar Supabase Auth: confirmação de email obrigatória
- [ ] Configurar Supabase rate limits
- [ ] Habilitar Vercel WAF
- [ ] Política de retenção de imagens no Storage (cleanup de capas órfãs)
- [ ] Monitoramento de erros (Sentry)
- [ ] Notificação por email ao admin quando há check-ins pendentes (fora do escopo v1)
- [ ] Auditoria: revisar `trg_sync_admin_jwt_claim` e `trg_block_inactive_login` na versão atual do Supabase Auth (assinatura de trigger pode mudar entre versões)
- [ ] Backup automático do banco
