-- ============================================================================
-- SEBRAEIERS — Demo seed FULL (DEV ONLY)
-- Popula o banco com 25 colegas fictícios, 20 posts e ~70 checkins
-- (mix de aprovados + pendentes + rejeitados) para demo visual densa.
--
-- Uso:
--   supabase db query --linked -f supabase/seed-demo-full.sql
--
-- Idempotente: re-rodável sem erro (todos os inserts usam ON CONFLICT).
-- Senha dos usuários fake: "password123" (apenas dev, não use em produção).
--
-- Diferenças em relação a seed-demo.sql:
--   - 25 usuários (não 4) → ranking denso, pódio com 3 e vários no top 50
--   - 20 posts cobrindo TODAS as 7 redes (incluindo 'x' e 'threads')
--   - checkins distribuídos em todos os 25 com pontuação escalonada
--   - avatares Unsplash + i.pravatar (URLs públicas, sem Storage)
-- ============================================================================

-- 1) Admin whitelist (emails bootstrap)
insert into public.admin_whitelist (email) values
  ('maria.silva@sebrae.com.br'),
  ('rafael.lima@sebrae.com.br'),
  ('camila.rocha@sebrae.com.br')
on conflict do nothing;

-- 2) Fake users (auth.users). Trigger handle_new_user cria profiles+user_socials.
--    bcrypt hash conhecido para "password123".
--    25 usuários no total: 4 "originais" + 21 adicionais.
insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud) values
  -- Originais (mantidos do seed-demo.sql)
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
   'authenticated', 'authenticated'),

  -- 21 adicionais (pt-BR, distribuídos em gênero pra ter avatares variados)
  ('50000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'rafael.lima@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Rafael Lima","username":"rafael"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000002-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'camila.rocha@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Camila Rocha","username":"camila"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000003-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'bruno.alves@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Bruno Alves","username":"bruno"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000004-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'julia.ferreira@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Júlia Ferreira","username":"julia"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000005-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'tiago.mendes@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Tiago Mendes","username":"tiago"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000006-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'fernanda.souza@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Fernanda Souza","username":"fernanda"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000007-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'gustavo.barbosa@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Gustavo Barbosa","username":"gustavo"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000008-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'beatriz.cardoso@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Beatriz Cardoso","username":"beatriz"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000009-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'rodrigo.pinto@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Rodrigo Pinto","username":"rodrigo"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000010-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'larissa.gomes@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Larissa Gomes","username":"larissa"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000011-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'marcelo.dias@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Marcelo Dias","username":"marcelo"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000012-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'priscila.cunha@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Priscila Cunha","username":"priscila"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000013-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'andre.ribeiro@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"André Ribeiro","username":"andre"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000014-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', 'vanessa.martins@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Vanessa Martins","username":"vanessa"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000015-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000000', 'leonardo.teixeira@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Leonardo Teixeira","username":"leonardo"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000016-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000000', 'carolina.nunes@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Carolina Nunes","username":"carolina"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000017-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000000', 'felipe.moreira@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Felipe Moreira","username":"felipe"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000018-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000000', 'isabela.araujo@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Isabela Araújo","username":"isabela"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000019-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000000', 'henrique.castro@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Henrique Castro","username":"henrique"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000020-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000000', 'natalia.vieira@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Natália Vieira","username":"natalia"}'::jsonb,
   'authenticated', 'authenticated'),
  ('50000021-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000000', 'gabriel.correia@sebrae.com.br',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', now(),
   '{"full_name":"Gabriel Correia","username":"gabriel"}'::jsonb,
   'authenticated', 'authenticated')
on conflict (id) do nothing;

-- 3) Avatares via i.pravatar (URL pública estável, sem autenticação, ~70KB cada)
--    Para os 25 usuários. Isso dá rostos reais pro ranking e timeline.
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=47' where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=12' where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=45' where id = '33333333-3333-3333-3333-333333333333';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=33' where id = '44444444-4444-4444-4444-444444444444';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=15' where id = '50000001-0000-0000-0000-000000000001';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=49' where id = '50000002-0000-0000-0000-000000000002';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=14' where id = '50000003-0000-0000-0000-000000000003';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=23' where id = '50000004-0000-0000-0000-000000000004';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=8'  where id = '50000005-0000-0000-0000-000000000005';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=44' where id = '50000006-0000-0000-0000-000000000006';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=11' where id = '50000007-0000-0000-0000-000000000007';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=26' where id = '50000008-0000-0000-0000-000000000008';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=52' where id = '50000009-0000-0000-0000-000000000009';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=32' where id = '50000010-0000-0000-0000-000000000010';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=58' where id = '50000011-0000-0000-0000-000000000011';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=39' where id = '50000012-0000-0000-0000-000000000012';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=60' where id = '50000013-0000-0000-0000-000000000013';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=20' where id = '50000014-0000-0000-0000-000000000014';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=53' where id = '50000015-0000-0000-0000-000000000015';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=24' where id = '50000016-0000-0000-0000-000000000016';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=18' where id = '50000017-0000-0000-0000-000000000017';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=36' where id = '50000018-0000-0000-0000-000000000018';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=56' where id = '50000019-0000-0000-0000-000000000019';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=29' where id = '50000020-0000-0000-0000-000000000020';
update public.profiles set avatar_url = 'https://i.pravatar.cc/300?img=64' where id = '50000021-0000-0000-0000-000000000021';

-- 4) Socials (opcional, mas mantém consistência com seed-demo.sql)
update public.user_socials set instagram='maria.silva', linkedin='maria-silva-dev', facebook='maria.silva'
  where user_id='11111111-1111-1111-1111-111111111111';
update public.user_socials set instagram='pedrocosta', linkedin='pedro-costa-go', tiktok='pedrocosta'
  where user_id='22222222-2222-2222-2222-222222222222';
