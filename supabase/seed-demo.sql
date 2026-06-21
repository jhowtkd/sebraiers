-- ============================================================================
-- SEBRAEIERS — Demo seed (DEV ONLY)
-- Popula o banco com 4 colegas fictícios, 8 posts e ~10 checkins
-- (mix de aprovados + pendentes + 1 rejeitado) para demo visual.
--
-- Uso:
--   supabase db query --linked -f supabase/seed-demo.sql
--
-- Idempotente: re-rodável sem erro (todos os inserts usam ON CONFLICT).
-- Senha dos usuários fake: "password123" (apenas dev, não use em produção).
-- ============================================================================

-- 1) Admin whitelist (email bootstrap)
insert into public.admin_whitelist (email) values
  ('maria.silva@sebrae.com.br'),
  ('pedro.costa@sebrae.com.br'),
  ('ana.oliveira@sebrae.com.br'),
  ('lucas.santos@sebrae.com.br')
on conflict do nothing;

-- 2) Fake users (auth.users). Trigger handle_new_user cria profiles+user_socials.
--    bcrypt hash conhecido para "password123".
insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'maria.silva@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Maria Silva","username":"maria"}'::jsonb,
   'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'pedro.costa@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Pedro Costa","username":"pedro"}'::jsonb,
   'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'ana.oliveira@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Ana Oliveira","username":"ana"}'::jsonb,
   'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'lucas.santos@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Lucas Santos","username":"lucas"}'::jsonb,
   'authenticated', 'authenticated')
on conflict (id) do nothing;

-- 3) Socials para os fake users
update public.user_socials set instagram='maria.silva', linkedin='maria-silva-dev', facebook='maria.silva'
  where user_id='11111111-1111-1111-1111-111111111111';
update public.user_socials set instagram='pedrocosta', linkedin='pedro-costa-go', tiktok='pedrocosta'
  where user_id='22222222-2222-2222-2222-222222222222';
update public.user_socials set instagram='ana.oliveira', threads='ana.oliveira'
  where user_id='33333333-3333-3333-3333-333333333333';
update public.user_socials set linkedin='lucas-santos', youtube='@lucassantos'
  where user_id='44444444-4444-4444-4444-444444444444';

-- 4) Posts cobrindo as 6 redes. created_by aponta para a maria (não-admin) —
--    seed roda via Management API que bypassa RLS, então funciona.
insert into public.posts (title, description, network, original_url, cover_url, published_at, created_by, is_active) values
  ('5 erros comuns ao abrir um MEI',
   'Antes de abrir seu MEI, confira esses 5 equívocos que travam o crescimento de quem tá começando. Salva esse post e compartilha com quem tá pensando em empreender!',
   'instagram', 'https://www.instagram.com/sebraego/',
   'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200',
   now() - interval '3 hours', '11111111-1111-1111-1111-111111111111', true),

  ('Como o SEBRAE pode ajudar sua startup a escalar em 2026',
   'Conheça os programas de aceleração disponíveis para startups goianas. De mentorias a investimentos, há caminhos para cada estágio do seu negócio.',
   'linkedin', 'https://www.linkedin.com/company/sebrae-goias/',
   'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200',
   now() - interval '1 day', '11111111-1111-1111-1111-111111111111', true),

  ('Sebrae Delas: programa incentiva empreendedorismo feminino',
   'O programa já impactou mais de 10 mil mulheres empreendedoras em Goiás. Mentorias, capacitações e networking pra você crescer com suporte.',
   'facebook', 'https://www.facebook.com/sebraego/',
   'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=1200',
   now() - interval '2 days', '11111111-1111-1111-1111-111111111111', true),

  ('Dicas rápidas: como precificar seu produto sem erro',
   'Erro de preço é um dos principais motivos de fechamento de pequenos negócios. Assista o vídeo completo no nosso TikTok e anota as dicas!',
   'tiktok', 'https://www.tiktok.com/@sebraego',
   'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200',
   now() - interval '3 days', '11111111-1111-1111-1111-111111111111', true),

  ('Webinar gratuito: marketing digital para pequenos negócios',
   'Inscreva-se no webinar da próxima semana e aprenda estratégias práticas pra vender mais no digital. Vagas limitadas!',
   'youtube', 'https://www.youtube.com/@sebraego',
   'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200',
   now() - interval '5 days', '11111111-1111-1111-1111-111111111111', true),

  ('Cases de sucesso: empresas goianas que cresceram com o SEBRAE',
   'Três histórias inspiradoras de empreendedores que usaram nossos programas pra multiplicar faturamento em menos de 1 ano.',
   'threads', 'https://www.threads.net/@sebraego',
   'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200',
   now() - interval '1 week', '11111111-1111-1111-1111-111111111111', true),

  ('Editais abertos: até R$ 50 mil para seu negócio',
   'Confira os editais de fomento abertos este mês e submeta seu projeto. Prazo: 30 dias. Não deixe passar essa chance.',
   'instagram', 'https://www.instagram.com/sebraego/',
   'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200',
   now() - interval '10 days', '11111111-1111-1111-1111-111111111111', true),

  ('Encerramento do programa de mentorias 2025/2026',
   'Confira os resultados da edição deste ano e os cases dos mentorados. Parabéns a todos os participantes!',
   'linkedin', 'https://www.linkedin.com/company/sebrae-goias/',
   'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200',
   now() - interval '2 weeks', '11111111-1111-1111-1111-111111111111', true)
