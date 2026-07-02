# Fase 1 — Segurança: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar o risco crítico de processo da `service_role` key do Supabase em texto plano, documentando o processo de secrets.

**Architecture:** Esta fase não altera código de aplicação. Confirma que `.env*.local`/`.dev.vars*` estão ignorados e ausentes do histórico (já verificado: 0 commits), orienta a rotação manual da `service_role` key no painel do Supabase, e cria `docs/SECURITY.md` como fonte única de verdade sobre onde cada secret vive.

**Tech Stack:** Markdown (doc), Supabase dashboard (rotação de key), git.

## Global Constraints

- **Nunca commitear** `.env.local`, `.env*.local`, `.dev.vars`, ou `.dev.vars*` — já estão no `.gitignore` (linhas 26-27 e 47-48).
- A `service_role` key burla **toda** a RLS do Supabase — trata como o secret mais sensível do projeto.
- Em produção (Cloudflare Workers), secrets viajam por `wrangler secret put <NAME>` — nunca no bundle.

---

## File Structure

- **Create:** `docs/SECURITY.md` — fonte única de verdade sobre gestão de secrets.
- **Modify:** nenhum arquivo de código.
- A rotação da key é uma **ação manual** do operador no painel do Supabase (não automatizável por plano).

---

## Task 1: Confirmar isolamento dos secrets no git

**Files:**
- Verify: `.gitignore`
- Verify: histórico do git

**Interfaces:**
- Consumes: nada.
- Produces: confirmação auditável de que nenhum secret está versionado.

- [ ] **Step 1: Confirmar que `.env*.local` e `.dev.vars*` estão no `.gitignore`**

Run: `grep -nE '\.env\*\.local|\.dev\.vars' .gitignore`
Expected: pelo menos estas linhas (já confirmadas):
```
26:.env*.local
27:.env
47:.dev.vars*
48:!.dev.vars.example
50:!.env.example
```

- [ ] **Step 2: Confirmar que `.env.local` nunca foi committado**

Run: `git log --all --full-history -- .env.local | grep -c commit`
Expected: `0` (zero commits contêm o arquivo).

- [ ] **Step 3: Confirmar que `.dev.vars` nunca foi committado**

Run: `git log --all --full-history -- .dev.vars | grep -c commit`
Expected: `0`.

- [ ] **Step 4: Confirmar que nenhuma `service_role` key real está no histórico**

Run: `git log --all -p -S 'service_role' -- . ':!docs' ':!*.md' | grep -iE 'eyJ[A-Za-z0-9_-]' || echo "limpo"`
Expected: `limpo` (nenhum JWT de service_role aparece no diff histórico). Se aparecer algo, **PARAR** e escalar — haveria vazamento confirmado.

---

## Task 2: Rotacionar a `service_role` key (ação manual)

**Files:**
- Modify: Supabase project settings (fora do repo)

**Interfaces:**
- Consumes: acesso de admin ao painel do Supabase.
- Produces: nova `service_role` key válida; a antiga é invalidada.

> ⚠️ **Esta task é executada pelo operador humano, não pelo agente.** O agente deve apenas apresentar os passos e esperar a confirmação.

- [ ] **Step 1: Gerar/rotacionar a key no painel do Supabase**

Ação manual no painel:
1. Acessar o projeto Supabase → **Settings → API**.
2. Na seção **Project API keys**, localizar a `service_role` (secret).
3. Rotacionar/regenerar a key (ação "Roll" ou "Regenerate", conforme a versão do painel).
4. **Copiar a nova key** — ela só é exibida uma vez.

- [ ] **Step 2: Atualizar `.env.local` local com a nova key**

Ação manual:
1. Editar `.env.local` e substituir `SUPABASE_SERVICE_ROLE_KEY=` pela nova key.
2. Editar `.dev.vars` (se usado para deploy local/preview) com a mesma nova key.

- [ ] **Step 3: Atualizar o secret em produção (Cloudflare Worker)**

Run (após o operador ter a nova key):
```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# colar a nova key quando solicitado
```
Expected: o comando confirma `Success! Uploaded secret SUPABASE_SERVICE_ROLE_KEY`. Fazer o deploy seguinte usar a nova key.

- [ ] **Step 4: Verificar que a app ainda funciona com a nova key**

Run: `pnpm dev`
Expected: servidor sobe em `localhost:3000` sem erros de auth do Supabase. Fazer login manual para confirmar que a `service_role` está válida (o sync e as actions admin a usam).

---

## Task 3: Criar `docs/SECURITY.md`

**Files:**
- Create: `docs/SECURITY.md`
- Test: revisão humana (sem teste automatizado para documentação)