update public.user_socials set instagram='ana.oliveira', threads='ana.oliveira'
  where user_id='33333333-3333-3333-3333-333333333333';
update public.user_socials set linkedin='lucas-santos', youtube='@lucassantos'
  where user_id='44444444-4444-4444-4444-444444444444';
update public.user_socials set linkedin='rafael-lima', x='rafael_lima', instagram='rafael.lima.oficial'
  where user_id='50000001-0000-0000-0000-000000000001';
update public.user_socials set instagram='camila.rocha', linkedin='camila-rocha-sebrae', tiktok='camilarocha'
  where user_id='50000002-0000-0000-0000-000000000002';
update public.user_socials set youtube='@bruno.alves', facebook='bruno.alves'
  where user_id='50000003-0000-0000-0000-000000000003';
update public.user_socials set instagram='julia.ferreira', threads='julia.ferreira'
  where user_id='50000004-0000-0000-0000-000000000004';

-- 5) Posts — 20 publicações cobrindo todas as 7 redes (incluindo 'x' e 'threads')
--    Imagens via Unsplash via domínio images.unsplash.com com URLs públicas.
--    Ordem: mais recente primeiro (timeline decrescente).
insert into public.posts (title, description, network, original_url, cover_url, published_at, created_by, is_active) values
  ('5 erros comuns ao abrir um MEI',
   'Antes de abrir seu MEI, confira esses 5 equívocos que travam o crescimento de quem tá começando. Salva esse post e compartilha com quem tá pensando em empreender!',
   'instagram', 'https://www.instagram.com/sebraego/',
   'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200',
   now() - interval '2 hours', '11111111-1111-1111-1111-111111111111', true),

  ('Live: como conseguir crédito pra MEI em 2026',
   'Live hoje às 19h com especialistas do SEBRAE Goiás tirando dúvidas sobre linhas de crédito, taxas e documentação. Link nos stories.',
   'instagram', 'https://www.instagram.com/sebraego/',
   'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=1200',
   now() - interval '6 hours', '11111111-1111-1111-1111-111111111111', true),

  ('Como o SEBRAE pode ajudar sua startup a escalar em 2026',
   'Conheça os programas de aceleração disponíveis para startups goianas. De mentorias a investimentos, há caminhos para cada estágio do seu negócio.',
   'linkedin', 'https://www.linkedin.com/company/sebrae-goias/',
   'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200',
   now() - interval '1 day', '11111111-1111-1111-1111-111111111111', true),

  ('Vagas abertas: programa de trainee 2026',
   'Inscrições abertas até 30/07. 12 vagas nas unidades de Goiânia, Anápolis, Rio Verde e Aparecida. Confira o edital completo nos comentários.',
   'linkedin', 'https://www.linkedin.com/company/sebrae-goias/',
   'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200',
   now() - interval '2 days', '11111111-1111-1111-1111-111111111111', true),

  ('Sebrae Delas: programa incentiva empreendedorismo feminino',
   'O programa já impactou mais de 10 mil mulheres empreendedoras em Goiás. Mentorias, capacitações e networking pra você crescer com suporte.',
   'facebook', 'https://www.facebook.com/sebraego/',
   'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1200',
   now() - interval '3 days', '11111111-1111-1111-1111-111111111111', true),

  ('Resultados 2025: +12 mil empresas atendidas',
   'Balanço do ano passado mostra crescimento de 18% no atendimento a pequenos negócios goianos. Levantamento completo no link.',
   'facebook', 'https://www.facebook.com/sebraego/',
   'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200',
   now() - interval '4 days', '11111111-1111-1111-1111-111111111111', true),

  ('Dicas rápidas: como precificar seu produto sem erro',
   'Erro de preço é um dos principais motivos de fechamento de pequenos negócios. Assista o vídeo completo no nosso TikTok e anota as dicas!',
   'tiktok', 'https://www.tiktok.com/@sebraego',
   'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200',
   now() - interval '5 days', '11111111-1111-1111-1111-111111111111', true),

  ('Tour virtual: coworking do SEBRAE em Rio Verde',
   'Conheça o novo espaço compartilhado pra empreendedores do Sudoeste goiano. Salas de reunião, internet rápida e endereço comercial. Visita guiada.',
   'tiktok', 'https://www.tiktok.com/@sebraego',
   'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200',
   now() - interval '6 days', '11111111-1111-1111-1111-111111111111', true),

  ('Webinar gratuito: marketing digital para pequenos negócios',
   'Inscreva-se no webinar da próxima semana e aprenda estratégias práticas pra vender mais no digital. Vagas limitadas!',
   'youtube', 'https://www.youtube.com/@sebraego',
   'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200',
   now() - interval '7 days', '11111111-1111-1111-1111-111111111111', true),

  ('Masterclass: gestão financeira pra quem não é contador',
   'Aprenda a separar pessoa física e jurídica, organizar fluxo de caixa e planejar o pró-labore sem misturar tudo. Gravação em alta qualidade.',
   'youtube', 'https://www.youtube.com/@sebraego',
   'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200',
   now() - interval '10 days', '11111111-1111-1111-1111-111111111111', true),

  ('Cases de sucesso: empresas goianas que cresceram com o SEBRAE',
   'Três histórias inspiradoras de empreendedores que usaram nossos programas pra multiplicar faturamento em menos de 1 ano.',
   'threads', 'https://www.threads.net/@sebraego',
   'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200',
   now() - interval '12 days', '11111111-1111-1111-1111-111111111111', true),

  ('5 hábitos de empreendedores que dão certo',
   'Lista rápida pra você implementar amanhã: separar contas, anotar tudo, revisar semanalmente, falar com cliente e descansar.',
   'threads', 'https://www.threads.net/@sebraego',
   'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200',
   now() - interval '14 days', '11111111-1111-1111-1111-111111111111', true),

  ('Editais abertos: até R$ 50 mil para seu negócio',
   'Confira os editais de fomento abertos este mês e submeta seu projeto. Prazo: 30 dias. Não deixe passar essa chance.',
   'instagram', 'https://www.instagram.com/sebraego/',
   'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200',
   now() - interval '16 days', '11111111-1111-1111-1111-111111111111', true),

  ('Encerramento do programa de mentorias 2025/2026',
   'Confira os resultados da edição deste ano e os cases dos mentorados. Parabéns a todos os participantes!',
   'linkedin', 'https://www.linkedin.com/company/sebrae-goias/',
   'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200',
   now() - interval '18 days', '11111111-1111-1111-1111-111111111111', true),

  ('Pesquisa: satisfação dos empreendedores atendidos',
   'Aplicação aberta até 31/07. 5 minutos pra responder, 30 dias pra transformar suas respostas em melhorias reais. Sua opinião muda o jogo.',
   'facebook', 'https://www.facebook.com/sebraego/',
   'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200',
   now() - interval '20 days', '11111111-1111-1111-1111-111111111111', true),

  ('Checklist: sua empresa tá pronta pra Black Friday?',
   'Estoque, logística, atendimento, marketing, financeiro — os 5 pilares que precisam estar afinados antes de novembro chegar.',
   'tiktok', 'https://www.tiktok.com/@sebraego',
   'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200',
   now() - interval '22 days', '11111111-1111-1111-1111-111111111111', true),

  ('Série: do CPF ao CNPJ — episódio 1',
   'Documentação, custos, benefícios e o passo a passo completo pra formalizar seu negócio sem dor de cabeça.',
   'youtube', 'https://www.youtube.com/@sebraego',
   'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=1200',
   now() - interval '25 days', '11111111-1111-1111-1111-111111111111', true),

  ('Produtos financeiros: qual o melhor pro seu momento?',
   'Comparativo simples entre capital de giro, antecipação de recebíveis, microcrédito e leasing. Spoiler: não existe solução única.',
   'threads', 'https://www.threads.net/@sebraego',
   'https://images.unsplash.com/photo-1554224155-1696413565d3?w=1200',
   now() - interval '28 days', '11111111-1111-1111-1111-111111111111', true),

  ('SEBRAE em campo: atendimento no interior',
   'Cronograma de Caravanas pra julho e agosto. Mais de 80 municípios goianos recebem consultorias gratuitas neste semestre.',
   'facebook', 'https://www.facebook.com/sebraego/',
   'https://images.unsplash.com/photo-1542744095-291d1f67b221?w=1200',
   now() - interval '32 days', '11111111-1111-1111-1111-111111111111', true),

  ('Ferramentas gratuitas do SEBRAE que você não conhecia',
   'Lista de 5 plataformas digitais pra gestão, vendas e capacitação que ficam à disposição do empreendedor goiano. Cadastro único, acesso imediato.',
   'x', 'https://x.com/sebraego',
   'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1200',
   now() - interval '36 days', '11111111-1111-1111-1111-111111111111', true)
