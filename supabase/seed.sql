-- ============================================================================
-- SEBRAEIERS — Seed (desenvolvimento)
-- ============================================================================

-- Adicione seu email admin aqui antes do primeiro signup
-- para que a trigger crie o profile com is_admin=true.
insert into public.admin_whitelist (email) values
  ('admin@sebrae.com.br')
on conflict do nothing;

-- Posts de exemplo — descomente para popular o banco após criar ao menos um admin

-- insert into public.posts (title, description, network, original_url, published_at, created_by, is_active)
-- values
--   (
--     '5 erros comuns ao abrir um MEI',
--     'Antes de abrir seu MEI, confira esses 5 equívocos que travam o crescimento de quem tá começando.',
--     'instagram',
--     'https://instagram.com/p/exemplo1',
--     now() - interval '2 hours',
--     (select id from public.profiles where is_admin = true limit 1),
--     true
--   ),
--   (
--     'Como o SEBRAE pode ajudar sua startup a escalar',
--     'Conheça os programas de aceleração disponíveis pra startups goianas em 2026.',
--     'linkedin',
--     'https://linkedin.com/posts/exemplo2',
--     now() - interval '1 day',
--     (select id from public.profiles where is_admin = true limit 1),
--     true
--   );