on conflict do nothing;

-- 5) Checkins (mix: ranking populado + fila de aprovação + 1 rejeitado pra histórico)
--    Pontuação esperada: Maria 6, Pedro 6, Ana 3, Lucas 1 (apenas approved conta)
insert into public.checkins (user_id, post_id, action, status, declared_at, decided_at, decided_by) values
  -- Maria: 1+2+3 = 6 pts
  ('11111111-1111-1111-1111-111111111111',
   (select id from public.posts where title like '5 erros comuns%' limit 1),
   'like', 'approved', now() - interval '2 days 5 hours', now() - interval '2 days', '11111111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111111',
   (select id from public.posts where title like 'Como o SEBRAE pode%' limit 1),
   'comment', 'approved', now() - interval '1 day 5 hours', now() - interval '1 day', '11111111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111111',
   (select id from public.posts where title like 'Sebrae Delas%' limit 1),
   'share', 'approved', now() - interval '12 hours 5 minutes', now() - interval '12 hours', '11111111-1111-1111-1111-111111111111'),

  -- Pedro: 2+3+1 = 6 pts
  ('22222222-2222-2222-2222-222222222222',
   (select id from public.posts where title like '5 erros comuns%' limit 1),
   'comment', 'approved', now() - interval '2 days 3 hours', now() - interval '2 days', '11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222',
   (select id from public.posts where title like 'Dicas rápidas%' limit 1),
   'share', 'approved', now() - interval '1 day 4 hours', now() - interval '1 day', '11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222',
   (select id from public.posts where title like 'Webinar gratuito%' limit 1),
   'like', 'approved', now() - interval '6 hours 5 minutes', now() - interval '6 hours', '11111111-1111-1111-1111-111111111111'),

  -- Ana: 1+2 = 3 pts
  ('33333333-3333-3333-3333-333333333333',
   (select id from public.posts where title like 'Como o SEBRAE pode%' limit 1),
   'like', 'approved', now() - interval '1 day 4 hours', now() - interval '1 day', '11111111-1111-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333333',
   (select id from public.posts where title like 'Sebrae Delas%' limit 1),
   'comment', 'approved', now() - interval '8 hours 5 minutes', now() - interval '8 hours', '11111111-1111-1111-1111-111111111111'),

  -- Lucas: 1 pt
  ('44444444-4444-4444-4444-444444444444',
   (select id from public.posts where title like '5 erros comuns%' limit 1),
   'like', 'approved', now() - interval '1 day 4 hours', now() - interval '1 day', '11111111-1111-1111-1111-111111111111'),

  -- Pendentes (você vai aprovar como admin)
  ('33333333-3333-3333-3333-333333333333',
   (select id from public.posts where title like 'Editais abertos%' limit 1),
   'like', 'pending', now() - interval '1 hour', null, null),
  ('44444444-4444-4444-4444-444444444444',
   (select id from public.posts where title like 'Cases de sucesso%' limit 1),
   'comment', 'pending', now() - interval '30 minutes', null, null),

  -- Rejeitado (histórico)
  ('44444444-4444-4444-4444-444444444444',
    (select id from public.posts where title like 'Como o SEBRAE pode%' limit 1),
    'share', 'rejected', now() - interval '3 days', now() - interval '3 days' + interval '1 hour',
    '11111111-1111-1111-1111-111111111111')
