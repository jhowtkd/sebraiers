<!-- generated-by: gsd-doc-writer -->

# Getting Started

Guia para instalar, configurar e rodar o SEBRAEIERS localmente pela primeira vez, do clone ao servidor de desenvolvimento respondendo em `http://localhost:3000`.

## Prerequisites

Antes de começar, instale no seu ambiente:

| Ferramenta | Versão / requisito | Uso |
|------------|-------------------|-----|
| **Node.js** | `>= 20` | Runtime do Next.js 15 e do `@opennextjs/cloudflare`. Em produção, o Worker roda em Cloudflare com `nodejs_compat`. |
| **pnpm** | Qualquer versão recente | Gerenciador de pacotes (lockfile `pnpm-lock.yaml` presente). |
| **Docker** | Docker Desktop ou Docker Engine em execução | Necessário para o Supabase local (`pnpm dlx supabase start`). |
| **Git** | Qualquer versão recente | Clonar o repositório. |

Opcional (apenas se for fazer preview/deploy no Cloudflare):

- Conta Cloudflare e CLI **Wrangler** (já incluída como `devDependency` em `package.json`, em `wrangler` ^4.103.0).
- R2 bucket chamado `sebraiers-opennext-cache` se for exercitar o cache incremental via OpenNext.

Não existe arquivo `.nvmrc` nem campo `engines` em `package.json`; use Node 20 ou superior.

## Installation steps

1. **Clone o repositório**

   ```bash
   git clone https://github.com/jhowtkd/sebraiers.git
   cd sebraiers
   ```

2. **Instale as dependências**

   ```bash
   pnpm install
   ```

3. **Suba o Supabase local com Docker**

   ```bash
   pnpm dlx supabase start
   ```

   Anote a **Project URL**, a chave **anon** e a chave **service_role** que o CLI imprime. Em ambiente local, a URL costuma ser `http://127.0.0.1:54321`.

4. **Aplique as migrations e o seed**

   ```bash
   pnpm dlx supabase db reset
   ```

   As migrations ficam em `supabase/migrations/` e o seed em `supabase/seed.sql` (com `supabase/seed-demo.sql` opcional para dados de demonstração).

5. **Crie o arquivo de ambiente**

   ```bash
   cp .env.example .env.local
   ```

6. **Preencha `.env.local`** com os valores do passo 3:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

   Se você pretende testar o sync automático a partir de uma planilha Google, preencha também `SHEET_ID`, `SHEET_GID` (default `0`) e `CRON_SECRET` (gere um valor com `openssl rand -hex 32`). Detalhes em [CONFIGURATION.md](./CONFIGURATION.md).

## First run

Com `.env.local` apontando para o Supabase local:

```bash
pnpm dev
```

Acesse `http://localhost:3000`. O middleware (`middleware.ts`) redireciona visitantes para `/login`; usuários autenticados vão para `/timeline`.

### Crie sua primeira conta e o primeiro admin

1. Abra `/signup` e cadastre-se.
2. **Promoção automática a admin:** qualquer e-mail terminado em `@conteudoedu.com.br` recebe `is_admin = true` automaticamente (regra `public.is_agency_admin_email`, migration `0009_agency_admin_domain.sql`). Se você não está usando um e-mail desse domínio, insira o seu e-mail em `public.admin_whitelist` via SQL antes do signup, ou defina `profiles.is_admin = true` manualmente após criar a conta.
3. Após autenticar, o painel `/admin` fica disponível para usuários promovidos.

### (Opcional) Smoke test do sync Google Sheets

Com `SHEET_ID` e `CRON_SECRET` configurados:

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "x-cron-secret: $CRON_SECRET"
```

Em produção no Cloudflare, o cron `0 */6 * * *` (definido em `wrangler.jsonc` e despachado por `cloudflare/worker.mjs`) dispara o mesmo endpoint automaticamente a cada 6 horas, chamando o próprio Worker via binding `WORKER_SELF_REFERENCE`.

## Common setup issues

### `supabase start` falha ou não conecta

- **Causa:** Docker não está rodando, ou as portas 54321–54322 estão ocupadas por outra instância.
- **Solução:** Inicie o Docker Desktop/Engine e execute `pnpm dlx supabase stop` antes de tentar de novo. Em macOS, confirme que o daemon Docker está de pé (`docker info`).

### Auth ou queries Supabase retornam erro de conexão

- **Causa:** `.env.local` ainda aponta para um projeto Supabase remoto ou para chaves incorretas.
- **Solução:** Copie a URL e as chaves do output de `pnpm dlx supabase start` para `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. Reinicie `pnpm dev` depois de editar o arquivo (Next.js só recarrega `.env.local` no boot do servidor).

### Conta criada, mas `/admin` redireciona para `/timeline`

- **Causa:** o JWT da sessão não tem a claim `app_metadata.is_admin = true`. Pode acontecer se você cadastrou a conta antes de configurar a whitelist ou se o e-mail não bate com `@conteudoedu.com.br`.
- **Solução:** adicione o e-mail em `public.admin_whitelist`, faça `UPDATE public.profiles SET is_admin = true WHERE email = 'seu-email@…'`, e force um novo login (logout/login) para que o trigger `sync_admin_jwt_claim` regrave o JWT. Detalhes em [ARCHITECTURE.md](./ARCHITECTURE.md).

### Porta 3000 já em uso

- **Causa:** outro processo ocupa a porta padrão do Next.js.
- **Solução:** encerre o processo conflitante ou rode `pnpm dev -- -p 3001` e acesse `http://localhost:3001`.

### Tipos do Cloudflare desatualizados após mexer no `wrangler.jsonc`

- **Causa:** novos bindings (`ASSETS`, `IMAGES`, `WORKER_SELF_REFERENCE`, R2, etc.) precisam de um arquivo de tipos gerado.
- **Solução:** rode `pnpm cf-typegen` para regenerar `cloudflare-env.d.ts` (arquivo gerado a partir de `wrangler.jsonc`; ele não está versionado no repositório).

## Next steps

Depois do primeiro run bem-sucedido, siga para a documentação por área:

- **[README.md](../README.md)** — visão geral, comandos úteis (`pnpm dev`, `pnpm build`, `pnpm test`, `pnpm deploy`) e funcionalidades.
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — diagrama de componentes, fluxo de dados, abstrações-chave e topologia de deploy.
- **[CONFIGURATION.md](./CONFIGURATION.md)** — variáveis de ambiente, `wrangler.jsonc`, sync com Google Sheets e bootstrap de admins.
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** — setup local profundo, comandos de build e estilo de código.
- **[TESTING.md](./TESTING.md)** — como rodar e escrever testes com Vitest + Testing Library.
- **[API.md](./API.md)** — endpoint interno `/api/sync` e fluxos relacionados a server actions.
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — pipeline de deploy no Cloudflare Workers via OpenNext.
