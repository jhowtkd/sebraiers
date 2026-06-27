# Decisions

## 2026-06-26 — Cloudflare deploy + admin agência + sync runtime

- **2026-06-26** Hosting de produção: Cloudflare Workers somente; remover `vercel.json` e referências a Vercel cron.
- **2026-06-26** URL de produção: `https://sebraiers.jhonatansoares.com`.
- **2026-06-26** Supabase: reutilizar projeto existente (não criar projeto novo).
- **2026-06-26** Admin automático: emails `@conteudoedu.com.br` promovidos a admin no signup + backfill SQL retroativo para contas existentes.
- **2026-06-26** Fonte única de admin automático: somente domínio `@conteudoedu.com.br`; `ADMIN_EMAILS` removido da lógica de promoção.
- **2026-06-26** Sync cron `created_by`: em runtime, usar o admin `@conteudoedu.com.br` mais antigo (`created_at` ASC); falhar com erro explícito se nenhum existir.
- **2026-06-26** `SYNC_AUTHOR_PROFILE_ID` deixa de ser obrigatório na env (substituído pela lookup de admin da agência).
- **2026-06-26** DNS: CNAME apenas do subdomínio `sebraiers`; zona `jhonatansoares.com` permanece no provedor DNS atual.
- **2026-06-26** Deploy: primeiro em `*.workers.dev` para validar; cutover do CNAME depois.
- **2026-06-26** Supabase Auth redirect URLs: cadastrar `workers.dev` + domínio final durante transição; remover URL temporária após cutover.
- **2026-06-26** Google Sheets: mesma `SHEET_ID` em dev e prod.
- **2026-06-26** Cron de sync: manter `0 */6 * * *` UTC (a cada 6 horas).
- **2026-06-26** Signup: aberto para qualquer email (sem restrição de domínio).
