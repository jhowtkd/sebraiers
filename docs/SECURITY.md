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
