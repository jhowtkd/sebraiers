<!-- generated-by: gsd-doc-writer -->

# Getting Started

Guia para instalar, configurar e rodar o SEBRAEIERS localmente pela primeira vez.

## Prerequisites

Antes de começar, instale:

| Ferramenta | Versão / requisito | Uso |
|------------|-------------------|-----|
| **Node.js** | >= 20 | Runtime do Next.js (`@types/node` ^20) |
| **pnpm** | Qualquer versão recente | Gerenciador de pacotes (lockfile `pnpm-lock.yaml`) |
| **Docker** | Docker Desktop ou Docker Engine em execução | Supabase local (`supabase start`) |
| **Git** | Qualquer versão recente | Clonar o repositório |

Opcional (apenas para preview/deploy no Cloudflare):

- Conta Cloudflare e CLI **Wrangler** (já incluída como `devDependency`)

Não há arquivo `.nvmrc` nem campo `engines` em `package.json`; use Node 20 ou superior.

## Installation steps

1. Clone o repositório:

   ```bash
   git clone https://github.com/jhowtkd/sebraiers.git
   cd sebraiers
   ```

2. Instale as dependências:

   ```bash
   pnpm install
   ```

3. Crie o arquivo de ambiente local a partir do exemplo:

   ```bash
   cp .env.example .env.local
   ```

4. Edite `.env.local` e preencha pelo menos as variáveis do Supabase e, para o primeiro admin, `ADMIN_EMAILS`. Consulte [CONFIGURATION.md](./CONFIGURATION.md) para a lista completa.

## First run

1. Suba o Supabase local (requer Docker):

   ```bash
   pnpm dlx supabase start
   ```

   Anote a **Project URL** e as chaves **anon** e **service_role** exibidas no terminal.

2. Aplique migrations e seed:

   ```bash
   pnpm dlx supabase db reset
   ```

3. Atualize `.env.local` com os valores do passo 1 (URL e chaves locais costumam ser `http://127.0.0.1:54321` e chaves JWT geradas pelo CLI — não use as credenciais de um projeto remoto enquanto desenvolve localmente).

4. Configure o primeiro admin — adicione seu e-mail em `ADMIN_EMAILS` no `.env.local`, por exemplo:

   ```bash
   ADMIN_EMAILS=seu-email@sebrae.com.br
   ```

   Alternativa: insira o e-mail em `public.admin_whitelist` via SQL (o seed em `supabase/seed.sql` já inclui `admin@sebrae.com.br` como exemplo).

5. Inicie o servidor de desenvolvimento:

   ```bash
   pnpm dev
   ```

6. Abra [http://localhost:3000](http://localhost:3000). Visitantes são redirecionados para `/login`; após autenticação, o fluxo segue para `/timeline`. Crie sua conta em `/signup` — se o e-mail estiver em `ADMIN_EMAILS` (ou na whitelist), o perfil recebe `is_admin=true` automaticamente.

## Common setup issues

### `supabase start` falha ou não conecta

- **Causa:** Docker não está rodando ou portas 54321–54322 estão ocupadas.
- **Solução:** Inicie o Docker Desktop/Engine e execute `pnpm dlx supabase stop` antes de tentar de novo. Verifique conflitos com outras instâncias Supabase locais.

### Auth ou queries retornam erro de conexão

- **Causa:** `.env.local` ainda aponta para um projeto Supabase remoto ou chaves incorretas.
- **Solução:** Copie URL e chaves do output de `pnpm dlx supabase start` para `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. Reinicie `pnpm dev` após alterar o arquivo.

### Não consigo acessar `/admin`

- **Causa:** Seu e-mail não está em `ADMIN_EMAILS` e não foi cadastrado em `admin_whitelist` antes do signup.
- **Solução:** Adicione o e-mail em `ADMIN_EMAILS`, reinicie o dev server e crie a conta em `/signup`, ou insira o e-mail em `public.admin_whitelist` e ajuste `profiles.is_admin` manualmente no banco.

### Porta 3000 já em uso

- **Causa:** Outro processo ocupa a porta padrão do Next.js.
- **Solução:** Encerre o processo conflitante ou inicie em outra porta: `pnpm dev -- -p 3001` e acesse `http://localhost:3001`.

## Next steps

Depois do primeiro run bem-sucedido:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — visão geral do sistema, fluxo de dados e estrutura de diretórios
- **[CONFIGURATION.md](./CONFIGURATION.md)** — variáveis de ambiente, `wrangler.jsonc` e sync com Google Sheets
- **[README.md](../README.md)** — comandos de build, testes, lint e deploy opcional no Cloudflare (`pnpm preview`, `pnpm deploy`)

Documentação adicional (desenvolvimento, testes, API e deploy) será acrescentada em `docs/` conforme o projeto evoluir.