on conflict (user_id, post_id, action) do nothing;

-- 6) Sample reactions (post and checkin)
insert into public.post_reactions (post_id, user_id, reaction) values
  ((select id from public.posts where title like '5 erros comuns%' limit 1),
   '11111111-1111-1111-1111-111111111111', 'fire'),
  ((select id from public.posts where title like '5 erros comuns%' limit 1),
   '22222222-2222-2222-2222-222222222222', 'fire'),
  ((select id from public.posts where title like '5 erros comuns%' limit 1),
   '33333333-3333-3333-3333-333333333333', 'clap'),
  ((select id from public.posts where title like 'Como o SEBRAE pode%' limit 1),
   '11111111-1111-1111-1111-111111111111', 'muscle'),
  ((select id from public.posts where title like 'Sebrae Delas%' limit 1),
   '22222222-2222-2222-2222-222222222222', 'raised'),
  ((select id from public.posts where title like 'Dicas rápidas%' limit 1),
   '33333333-3333-3333-3333-333333333333', 'fire'),
  ((select id from public.posts where title like 'Dicas rápidas%' limit 1),
   '44444444-4444-4444-4444-444444444444', 'laugh')
on conflict (post_id, user_id, reaction) do nothing;

insert into public.post_comments (post_id, user_id, body) values
  ((select id from public.posts where title like '5 erros comuns%' limit 1),
   '11111111-1111-1111-1111-111111111111', 'Contei pelo menos dois desses no meu MEI! Valeu demais.'),
  ((select id from public.posts where title like '5 erros comuns%' limit 1),
   '22222222-2222-2222-2222-222222222222', 'Vou compartilhar com a galera do meu coworking.'),
  ((select id from public.posts where title like 'Como o SEBRAE pode%' limit 1),
   '33333333-3333-3333-3333-333333333333', 'Participamos do programa de aceleração no ano passado, recomendo!')
on conflict do nothing;

-- Checkin reactions (clap) from other users
insert into public.checkin_reactions (checkin_id, user_id, reaction) values
  ((select id from public.checkins where user_id='11111111-1111-1111-1111-111111111111' and action='like' and status='approved' limit 1),
   '22222222-2222-2222-2222-222222222222', 'clap'),
  ((select id from public.checkins where user_id='11111111-1111-1111-1111-111111111111' and action='share' and status='approved' limit 1),
   '33333333-3333-3333-3333-333333333333', 'clap'),
  ((select id from public.checkins where user_id='22222222-2222-2222-2222-222222222222' and action='comment' and status='approved' limit 1),
   '11111111-1111-1111-1111-111111111111', 'clap')
on conflict (checkin_id, user_id, reaction) do nothing;

insert into public.checkin_comments (checkin_id, user_id, body) values
  ((select id from public.checkins where user_id='11111111-1111-1111-1111-111111111111' and action='like' and status='approved' limit 1),
   '22222222-2222-2222-2222-222222222222', 'Tamo junto!'),
  ((select id from public.checkins where user_id='22222222-2222-2222-2222-222222222222' and action='share' and status='approved' limit 1),
   '11111111-1111-1111-1111-111111111111', 'Arrasou Pedro!')
on conflict do nothing;