on conflict do nothing;

-- 6) Checkins distribuídos entre os 25 usuários, com pontuação escalonada
--    pra gerar ranking denso e interessante:
--      - Top 5:    20-35 pts (Diamante em alguns casos)
--      - 6-15:     10-19 pts (Ouro/Platina)
--      - 16-22:    4-9 pts (Prata/Bronze)
--      - 23-25:    1-3 pts (Bronze)
--    Apenas "approved" conta pra view user_points.
--    Mistura também ações por rede pra parecer real.
insert into public.checkins (user_id, post_id, action, status, declared_at, decided_at, decided_by) values
  -- ============ RAFAEL LIMA — TOP 1 (Diamante candidate) ============
  ('50000001-0000-0000-0000-000000000001',
   (select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   'like', 'approved', now() - interval '1 hour', now() - interval '50 minutes', '11111111-1111-1111-1111-111111111111'),
  ('50000001-0000-0000-0000-000000000001',
   (select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   'comment', 'approved', now() - interval '1 hour 5 minutes', now() - interval '50 minutes', '11111111-1111-1111-1111-111111111111'),
  ('50000001-0000-0000-0000-000000000001',
   (select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   'share', 'approved', now() - interval '1 hour 10 minutes', now() - interval '50 minutes', '11111111-1111-1111-1111-111111111111'),
  ('50000001-0000-0000-0000-000000000001',
   (select id from public.posts where title = 'Live: como conseguir crédito pra MEI em 2026' limit 1),
   'share', 'approved', now() - interval '5 hours 5 minutes', now() - interval '4 hours', '11111111-1111-1111-1111-111111111111'),
  ('50000001-0000-0000-0000-000000000001',
   (select id from public.posts where title = 'Live: como conseguir crédito pra MEI em 2026' limit 1),
   'comment', 'approved', now() - interval '5 hours 10 minutes', now() - interval '4 hours', '11111111-1111-1111-1111-111111111111'),
  ('50000001-0000-0000-0000-000000000001',
   (select id from public.posts where title = 'Como o SEBRAE pode ajudar sua startup a escalar em 2026' limit 1),
   'share', 'approved', now() - interval '20 hours', now() - interval '18 hours', '11111111-1111-1111-1111-111111111111'),
  ('50000001-0000-0000-0000-000000000001',
   (select id from public.posts where title = 'Sebrae Delas: programa incentiva empreendedorismo feminino' limit 1),
   'like', 'approved', now() - interval '2 days 1 hour', now() - interval '2 days', '11111111-1111-1111-1111-111111111111'),
  ('50000001-0000-0000-0000-000000000001',
   (select id from public.posts where title = 'Dicas rápidas: como precificar seu produto sem erro' limit 1),
   'comment', 'approved', now() - interval '4 days 2 hours', now() - interval '4 days', '11111111-1111-1111-1111-111111111111'),
  ('50000001-0000-0000-0000-000000000001',
   (select id from public.posts where title = 'Cases de sucesso: empresas goianas que cresceram com o SEBRAE' limit 1),
   'like', 'approved', now() - interval '11 days 3 hours', now() - interval '11 days', '11111111-1111-1111-1111-111111111111'),
  ('50000001-0000-0000-0000-000000000001',
   (select id from public.posts where title = 'Webinar gratuito: marketing digital para pequenos negócios' limit 1),
   'share', 'approved', now() - interval '6 days 1 hour', now() - interval '6 days', '11111111-1111-1111-1111-111111111111'),
  ('50000001-0000-0000-0000-000000000001',
   (select id from public.posts where title = 'Masterclass: gestão financeira pra quem não é contador' limit 1),
   'like', 'approved', now() - interval '9 days 4 hours', now() - interval '9 days', '11111111-1111-1111-1111-111111111111'),
  -- Total: 1+2+3 + 2+3 + 3 + 1 + 2 + 1 + 3 + 1 = 22 pts

  -- ============ CAMILA ROCHA — TOP 2 ============
  ('50000002-0000-0000-0000-000000000002',
   (select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   'like', 'approved', now() - interval '1 hour', now() - interval '55 minutes', '11111111-1111-1111-1111-111111111111'),
  ('50000002-0000-0000-0000-000000000002',
   (select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   'comment', 'approved', now() - interval '1 hour 5 minutes', now() - interval '55 minutes', '11111111-1111-1111-1111-111111111111'),
  ('50000002-0000-0000-0000-000000000002',
   (select id from public.posts where title = 'Live: como conseguir crédito pra MEI em 2026' limit 1),
   'like', 'approved', now() - interval '5 hours', now() - interval '4 hours', '11111111-1111-1111-1111-111111111111'),
  ('50000002-0000-0000-0000-000000000002',
   (select id from public.posts where title = 'Live: como conseguir crédito pra MEI em 2026' limit 1),
   'comment', 'approved', now() - interval '5 hours 5 minutes', now() - interval '4 hours', '11111111-1111-1111-1111-111111111111'),
  ('50000002-0000-0000-0000-000000000002',
   (select id from public.posts where title = 'Sebrae Delas: programa incentiva empreendedorismo feminino' limit 1),
   'share', 'approved', now() - interval '2 days 2 hours', now() - interval '2 days', '11111111-1111-1111-1111-111111111111'),
  ('50000002-0000-0000-0000-000000000002',
   (select id from public.posts where title = 'Vagas abertas: programa de trainee 2026' limit 1),
   'share', 'approved', now() - interval '2 days 1 hour', now() - interval '2 days', '11111111-1111-1111-1111-111111111111'),
  ('50000002-0000-0000-0000-000000000002',
   (select id from public.posts where title = 'Dicas rápidas: como precificar seu produto sem erro' limit 1),
   'share', 'approved', now() - interval '4 days 3 hours', now() - interval '4 days', '11111111-1111-1111-1111-111111111111'),
  ('50000002-0000-0000-0000-000000000002',
   (select id from public.posts where title = 'Webinar gratuito: marketing digital para pequenos negócios' limit 1),
   'comment', 'approved', now() - interval '6 days 2 hours', now() - interval '6 days', '11111111-1111-1111-1111-111111111111'),
  ('50000002-0000-0000-0000-000000000002',
   (select id from public.posts where title = 'Masterclass: gestão financeira pra quem não é contador' limit 1),
   'like', 'approved', now() - interval '9 days 5 hours', now() - interval '9 days', '11111111-1111-1111-1111-111111111111'),
  -- Total: 1+2 + 1+2 + 3 + 3 + 3 + 2 + 1 = 18 pts

  -- ============ MARIA SILVA — TOP 3 (já tinha 6 do seed original) ============
  -- Originais (não duplicados — unique em user_id, post_id, action):
  ('11111111-1111-1111-1111-111111111111',
   (select id from public.posts where title = 'Como o SEBRAE pode ajudar sua startup a escalar em 2026' limit 1),
   'like', 'approved', now() - interval '18 hours', now() - interval '17 hours', '11111111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111111',
   (select id from public.posts where title = 'Vagas abertas: programa de trainee 2026' limit 1),
   'comment', 'approved', now() - interval '1 day 2 hours', now() - interval '1 day', '11111111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111111',
   (select id from public.posts where title = 'Masterclass: gestão financeira pra quem não é contador' limit 1),
   'share', 'approved', now() - interval '9 days 3 hours', now() - interval '9 days', '11111111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111111',
   (select id from public.posts where title = 'SEBRAE em campo: atendimento no interior' limit 1),
   'like', 'approved', now() - interval '30 days 1 hour', now() - interval '30 days', '11111111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111111',
   (select id from public.posts where title = 'Ferramentas gratuitas do SEBRAE que você não conhecia' limit 1),
   'comment', 'approved', now() - interval '34 days 1 hour', now() - interval '34 days', '11111111-1111-1111-1111-111111111111'),
  -- soma dos originais (3) + novos (1+2+3+1+2 = 9): Maria soma 9 pts aqui + 6 originais = 15 pts

  -- ============ PEDRO COSTA — TOP 4 (continuação dos 6 originais) ============
  ('22222222-2222-2222-2222-222222222222',
   (select id from public.posts where title = 'Live: como conseguir crédito pra MEI em 2026' limit 1),
   'comment', 'approved', now() - interval '5 hours 30 minutes', now() - interval '4 hours', '11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222',
   (select id from public.posts where title = 'Vagas abertas: programa de trainee 2026' limit 1),
   'like', 'approved', now() - interval '2 days 2 hours', now() - interval '2 days', '11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222',
   (select id from public.posts where title = 'Masterclass: gestão financeira pra quem não é contador' limit 1),
   'share', 'approved', now() - interval '9 days 2 hours', now() - interval '9 days', '11111111-1111-1111-1111-111111111111'),
  -- adiciona 2+1+3 = 6 pts → total Pedro 12 pts

  -- ============ ANA OLIVEIRA — TOP 5 (já tinha 3 dos originais) ============
  ('33333333-3333-3333-3333-333333333333',
   (select id from public.posts where title = 'Webinar gratuito: marketing digital para pequenos negócios' limit 1),
   'comment', 'approved', now() - interval '6 days 4 hours', now() - interval '6 days', '11111111-1111-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333333',
   (select id from public.posts where title = 'Como o SEBRAE pode ajudar sua startup a escalar em 2026' limit 1),
   'share', 'approved', now() - interval '20 hours', now() - interval '18 hours', '11111111-1111-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333333',
   (select id from public.posts where title = 'Encerramento do programa de mentorias 2025/2026' limit 1),
   'like', 'approved', now() - interval '17 days 1 hour', now() - interval '17 days', '11111111-1111-1111-1111-111111111111'),
  -- 2 + 3 + 1 = 6 pts adicionais → Ana soma 9 pts totais

  -- ============ BRUNO ALVES — TOP 6 (8 pts) ============
  ('50000003-0000-0000-0000-000000000003',
   (select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   'like', 'approved', now() - interval '1 hour 10 minutes', now() - interval '50 minutes', '11111111-1111-1111-1111-111111111111'),
  ('50000003-0000-0000-0000-000000000003',
   (select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   'comment', 'approved', now() - interval '1 hour 15 minutes', now() - interval '50 minutes', '11111111-1111-1111-1111-111111111111'),
  ('50000003-0000-0000-0000-000000000003',
   (select id from public.posts where title = 'Live: como conseguir crédito pra MEI em 2026' limit 1),
   'comment', 'approved', now() - interval '5 hours 15 minutes', now() - interval '4 hours', '11111111-1111-1111-1111-111111111111'),
  ('50000003-0000-0000-0000-000000000003',
   (select id from public.posts where title = 'Masterclass: gestão financeira pra quem não é contador' limit 1),
   'like', 'approved', now() - interval '9 days 6 hours', now() - interval '9 days', '11111111-1111-1111-1111-111111111111'),
  -- 1+2+2+1 = 6 pts

  -- ============ JULIA FERREIRA — TOP 7 ============
  ('50000004-0000-0000-0000-000000000004',
   (select id from public.posts where title = 'Sebrae Delas: programa incentiva empreendedorismo feminino' limit 1),
   'share', 'approved', now() - interval '2 days 3 hours', now() - interval '2 days', '11111111-1111-1111-1111-111111111111'),
  ('50000004-0000-0000-0000-000000000004',
   (select id from public.posts where title = 'Dicas rápidas: como precificar seu produto sem erro' limit 1),
   'comment', 'approved', now() - interval '4 days 5 hours', now() - interval '4 days', '11111111-1111-1111-1111-111111111111'),
  ('50000004-0000-0000-0000-000000000004',
   (select id from public.posts where title = 'Tour virtual: coworking do SEBRAE em Rio Verde' limit 1),
   'like', 'approved', now() - interval '5 days 6 hours', now() - interval '5 days', '11111111-1111-1111-1111-111111111111'),
  -- 3+2+1 = 6 pts

  -- ============ TIAGO MENDES — 5 pts ============
  ('50000005-0000-0000-0000-000000000005',
   (select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   'comment', 'approved', now() - interval '1 hour 20 minutes', now() - interval '50 minutes', '11111111-1111-1111-1111-111111111111'),
  ('50000005-0000-0000-0000-000000000005',
   (select id from public.posts where title = 'Cases de sucesso: empresas goianas que cresceram com o SEBRAE' limit 1),
   'like', 'approved', now() - interval '11 days 4 hours', now() - interval '11 days', '11111111-1111-1111-1111-111111111111'),
  ('50000005-0000-0000-0000-000000000005',
   (select id from public.posts where title = '5 hábitos de empreendedores que dão certo' limit 1),
   'like', 'approved', now() - interval '13 days 5 hours', now() - interval '13 days', '11111111-1111-1111-1111-111111111111'),
  -- 2+1+1+1 = 5 pts

  -- ============ FERNANDA SOUZA — 5 pts ============
  ('50000006-0000-0000-0000-000000000006',
   (select id from public.posts where title = 'Webinar gratuito: marketing digital para pequenos negócios' limit 1),
   'share', 'approved', now() - interval '6 days 5 hours', now() - interval '6 days', '11111111-1111-1111-1111-111111111111'),
  ('50000007-0000-0000-0000-000000000007',
   (select id from public.posts where title = 'Como o SEBRAE pode ajudar sua startup a escalar em 2026' limit 1),
   'like', 'approved', now() - interval '19 hours', now() - interval '18 hours', '11111111-1111-1111-1111-111111111111'),
  ('50000007-0000-0000-0000-000000000007',
   (select id from public.posts where title = 'Produtos financeiros: qual o melhor pro seu momento?' limit 1),
   'like', 'approved', now() - interval '27 days 2 hours', now() - interval '27 days', '11111111-1111-1111-1111-111111111111'),
  -- 3+1+1 = 5 pts

  -- ============ GUSTAVO BARBOSA — 4 pts ============
  ('50000007-0000-0000-0000-000000000007',
   (select id from public.posts where title = 'Editais abertos: até R$ 50 mil para seu negócio' limit 1),
   'like', 'approved', now() - interval '15 days 3 hours', now() - interval '15 days', '11111111-1111-1111-1111-111111111111'),
  ('50000007-0000-0000-0000-000000000007',
   (select id from public.posts where title = 'Encerramento do programa de mentorias 2025/2026' limit 1),
   'comment', 'approved', now() - interval '17 days 2 hours', now() - interval '17 days', '11111111-1111-1111-1111-111111111111'),

  -- ============ BEATRIZ CARDOSO — 4 pts ============
  ('50000008-0000-0000-0000-000000000008',
   (select id from public.posts where title = 'Masterclass: gestão financeira pra quem não é contador' limit 1),
   'like', 'approved', now() - interval '9 days 7 hours', now() - interval '9 days', '11111111-1111-1111-1111-111111111111'),
  ('50000008-0000-0000-0000-000000000008',
   (select id from public.posts where title = 'Live: como conseguir crédito pra MEI em 2026' limit 1),
   'comment', 'approved', now() - interval '5 hours 20 minutes', now() - interval '4 hours', '11111111-1111-1111-1111-111111111111'),

  -- ============ RODRIGO PINTO — 4 pts ============
  ('50000009-0000-0000-0000-000000000009',
   (select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   'share', 'approved', now() - interval '1 hour 25 minutes', now() - interval '55 minutes', '11111111-1111-1111-1111-111111111111'),
  ('50000009-0000-0000-0000-000000000009',
   (select id from public.posts where title = 'SEBRAE em campo: atendimento no interior' limit 1),
   'like', 'approved', now() - interval '30 days 2 hours', now() - interval '30 days', '11111111-1111-1111-1111-111111111111'),

  -- ============ LARISSA GOMES — 4 pts ============
  ('50000010-0000-0000-0000-000000000010',
   (select id from public.posts where title = 'Vagas abertas: programa de trainee 2026' limit 1),
   'like', 'approved', now() - interval '2 days 3 hours', now() - interval '2 days', '11111111-1111-1111-1111-111111111111'),
  ('50000010-0000-0000-0000-000000000010',
   (select id from public.posts where title = 'Sebrae Delas: programa incentiva empreendedorismo feminino' limit 1),
   'comment', 'approved', now() - interval '2 days 4 hours', now() - interval '2 days', '11111111-1111-1111-1111-111111111111'),

  -- ============ ANDRÉ RIBEIRO, VANESSA MARTINS, LEONARDO TEIXEIRA — 3 pts cada ============
  ('50000013-0000-0000-0000-000000000013',
   (select id from public.posts where title = 'Dicas rápidas: como precificar seu produto sem erro' limit 1),
   'like', 'approved', now() - interval '4 days 6 hours', now() - interval '4 days', '11111111-1111-1111-1111-111111111111'),
  ('50000014-0000-0000-0000-000000000014',
   (select id from public.posts where title = 'Como o SEBRAE pode ajudar sua startup a escalar em 2026' limit 1),
   'like', 'approved', now() - interval '20 hours', now() - interval '18 hours', '11111111-1111-1111-1111-111111111111'),
  ('50000015-0000-0000-0000-000000000015',
   (select id from public.posts where title = 'Sebrae Delas: programa incentiva empreendedorismo feminino' limit 1),
   'like', 'approved', now() - interval '2 days 5 hours', now() - interval '2 days', '11111111-1111-1111-1111-111111111111'),

  -- ============ Resto (~2-3 pts) ============
  ('50000016-0000-0000-0000-000000000016',
   (select id from public.posts where title = 'Cases de sucesso: empresas goianas que cresceram com o SEBRAE' limit 1),
   'like', 'approved', now() - interval '11 days 5 hours', now() - interval '11 days', '11111111-1111-1111-1111-111111111111'),
  ('50000017-0000-0000-0000-000000000017',
   (select id from public.posts where title = 'Editais abertos: até R$ 50 mil para seu negócio' limit 1),
   'like', 'approved', now() - interval '15 days 4 hours', now() - interval '15 days', '11111111-1111-1111-1111-111111111111'),
  ('50000018-0000-0000-0000-000000000018',
   (select id from public.posts where title = '5 hábitos de empreendedores que dão certo' limit 1),
   'like', 'approved', now() - interval '13 days 6 hours', now() - interval '13 days', '11111111-1111-1111-1111-111111111111'),
  ('50000019-0000-0000-0000-000000000019',
   (select id from public.posts where title = 'Masterclass: gestão financeira pra quem não é contador' limit 1),
   'like', 'approved', now() - interval '9 days 8 hours', now() - interval '9 days', '11111111-1111-1111-1111-111111111111'),
  ('50000020-0000-0000-0000-000000000020',
   (select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   'like', 'approved', now() - interval '1 hour 30 minutes', now() - interval '55 minutes', '11111111-1111-1111-1111-111111111111'),
  ('50000021-0000-0000-0000-000000000021',
   (select id from public.posts where title = 'Live: como conseguir crédito pra MEI em 2026' limit 1),
   'like', 'approved', now() - interval '5 hours 25 minutes', now() - interval '4 hours', '11111111-1111-1111-1111-111111111111'),

  -- ============ LUCAS (complementando o 1 pt que ele já tinha) ============
  ('44444444-4444-4444-4444-444444444444',
   (select id from public.posts where title = 'Tour virtual: coworking do SEBRAE em Rio Verde' limit 1),
   'like', 'approved', now() - interval '5 days 7 hours', now() - interval '5 days', '11111111-1111-1111-1111-111111111111'),
  ('44444444-4444-4444-4444-444444444444',
   (select id from public.posts where title = 'Dicas rápidas: como precificar seu produto sem erro' limit 1),
   'like', 'approved', now() - interval '4 days 7 hours', now() - interval '4 days', '11111111-1111-1111-1111-111111111111'),

  -- ============ Pendentes pra fila de aprovação (6-8) ============
  ('50000011-0000-0000-0000-000000000011',
   (select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   'like', 'pending', now() - interval '20 minutes', null, null),
  ('50000011-0000-0000-0000-000000000011',
   (select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   'comment', 'pending', now() - interval '15 minutes', null, null),
  ('50000012-0000-0000-0000-000000000012',
   (select id from public.posts where title = 'Live: como conseguir crédito pra MEI em 2026' limit 1),
   'share', 'pending', now() - interval '40 minutes', null, null),
  ('50000008-0000-0000-0000-000000000008',
   (select id from public.posts where title = 'Editais abertos: até R$ 50 mil para seu negócio' limit 1),
   'comment', 'pending', now() - interval '10 minutes', null, null),
  ('50000006-0000-0000-0000-000000000006',
   (select id from public.posts where title = 'Masterclass: gestão financeira pra quem não é contador' limit 1),
   'share', 'pending', now() - interval '25 minutes', null, null),
  ('50000018-0000-0000-0000-000000000018',
   (select id from public.posts where title = 'Dicas rápidas: como precificar seu produto sem erro' limit 1),
   'comment', 'pending', now() - interval '5 minutes', null, null),
  ('50000021-0000-0000-0000-000000000021',
   (select id from public.posts where title = 'Sebrae Delas: programa incentiva empreendedorismo feminino' limit 1),
   'like', 'pending', now() - interval '8 minutes', null, null),
  ('50000019-0000-0000-0000-000000000019',
   (select id from public.posts where title = 'Cases de sucesso: empresas goianas que cresceram com o SEBRAE' limit 1),
   'comment', 'pending', now() - interval '3 minutes', null, null),

  -- ============ Rejeitados (2-3, pra ter no histórico) ============
  ('50000009-0000-0000-0000-000000000009',
   (select id from public.posts where title = 'Como o SEBRAE pode ajudar sua startup a escalar em 2026' limit 1),
   'share', 'rejected', now() - interval '14 days', now() - interval '14 days' + interval '30 minutes',
   '11111111-1111-1111-1111-111111111111'),
  ('50000014-0000-0000-0000-000000000014',
   (select id from public.posts where title = 'Encerramento do programa de mentorias 2025/2026' limit 1),
   'comment', 'rejected', now() - interval '11 days', now() - interval '11 days' + interval '1 hour',
   '11111111-1111-1111-1111-111111111111')
on conflict (user_id, post_id, action) do nothing;

-- 7) Reactions em posts — distribuídos pra todos terem alguma atividade
insert into public.post_reactions (post_id, user_id, reaction) values
  ((select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   '11111111-1111-1111-1111-111111111111', 'fire'),
  ((select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   '22222222-2222-2222-2222-222222222222', 'fire'),
  ((select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   '33333333-3333-3333-3333-333333333333', 'clap'),
  ((select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   '50000001-0000-0000-0000-000000000001', 'muscle'),
  ((select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   '50000002-0000-0000-0000-000000000002', 'fire'),
  ((select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   '50000013-0000-0000-0000-000000000013', 'raised'),
  ((select id from public.posts where title = 'Live: como conseguir crédito pra MEI em 2026' limit 1),
   '11111111-1111-1111-1111-111111111111', 'fire'),
  ((select id from public.posts where title = 'Live: como conseguir crédito pra MEI em 2026' limit 1),
   '50000002-0000-0000-0000-000000000002', 'clap'),
  ((select id from public.posts where title = 'Live: como conseguir crédito pra MEI em 2026' limit 1),
   '50000014-0000-0000-0000-000000000014', 'muscle'),
  ((select id from public.posts where title = 'Como o SEBRAE pode ajudar sua startup a escalar em 2026' limit 1),
   '11111111-1111-1111-1111-111111111111', 'muscle'),
  ((select id from public.posts where title = 'Como o SEBRAE pode ajudar sua startup a escalar em 2026' limit 1),
   '50000001-0000-0000-0000-000000000001', 'fire'),
  ((select id from public.posts where title = 'Vagas abertas: programa de trainee 2026' limit 1),
   '22222222-2222-2222-2222-222222222222', 'fire'),
  ((select id from public.posts where title = 'Vagas abertas: programa de trainee 2026' limit 1),
   '50000008-0000-0000-0000-000000000008', 'raised'),
  ((select id from public.posts where title = 'Sebrae Delas: programa incentiva empreendedorismo feminino' limit 1),
   '22222222-2222-2222-2222-222222222222', 'raised'),
  ((select id from public.posts where title = 'Sebrae Delas: programa incentiva empreendedorismo feminino' limit 1),
   '50000002-0000-0000-0000-000000000002', 'fire'),
  ((select id from public.posts where title = 'Sebrae Delas: programa incentiva empreendedorismo feminino' limit 1),
   '50000004-0000-0000-0000-000000000004', 'clap'),
  ((select id from public.posts where title = 'Dicas rápidas: como precificar seu produto sem erro' limit 1),
   '33333333-3333-3333-3333-333333333333', 'fire'),
  ((select id from public.posts where title = 'Dicas rápidas: como precificar seu produto sem erro' limit 1),
   '44444444-4444-4444-4444-444444444444', 'laugh'),
  ((select id from public.posts where title = 'Masterclass: gestão financeira pra quem não é contador' limit 1),
   '50000001-0000-0000-0000-000000000001', 'fire'),
  ((select id from public.posts where title = 'Masterclass: gestão financeira pra quem não é contador' limit 1),
   '50000008-0000-0000-0000-000000000008', 'muscle'),
  ((select id from public.posts where title = 'Cases de sucesso: empresas goianas que cresceram com o SEBRAE' limit 1),
   '50000001-0000-0000-0000-000000000001', 'fire'),
  ((select id from public.posts where title = 'Cases de sucesso: empresas goianas que cresceram com o SEBRAE' limit 1),
   '50000005-0000-0000-0000-000000000005', 'raised'),
  ((select id from public.posts where title = '5 hábitos de empreendedores que dão certo' limit 1),
   '50000005-0000-0000-0000-000000000005', 'clap'),
  ((select id from public.posts where title = 'Webinar gratuito: marketing digital para pequenos negócios' limit 1),
   '50000002-0000-0000-0000-000000000002', 'clap'),
  ((select id from public.posts where title = 'Webinar gratuito: marketing digital para pequenos negócios' limit 1),
   '22222222-2222-2222-2222-222222222222', 'fire'),
  ((select id from public.posts where title = 'Encerramento do programa de mentorias 2025/2026' limit 1),
   '11111111-1111-1111-1111-111111111111', 'raised')
on conflict (post_id, user_id, reaction) do nothing;

-- 8) Comentários em posts
insert into public.post_comments (post_id, user_id, body) values
  ((select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   '11111111-1111-1111-1111-111111111111', 'Contei pelo menos dois desses no meu MEI! Valeu demais.'),
  ((select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   '22222222-2222-2222-2222-222222222222', 'Vou compartilhar com a galera do meu coworking.'),
  ((select id from public.posts where title = '5 erros comuns ao abrir um MEI' limit 1),
   '50000002-0000-0000-0000-000000000002', 'Excelente post! Poderia fazer uma segunda parte?'),
  ((select id from public.posts where title = 'Live: como conseguir crédito pra MEI em 2026' limit 1),
   '50000001-0000-0000-0000-000000000001', 'Já tá salvo! Não vou perder essa live.'),
  ((select id from public.posts where title = 'Live: como conseguir crédito pra MEI em 2026' limit 1),
   '50000008-0000-0000-0000-000000000008', 'Compartilho com meus alunosempreendedores!'),
  ((select id from public.posts where title = 'Como o SEBRAE pode ajudar sua startup a escalar em 2026' limit 1),
   '33333333-3333-3333-3333-333333333333', 'Participamos do programa de aceleração no ano passado, recomendo!'),
  ((select id from public.posts where title = 'Sebrae Delas: programa incentiva empreendedorismo feminino' limit 1),
   '50000002-0000-0000-0000-000000000002', 'Indico de olho fechado pra qualquer mulher que tá começando.'),
  ((select id from public.posts where title = 'Dicas rápidas: como precificar seu produto sem erro' limit 1),
   '11111111-1111-1111-1111-111111111111', 'Errei no preço do meu produto durante 6 meses, esse vídeo teria me poupado tempo.'),
  ((select id from public.posts where title = 'Webinar gratuito: marketing digital para pequenos negócios' limit 1),
   '50000008-0000-0000-0000-000000000008', 'Inscrição feita! Obrigada, SEBRAE.'),
  ((select id from public.posts where title = 'Cases de sucesso: empresas goianas que cresceram com o SEBRAE' limit 1),
   '50000004-0000-0000-0000-000000000004', 'Inspira demais ver gente da terra crescendo.'),
  ((select id from public.posts where title = 'Masterclass: gestão financeira pra quem não é contador' limit 1),
   '50000002-0000-0000-0000-000000000002', 'Eu que não sou contador, vou assistir com calma e tomar notas.'),
  ((select id from public.posts where title = 'Vagas abertas: programa de trainee 2026' limit 1),
   '50000001-0000-0000-0000-000000000001', 'Vou indicar pros formandos da minha rede. Conteúdo riquíssimo.')
on conflict do nothing;

-- 9) Reactions + comments em checkins (mantidos do seed-demo original)
insert into public.checkin_reactions (checkin_id, user_id, reaction) values
  ((select id from public.checkins where user_id='11111111-1111-1111-1111-111111111111' and action='like' and status='approved' limit 1),
   '22222222-2222-2222-2222-222222222222', 'clap'),
  ((select id from public.checkins where user_id='11111111-1111-1111-1111-111111111111' and action='share' and status='approved' limit 1),
   '33333333-3333-3333-3333-333333333333', 'clap'),
  ((select id from public.checkins where user_id='22222222-2222-2222-2222-222222222222' and action='comment' and status='approved' limit 1),
   '11111111-1111-1111-1111-111111111111', 'clap'),
  ((select id from public.checkins where user_id='50000001-0000-0000-0000-000000000001' and action='like' and status='approved' limit 1),
   '50000002-0000-0000-0000-000000000002', 'clap'),
  ((select id from public.checkins where user_id='50000002-0000-0000-0000-000000000002' and action='share' and status='approved' limit 1),
   '50000001-0000-0000-0000-000000000001', 'clap')
on conflict (checkin_id, user_id, reaction) do nothing;

insert into public.checkin_comments (checkin_id, user_id, body) values
  ((select id from public.checkins where user_id='11111111-1111-1111-1111-111111111111' and action='like' and status='approved' limit 1),
   '22222222-2222-2222-2222-222222222222', 'Tamo junto!'),
  ((select id from public.checkins where user_id='22222222-2222-2222-2222-222222222222' and action='share' and status='approved' limit 1),
   '11111111-1111-1111-1111-111111111111', 'Arrasou Pedro!'),
  ((select id from public.checkins where user_id='50000001-0000-0000-0000-000000000001' and action='share' and status='approved' limit 1),
   '50000002-0000-0000-0000-000000000002', 'Valeu pelo share, Rafel!')
on conflict do nothing;