**Interfaces:**
- Consumes: a lista de secrets do `.env.example` e a topologia de deploy (Cloudflare Workers).
- Produces: `docs/SECURITY.md` — referência canônica para qualquer pessoa que mantenha o projeto.

- [ ] **Step 1: Criar o arquivo `docs/SECURITY.md` com o conteúdo abaixo**

```markdown
# Segurança — Gestão de Secrets

Este documento é a fonte única de verdade sobre onde cada secret do Sebraiers vive e como manuseá-lo.

## Princípios

1. **Nunca commitear** `.env.local`, `.env*.local`, `.dev.vars`, ou `.dev.vars*`. Eles estão no `.gitignore`.
2. A `SUPABASE_SERVICE_ROLE_KEY` é o secret mais sensível do projeto — ela **burla toda a RLS** do Supabase. Trate como credencial de produção.
3. Em produção (Cloudflare Workers), todos os secrets viajam via `wrangler secret put`, nunca no bundle nem em arquivos versionados.

## Onde cada secret vive

| Secret | Desenvolvimento | Produção |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` (público por design) | binding do Worker |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` (público por design) | binding do Worker |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` (server-side only) | `wrangler secret put` |
| `CRON_SECRET` | `.env.local` | `wrangler secret put` |
| `SHEET_ID`, `SHEET_GID` | `.env.local` | `wrangler secret put` |

> Variáveis `NEXT_PUBLIC_*` são embutidas no bundle do cliente por design — não são privadas. Apenas os valores **sem** o prefixo `NEXT_PUBLIC_` são sensíveis.

## Arquivos de ambiente

- `.env.example` — **versionado**. Template com valores fictícios. Único arquivo de ambiente que entra no git.
- `.env.local` — **ignorado**. Valores reais de desenvolvimento local.
- `.dev.vars` — **ignorado**. Usado pelo Wrangler para rodar o Worker localmente.
- `.dev.vars.example` — **versionado**. Template para `.dev.vars`.

## Verificar que nada vazou

Antes de cada release, rodar:

```bash
# Nenhum arquivo de ambiente real no histórico
git log --all --full-history -- .env.local .dev.vars | grep -c commit
# Esperado: 0

# Nenhum JWT de service_role no histórico
git log --all -p -S 'service_role' -- . ':!docs' ':!*.md' | grep -iE 'eyJ[A-Za-z0-9_-]' || echo "limpo"
# Esperado: limpo
```

## Rotacionar a `service_role` key

1. Painel Supabase → **Settings → API** → regenerar a `service_role` key.
2. Atualizar `.env.local` e `.dev.vars` locais com a nova key.
3. Atualizar produção: `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`.
4. Confirmar que a app ainda funciona (`pnpm dev` + login manual).

## Reportar um incidente

Se suspeitar que um secret vazou:
1. **Rotacionar imediatamente** a key comprometida (não esperar investigação).
2. Auditar o histórico do git com os comandos acima.
3. Registrar o incidente e a rotação neste documento (seção de changelog abaixo).
```

- [ ] **Step 2: Verificar que o arquivo foi criado corretamente**

Run: `test -f docs/SECURITY.md && head -1 docs/SECURITY.md`
Expected: imprime `# Segurança — Gestão de Secrets`.

- [ ] **Step 3: Commit**

```bash
git add docs/SECURITY.md
git commit -m "docs(security): add secrets management playbook"
```

---

## Task 4: Gate final da fase

**Files:**
- Verify: estado do repositório

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: fase concluída com gates verdes.

- [ ] **Step 1: Typecheck**

Run: `pnpm typecheck`
Expected: passa sem erros (nenhum código foi alterado; confirmar que nada quebrou).

- [ ] **Step 2: Testes**

Run: `pnpm test`
Expected: todos os specs passam (111 specs; nenhum teste depende de código alterado nesta fase).

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: build do OpenNext conclui sem erros.

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: sem erros (warnings existentes aceitáveis).

- [ ] **Step 5: Confirmar que a rotação foi feita**

Confirmação humana: a nova `service_role` key está em `.env.local`, `.dev.vars` e em produção (`wrangler secret`), e a app autentica com ela sem erros. Marcar esta step apenas após confirmar.

---

## Notas

- Esta fase **não cria branch separada por task** porque é pequena e majoritariamente documentação; um único branch `docs/security` (ou direto em `main`, conforme o fluxo do time) com os commits de Task 3 e o gate de Task 4 é suficiente.
- As Tasks 1 e 2 são de verificação/ação humana — não geram commit. Apenas Task 3 commita.
