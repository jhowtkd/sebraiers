import 'server-only';
import type { Profile, Post, Network, Checkin, CheckinWithPostSummary } from '@/lib/types';
import type { RankingRow } from '@/lib/ranking';
import type { PerformanceDashboard } from '@/lib/queries/dashboard-types';
import { IS_MOCK } from '@/lib/data-source/env';
import { buildEngagementBatch } from '@/lib/social/engagement';

export { IS_MOCK };

export const MOCK_USER_ID = '11111111-1111-1111-1111-111111111111';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

type MockProfile = Omit<Profile, 'created_at'> & { created_at?: string; total_points?: number };

export const MOCK_PROFILES: MockProfile[] = [
  // 25 perfis — 3 admins (maria, rafael, camila via whitelist) + 22 colaboradores
  { id: '11111111-1111-1111-1111-111111111111', full_name: 'Maria Silva', username: 'maria', is_admin: true, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=47' },
  { id: '22222222-2222-2222-2222-222222222222', full_name: 'Pedro Costa', username: 'pedro', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=12' },
  { id: '33333333-3333-3333-3333-333333333333', full_name: 'Ana Oliveira', username: 'ana', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=45' },
  { id: '44444444-4444-4444-4444-444444444444', full_name: 'Lucas Santos', username: 'lucas', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=33' },
  { id: '50000001-0000-0000-0000-000000000001', full_name: 'Rafael Lima', username: 'rafael', is_admin: true, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=15' },
  { id: '50000002-0000-0000-0000-000000000002', full_name: 'Camila Rocha', username: 'camila', is_admin: true, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=49' },
  { id: '50000003-0000-0000-0000-000000000003', full_name: 'Bruno Alves', username: 'bruno', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=14' },
  { id: '50000004-0000-0000-0000-000000000004', full_name: 'Júlia Ferreira', username: 'julia', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=23' },
  { id: '50000005-0000-0000-0000-000000000005', full_name: 'Tiago Mendes', username: 'tiago', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=8' },
  { id: '50000006-0000-0000-0000-000000000006', full_name: 'Fernanda Souza', username: 'fernanda', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=44' },
  { id: '50000007-0000-0000-0000-000000000007', full_name: 'Gustavo Barbosa', username: 'gustavo', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=11' },
  { id: '50000008-0000-0000-0000-000000000008', full_name: 'Beatriz Cardoso', username: 'beatriz', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=26' },
  { id: '50000009-0000-0000-0000-000000000009', full_name: 'Rodrigo Pinto', username: 'rodrigo', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=52' },
  { id: '50000010-0000-0000-0000-000000000010', full_name: 'Larissa Gomes', username: 'larissa', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=32' },
  { id: '50000011-0000-0000-0000-000000000011', full_name: 'Marcelo Dias', username: 'marcelo', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=58' },
  { id: '50000012-0000-0000-0000-000000000012', full_name: 'Priscila Cunha', username: 'priscila', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=39' },
  { id: '50000013-0000-0000-0000-000000000013', full_name: 'André Ribeiro', username: 'andre', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=60' },
  { id: '50000014-0000-0000-0000-000000000014', full_name: 'Vanessa Martins', username: 'vanessa', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=20' },
  { id: '50000015-0000-0000-0000-000000000015', full_name: 'Leonardo Teixeira', username: 'leonardo', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=53' },
  { id: '50000016-0000-0000-0000-000000000016', full_name: 'Carolina Nunes', username: 'carolina', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=24' },
  { id: '50000017-0000-0000-0000-000000000017', full_name: 'Felipe Moreira', username: 'felipe', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=18' },
  { id: '50000018-0000-0000-0000-000000000018', full_name: 'Isabela Araújo', username: 'isabela', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=36' },
  { id: '50000019-0000-0000-0000-000000000019', full_name: 'Henrique Castro', username: 'henrique', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=56' },
  { id: '50000020-0000-0000-0000-000000000020', full_name: 'Natália Vieira', username: 'natalia', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=29' },
  { id: '50000021-0000-0000-0000-000000000021', full_name: 'Gabriel Correia', username: 'gabriel', is_admin: false, is_active: true, avatar_url: 'https://i.pravatar.cc/300?img=64' },
];

const profileById = (id: string) => MOCK_PROFILES.find((p) => p.id === id)!;

export const MOCK_POSTS: Post[] = [
  // 20 posts cobrindo todas as 7 redes (mais recente primeiro)
  { id: 'p001', title: '5 erros comuns ao abrir um MEI',
    description: 'Antes de abrir seu MEI, confira esses 5 equívocos que travam o crescimento de quem tá começando. Salva esse post e compartilha com quem tá pensando em empreender!',
    network: 'instagram', original_url: 'https://www.instagram.com/sebraego/',
    cover_url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200',
    published_at: iso(2 * HOUR), created_by: MOCK_USER_ID, is_active: true, created_at: iso(2 * HOUR), updated_at: iso(2 * HOUR),
    author: profileById(MOCK_USER_ID) },
  { id: 'p002', title: 'Live: como conseguir crédito pra MEI em 2026',
    description: 'Live hoje às 19h com especialistas do SEBRAE Goiás tirando dúvidas sobre linhas de crédito, taxas e documentação. Link nos stories.',
    network: 'instagram', original_url: 'https://www.instagram.com/sebraego/',
    cover_url: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=1200',
    published_at: iso(6 * HOUR), created_by: MOCK_USER_ID, is_active: true, created_at: iso(6 * HOUR), updated_at: iso(6 * HOUR),
    author: profileById(MOCK_USER_ID) },
  { id: 'p003', title: 'Como o SEBRAE pode ajudar sua startup a escalar em 2026',
    description: 'Conheça os programas de aceleração disponíveis para startups goianas. De mentorias a investimentos, há caminhos para cada estágio do seu negócio.',
    network: 'linkedin', original_url: 'https://www.linkedin.com/company/sebrae-goias/',
    cover_url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200',
    published_at: iso(1 * DAY), created_by: MOCK_USER_ID, is_active: true, created_at: iso(1 * DAY), updated_at: iso(1 * DAY),
    author: profileById(MOCK_USER_ID) },
  { id: 'p004', title: 'Vagas abertas: programa de trainee 2026',
    description: 'Inscrições abertas até 30/07. 12 vagas nas unidades de Goiânia, Anápolis, Rio Verde e Aparecida. Confira o edital completo nos comentários.',
    network: 'linkedin', original_url: 'https://www.linkedin.com/company/sebrae-goias/',
    cover_url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200',
    published_at: iso(2 * DAY), created_by: MOCK_USER_ID, is_active: true, created_at: iso(2 * DAY), updated_at: iso(2 * DAY),
    author: profileById(MOCK_USER_ID) },
  { id: 'p005', title: 'Sebrae Delas: programa incentiva empreendedorismo feminino',
    description: 'O programa já impactou mais de 10 mil mulheres empreendedoras em Goiás. Mentorias, capacitações e networking pra você crescer com suporte.',
    network: 'facebook', original_url: 'https://www.facebook.com/sebraego/',
    cover_url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1200',
    published_at: iso(3 * DAY), created_by: MOCK_USER_ID, is_active: true, created_at: iso(3 * DAY), updated_at: iso(3 * DAY),
    author: profileById(MOCK_USER_ID) },
  { id: 'p006', title: 'Resultados 2025: +12 mil empresas atendidas',
    description: 'Balanço do ano passado mostra crescimento de 18% no atendimento a pequenos negócios goianos. Levantamento completo no link.',
    network: 'facebook', original_url: 'https://www.facebook.com/sebraego/',
    cover_url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200',
    published_at: iso(4 * DAY), created_by: MOCK_USER_ID, is_active: true, created_at: iso(4 * DAY), updated_at: iso(4 * DAY),
    author: profileById(MOCK_USER_ID) },
  { id: 'p007', title: 'Dicas rápidas: como precificar seu produto sem erro',
    description: 'Erro de preço é um dos principais motivos de fechamento de pequenos negócios. Assista o vídeo completo no nosso TikTok e anota as dicas!',
    network: 'tiktok', original_url: 'https://www.tiktok.com/@sebraego',
    cover_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200',
    published_at: iso(5 * DAY), created_by: MOCK_USER_ID, is_active: true, created_at: iso(5 * DAY), updated_at: iso(5 * DAY),
    author: profileById(MOCK_USER_ID) },
  { id: 'p008', title: 'Tour virtual: coworking do SEBRAE em Rio Verde',
    description: 'Conheça o novo espaço compartilhado pra empreendedores do Sudoeste goiano. Salas de reunião, internet rápida e endereço comercial. Visita guiada.',
    network: 'tiktok', original_url: 'https://www.tiktok.com/@sebraego',
    cover_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200',
    published_at: iso(6 * DAY), created_by: MOCK_USER_ID, is_active: true, created_at: iso(6 * DAY), updated_at: iso(6 * DAY),
    author: profileById(MOCK_USER_ID) },
  { id: 'p009', title: 'Webinar gratuito: marketing digital para pequenos negócios',
    description: 'Inscreva-se no webinar da próxima semana e aprenda estratégias práticas pra vender mais no digital. Vagas limitadas!',
    network: 'youtube', original_url: 'https://www.youtube.com/@sebraego',
    cover_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200',
    published_at: iso(7 * DAY), created_by: MOCK_USER_ID, is_active: true, created_at: iso(7 * DAY), updated_at: iso(7 * DAY),
    author: profileById(MOCK_USER_ID) },
  { id: 'p010', title: 'Masterclass: gestão financeira pra quem não é contador',
    description: 'Aprenda a separar pessoa física e jurídica, organizar fluxo de caixa e planejar o pró-labore sem misturar tudo. Gravação em alta qualidade.',
    network: 'youtube', original_url: 'https://www.youtube.com/@sebraego',
    cover_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200',
    published_at: iso(10 * DAY), created_by: MOCK_USER_ID, is_active: true, created_at: iso(10 * DAY), updated_at: iso(10 * DAY),
    author: profileById(MOCK_USER_ID) },
  { id: 'p011', title: 'Cases de sucesso: empresas goianas que cresceram com o SEBRAE',
    description: 'Três histórias inspiradoras de empreendedores que usaram nossos programas pra multiplicar faturamento em menos de 1 ano.',
    network: 'threads', original_url: 'https://www.threads.net/@sebraego',
    cover_url: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200',
    published_at: iso(12 * DAY), created_by: MOCK_USER_ID, is_active: true, created_at: iso(12 * DAY), updated_at: iso(12 * DAY),
    author: profileById(MOCK_USER_ID) },
  { id: 'p012', title: '5 hábitos de empreendedores que dão certo',
    description: 'Lista rápida pra você implementar amanhã: separar contas, anotar tudo, revisar semanalmente, falar com cliente e descansar.',
    network: 'threads', original_url: 'https://www.threads.net/@sebraego',
    cover_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200',
    published_at: iso(14 * DAY), created_by: MOCK_USER_ID, is_active: true, created_at: iso(14 * DAY), updated_at: iso(14 * DAY),
    author: profileById(MOCK_USER_ID) },
  { id: 'p013', title: 'Editais abertos: até R$ 50 mil para seu negócio',
    description: 'Confira os editais de fomento abertos este mês e submeta seu projeto. Prazo: 30 dias. Não deixe passar essa chance.',
    network: 'instagram', original_url: 'https://www.instagram.com/sebraego/',
    cover_url: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200',
    published_at: iso(16 * DAY), created_by: MOCK_USER_ID, is_active: true, created_at: iso(16 * DAY), updated_at: iso(16 * DAY),
    author: profileById(MOCK_USER_ID) },
  { id: 'p014', title: 'Encerramento do programa de mentorias 2025/2026',
    description: 'Confira os resultados da edição deste ano e os cases dos mentorados. Parabéns a todos os participantes!',
    network: 'linkedin', original_url: 'https://www.linkedin.com/company/sebrae-goias/',
    cover_url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200',
    published_at: iso(18 * DAY), created_by: MOCK_USER_ID, is_active: true, created_at: iso(18 * DAY), updated_at: iso(18 * DAY),
    author: profileById(MOCK_USER_ID) },
  { id: 'p015', title: 'Pesquisa: satisfação dos empreendedores atendidos',
    description: 'Aplicação aberta até 31/07. 5 minutos pra responder, 30 dias pra transformar suas respostas em melhorias reais. Sua opinião muda o jogo.',
    network: 'facebook', original_url: 'https://www.facebook.com/sebraego/',
    cover_url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200',
    published_at: iso(20 * DAY), created_by: MOCK_USER_ID, is_active: true, created_at: iso(20 * DAY), updated_at: iso(20 * DAY),
    author: profileById(MOCK_USER_ID) },
  { id: 'p016', title: 'Checklist: sua empresa tá pronta pra Black Friday?',
    description: 'Estoque, logística, atendimento, marketing, financeiro — os 5 pilares que precisam estar afinados antes de novembro chegar.',
    network: 'tiktok', original_url: 'https://www.tiktok.com/@sebraego',
    cover_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200',
    published_at: iso(22 * DAY), created_by: MOCK_USER_ID, is_active: true, created_at: iso(22 * DAY), updated_at: iso(22 * DAY),
    author: profileById(MOCK_USER_ID) },
  { id: 'p017', title: 'Série: do CPF ao CNPJ — episódio 1',
    description: 'Documentação, custos, benefícios e o passo a passo completo pra formalizar seu negócio sem dor de cabeça.',
    network: 'youtube', original_url: 'https://www.youtube.com/@sebraego',
    cover_url: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=1200',
    published_at: iso(25 * DAY), created_by: MOCK_USER_ID, is_active: true, created_at: iso(25 * DAY), updated_at: iso(25 * DAY),
    author: profileById(MOCK_USER_ID) },
  { id: 'p018', title: 'Produtos financeiros: qual o melhor pro seu momento?',
    description: 'Comparativo simples entre capital de giro, antecipação de recebíveis, microcrédito e leasing. Spoiler: não existe solução única.',
    network: 'threads', original_url: 'https://www.threads.net/@sebraego',
    cover_url: 'https://images.unsplash.com/photo-1554224155-1696413565d3?w=1200',
    published_at: iso(28 * DAY), created_by: MOCK_USER_ID, is_active: true, created_at: iso(28 * DAY), updated_at: iso(28 * DAY),
    author: profileById(MOCK_USER_ID) },
  { id: 'p019', title: 'SEBRAE em campo: atendimento no interior',
    description: 'Cronograma de Caravanas pra julho e agosto. Mais de 80 municípios goianos recebem consultorias gratuitas neste semestre.',
    network: 'facebook', original_url: 'https://www.facebook.com/sebraego/',
    cover_url: 'https://images.unsplash.com/photo-1542744095-291d1f67b221?w=1200',
    published_at: iso(32 * DAY), created_by: MOCK_USER_ID, is_active: true, created_at: iso(32 * DAY), updated_at: iso(32 * DAY),
    author: profileById(MOCK_USER_ID) },
  { id: 'p020', title: 'Ferramentas gratuitas do SEBRAE que você não conhecia',
    description: 'Lista de 5 plataformas digitais pra gestão, vendas e capacitação que ficam à disposição do empreendedor goiano. Cadastro único, acesso imediato.',
    network: 'x', original_url: 'https://x.com/sebraego',
    cover_url: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1200',
    published_at: iso(36 * DAY), created_by: MOCK_USER_ID, is_active: true, created_at: iso(36 * DAY), updated_at: iso(36 * DAY),
    author: profileById(MOCK_USER_ID) },
];

type MockCheckin = Checkin & {
  post: { id: string; title: string; network: Network; cover_url: string | null } | null;
};

const ck = (
  id: string, user_id: string, post_id: string, action: 'like' | 'comment' | 'share',
  status: 'pending' | 'approved' | 'rejected',
  declaredHoursAgo: number, decidedHoursAgo?: number
): MockCheckin => {
  const p = MOCK_POSTS.find((x) => x.id === post_id)!;
  const points = action === 'like' ? 1 : action === 'comment' ? 2 : 3;
  return {
    id, user_id, post_id, action, status, points,
    declared_at: iso(declaredHoursAgo * HOUR),
    decided_at: decidedHoursAgo != null ? iso(decidedHoursAgo * HOUR) : null,
    decided_by: null,
    admin_note: null,
    post: { id: p.id, title: p.title, network: p.network, cover_url: p.cover_url },
  };
};

export const MOCK_CHECKINS: MockCheckin[] = [
  // ===== RAFAEL (TOP 1) =====
  ck('ck001', '50000001-0000-0000-0000-000000000001', 'p001', 'like',    'approved', 1,        0.83),
  ck('ck002', '50000001-0000-0000-0000-000000000001', 'p001', 'comment', 'approved', 1.08,     0.83),
  ck('ck003', '50000001-0000-0000-0000-000000000001', 'p001', 'share',   'approved', 1.17,     0.83),
  ck('ck004', '50000001-0000-0000-0000-000000000001', 'p002', 'share',   'approved', 5.08,     4),
  ck('ck005', '50000001-0000-0000-0000-000000000001', 'p002', 'comment', 'approved', 5.17,     4),
  ck('ck006', '50000001-0000-0000-0000-000000000001', 'p003', 'share',   'approved', 20,       18),
  ck('ck007', '50000001-0000-0000-0000-000000000001', 'p005', 'like',    'approved', 2 * 24 + 1, 2 * 24),
  ck('ck008', '50000001-0000-0000-0000-000000000001', 'p007', 'comment', 'approved', 4 * 24 + 2, 4 * 24),
  ck('ck009', '50000001-0000-0000-0000-000000000001', 'p011', 'like',    'approved', 11 * 24 + 3, 11 * 24),
  ck('ck010', '50000001-0000-0000-0000-000000000001', 'p009', 'share',   'approved', 6 * 24 + 1, 6 * 24),
  ck('ck011', '50000001-0000-0000-0000-000000000001', 'p010', 'like',    'approved', 9 * 24 + 4, 9 * 24),

  // ===== CAMILA (TOP 2) =====
  ck('ck012', '50000002-0000-0000-0000-000000000002', 'p001', 'like',    'approved', 1, 0.92),
  ck('ck013', '50000002-0000-0000-0000-000000000002', 'p001', 'comment', 'approved', 1.08, 0.92),
  ck('ck014', '50000002-0000-0000-0000-000000000002', 'p002', 'like',    'approved', 5, 4),
  ck('ck015', '50000002-0000-0000-0000-000000000002', 'p002', 'comment', 'approved', 5.08, 4),
  ck('ck016', '50000002-0000-0000-0000-000000000002', 'p005', 'share',   'approved', 2 * 24 + 2, 2 * 24),
  ck('ck017', '50000002-0000-0000-0000-000000000002', 'p004', 'share',   'approved', 2 * 24 + 1, 2 * 24),
  ck('ck018', '50000002-0000-0000-0000-000000000002', 'p007', 'share',   'approved', 4 * 24 + 3, 4 * 24),
  ck('ck019', '50000002-0000-0000-0000-000000000002', 'p009', 'comment', 'approved', 6 * 24 + 2, 6 * 24),
  ck('ck020', '50000002-0000-0000-0000-000000000002', 'p010', 'like',    'approved', 9 * 24 + 5, 9 * 24),

  // ===== MARIA (TOP 3 - usuário logado no mock) =====
  ck('ck021', '11111111-1111-1111-1111-111111111111', 'p001', 'like',    'approved', 2 * 24 + 5, 2 * 24),
  ck('ck022', '11111111-1111-1111-1111-111111111111', 'p003', 'comment', 'approved', 1 * 24 + 5, 1 * 24),
  ck('ck023', '11111111-1111-1111-1111-111111111111', 'p005', 'share',   'approved', 12, 11.8),
  ck('ck024', '11111111-1111-1111-1111-111111111111', 'p003', 'like',    'approved', 18, 17),
  ck('ck025', '11111111-1111-1111-1111-111111111111', 'p004', 'comment', 'approved', 1 * 24 + 2, 1 * 24),
  ck('ck026', '11111111-1111-1111-1111-111111111111', 'p010', 'share',   'approved', 9 * 24 + 3, 9 * 24),
  ck('ck027', '11111111-1111-1111-1111-111111111111', 'p019', 'like',    'approved', 30 * 24 + 1, 30 * 24),
  ck('ck028', '11111111-1111-1111-1111-111111111111', 'p020', 'comment', 'approved', 34 * 24 + 1, 34 * 24),

  // ===== PEDRO (TOP 4) =====
  ck('ck029', '22222222-2222-2222-2222-222222222222', 'p001', 'comment', 'approved', 2 * 24 + 3, 2 * 24),
  ck('ck030', '22222222-2222-2222-2222-222222222222', 'p007', 'share',   'approved', 1 * 24 + 4, 1 * 24),
  ck('ck031', '22222222-2222-2222-2222-222222222222', 'p009', 'like',    'approved', 6.08, 6),
  ck('ck032', '22222222-2222-2222-2222-222222222222', 'p002', 'comment', 'approved', 5.5, 4),
  ck('ck033', '22222222-2222-2222-2222-222222222222', 'p004', 'like',    'approved', 2 * 24 + 2, 2 * 24),
  ck('ck034', '22222222-2222-2222-2222-222222222222', 'p010', 'share',   'approved', 9 * 24 + 2, 9 * 24),

  // ===== ANA (TOP 5) =====
  ck('ck035', '33333333-3333-3333-3333-333333333333', 'p003', 'like',    'approved', 1 * 24 + 4, 1 * 24),
  ck('ck036', '33333333-3333-3333-3333-333333333333', 'p005', 'comment', 'approved', 8.08, 8),
  ck('ck037', '33333333-3333-3333-3333-333333333333', 'p009', 'comment', 'approved', 6 * 24 + 4, 6 * 24),
  ck('ck038', '33333333-3333-3333-3333-333333333333', 'p003', 'share',   'approved', 20, 18),
  ck('ck039', '33333333-3333-3333-3333-333333333333', 'p014', 'like',    'approved', 17 * 24 + 1, 17 * 24),

  // ===== BRUNO =====
  ck('ck040', '50000003-0000-0000-0000-000000000003', 'p001', 'like',    'approved', 1.17, 0.83),
  ck('ck041', '50000003-0000-0000-0000-000000000003', 'p001', 'comment', 'approved', 1.25, 0.83),
  ck('ck042', '50000003-0000-0000-0000-000000000003', 'p002', 'comment', 'approved', 5.25, 4),
  ck('ck043', '50000003-0000-0000-0000-000000000003', 'p010', 'like',    'approved', 9 * 24 + 6, 9 * 24),

  // ===== JULIA =====
  ck('ck044', '50000004-0000-0000-0000-000000000004', 'p005', 'share',   'approved', 2 * 24 + 3, 2 * 24),
  ck('ck045', '50000004-0000-0000-0000-000000000004', 'p007', 'comment', 'approved', 4 * 24 + 5, 4 * 24),
  ck('ck046', '50000004-0000-0000-0000-000000000004', 'p008', 'like',    'approved', 5 * 24 + 6, 5 * 24),

  // ===== TIAGO =====
  ck('ck047', '50000005-0000-0000-0000-000000000005', 'p001', 'comment', 'approved', 1.33, 0.83),
  ck('ck048', '50000005-0000-0000-0000-000000000005', 'p011', 'like',    'approved', 11 * 24 + 4, 11 * 24),
  ck('ck049', '50000005-0000-0000-0000-000000000005', 'p012', 'like',    'approved', 13 * 24 + 5, 13 * 24),

  // ===== FERNANDA =====
  ck('ck050', '50000006-0000-0000-0000-000000000006', 'p009', 'share',   'approved', 6 * 24 + 5, 6 * 24),
  ck('ck051', '50000006-0000-0000-0000-000000000006', 'p007', 'like',    'approved', 4 * 24 + 4, 4 * 24),

  // ===== GUSTAVO =====
  ck('ck052', '50000007-0000-0000-0000-000000000007', 'p003', 'like',    'approved', 19, 18),
  ck('ck053', '50000007-0000-0000-0000-000000000007', 'p018', 'like',    'approved', 27 * 24 + 2, 27 * 24),
  ck('ck054', '50000007-0000-0000-0000-000000000007', 'p013', 'like',    'approved', 15 * 24 + 3, 15 * 24),
  ck('ck055', '50000007-0000-0000-0000-000000000007', 'p014', 'comment', 'approved', 17 * 24 + 2, 17 * 24),

  // ===== BEATRIZ =====
  ck('ck056', '50000008-0000-0000-0000-000000000008', 'p010', 'like',    'approved', 9 * 24 + 7, 9 * 24),
  ck('ck057', '50000008-0000-0000-0000-000000000008', 'p002', 'comment', 'approved', 5.33, 4),

  // ===== RODRIGO =====
  ck('ck058', '50000009-0000-0000-0000-000000000009', 'p001', 'share',   'approved', 1.42, 0.92),
  ck('ck059', '50000009-0000-0000-0000-000000000009', 'p019', 'like',    'approved', 30 * 24 + 2, 30 * 24),

  // ===== LARISSA =====
  ck('ck060', '50000010-0000-0000-0000-000000000010', 'p004', 'like',    'approved', 2 * 24 + 3, 2 * 24),
  ck('ck061', '50000010-0000-0000-0000-000000000010', 'p005', 'comment', 'approved', 2 * 24 + 4, 2 * 24),

  // ===== ANDRÉ, VANESSA, LEONARDO =====
  ck('ck062', '50000013-0000-0000-0000-000000000013', 'p007', 'like',    'approved', 4 * 24 + 6, 4 * 24),
  ck('ck063', '50000014-0000-0000-0000-000000000014', 'p003', 'like',    'approved', 20, 18),
  ck('ck064', '50000015-0000-0000-0000-000000000015', 'p005', 'like',    'approved', 2 * 24 + 5, 2 * 24),

  // ===== CAUDA (1-2 pts) =====
  ck('ck065', '50000016-0000-0000-0000-000000000016', 'p011', 'like',    'approved', 11 * 24 + 5, 11 * 24),
  ck('ck066', '50000017-0000-0000-0000-000000000017', 'p013', 'like',    'approved', 15 * 24 + 4, 15 * 24),
  ck('ck067', '50000018-0000-0000-0000-000000000018', 'p012', 'like',    'approved', 13 * 24 + 6, 13 * 24),
  ck('ck068', '50000019-0000-0000-0000-000000000019', 'p010', 'like',    'approved', 9 * 24 + 8, 9 * 24),
  ck('ck069', '50000020-0000-0000-0000-000000000020', 'p001', 'like',    'approved', 1.5, 0.92),
  ck('ck070', '50000021-0000-0000-0000-000000000021', 'p002', 'like',    'approved', 5.42, 4),

  // ===== LUCAS =====
  ck('ck071', '44444444-4444-4444-4444-444444444444', 'p001', 'like',    'approved', 1 * 24 + 4, 1 * 24),
  ck('ck072', '44444444-4444-4444-4444-444444444444', 'p008', 'like',    'approved', 5 * 24 + 7, 5 * 24),
  ck('ck073', '44444444-4444-4444-4444-444444444444', 'p007', 'like',    'approved', 4 * 24 + 7, 4 * 24),

  // ===== PENDENTES (fila do admin) =====
  ck('ck074', '50000011-0000-0000-0000-000000000011', 'p001', 'like',    'pending',  0.33),
  ck('ck075', '50000011-0000-0000-0000-000000000011', 'p001', 'comment', 'pending',  0.25),
  ck('ck076', '50000012-0000-0000-0000-000000000012', 'p002', 'share',   'pending',  0.67),
  ck('ck077', '50000008-0000-0000-0000-000000000008', 'p013', 'comment', 'pending',  0.17),
  ck('ck078', '50000006-0000-0000-0000-000000000006', 'p010', 'share',   'pending',  0.42),
  ck('ck079', '50000018-0000-0000-0000-000000000018', 'p007', 'comment', 'pending',  0.08),
  ck('ck080', '50000021-0000-0000-0000-000000000021', 'p005', 'like',    'pending',  0.13),
  ck('ck081', '50000019-0000-0000-0000-000000000019', 'p011', 'comment', 'pending',  0.05),

  // ===== REJEITADOS (histórico) =====
  ck('ck082', '50000009-0000-0000-0000-000000000009', 'p003', 'share',   'rejected', 14 * 24, 14 * 24 - 0.5),
  ck('ck083', '50000014-0000-0000-0000-000000000014', 'p014', 'comment', 'rejected', 11 * 24, 11 * 24 - 1),
];

// ===== Post reactions =====
export const MOCK_POST_REACTIONS: Array<{ post_id: string; user_id: string; reaction: 'fire' | 'muscle' | 'clap' | 'raised' | 'laugh' }> = [
  { post_id: 'p001', user_id: '11111111-1111-1111-1111-111111111111', reaction: 'fire' },
  { post_id: 'p001', user_id: '22222222-2222-2222-2222-222222222222', reaction: 'fire' },
  { post_id: 'p001', user_id: '33333333-3333-3333-3333-333333333333', reaction: 'clap' },
  { post_id: 'p001', user_id: '50000001-0000-0000-0000-000000000001', reaction: 'muscle' },
  { post_id: 'p001', user_id: '50000002-0000-0000-0000-000000000002', reaction: 'fire' },
  { post_id: 'p001', user_id: '50000013-0000-0000-0000-000000000013', reaction: 'raised' },
  { post_id: 'p002', user_id: '11111111-1111-1111-1111-111111111111', reaction: 'fire' },
  { post_id: 'p002', user_id: '50000002-0000-0000-0000-000000000002', reaction: 'clap' },
  { post_id: 'p002', user_id: '50000014-0000-0000-0000-000000000014', reaction: 'muscle' },
  { post_id: 'p003', user_id: '11111111-1111-1111-1111-111111111111', reaction: 'muscle' },
  { post_id: 'p003', user_id: '50000001-0000-0000-0000-000000000001', reaction: 'fire' },
  { post_id: 'p004', user_id: '22222222-2222-2222-2222-222222222222', reaction: 'fire' },
  { post_id: 'p004', user_id: '50000008-0000-0000-0000-000000000008', reaction: 'raised' },
  { post_id: 'p005', user_id: '22222222-2222-2222-2222-222222222222', reaction: 'raised' },
  { post_id: 'p005', user_id: '50000002-0000-0000-0000-000000000002', reaction: 'fire' },
  { post_id: 'p005', user_id: '50000004-0000-0000-0000-000000000004', reaction: 'clap' },
  { post_id: 'p007', user_id: '33333333-3333-3333-3333-333333333333', reaction: 'fire' },
  { post_id: 'p007', user_id: '44444444-4444-4444-4444-444444444444', reaction: 'laugh' },
  { post_id: 'p010', user_id: '50000001-0000-0000-0000-000000000001', reaction: 'fire' },
  { post_id: 'p010', user_id: '50000008-0000-0000-0000-000000000008', reaction: 'muscle' },
  { post_id: 'p011', user_id: '50000001-0000-0000-0000-000000000001', reaction: 'fire' },
  { post_id: 'p011', user_id: '50000005-0000-0000-0000-000000000005', reaction: 'raised' },
  { post_id: 'p012', user_id: '50000005-0000-0000-0000-000000000005', reaction: 'clap' },
  { post_id: 'p009', user_id: '50000002-0000-0000-0000-000000000002', reaction: 'clap' },
  { post_id: 'p009', user_id: '22222222-2222-2222-2222-222222222222', reaction: 'fire' },
  { post_id: 'p014', user_id: '11111111-1111-1111-1111-111111111111', reaction: 'raised' },
];

// ===== Post comments =====
export const MOCK_POST_COMMENTS: Array<{ id: string; post_id: string; user_id: string; body: string; created_at: string }> = [
  { id: 'pc001', post_id: 'p001', user_id: '11111111-1111-1111-1111-111111111111', body: 'Contei pelo menos dois desses no meu MEI! Valeu demais.', created_at: iso(2 * HOUR) },
  { id: 'pc002', post_id: 'p001', user_id: '22222222-2222-2222-2222-222222222222', body: 'Vou compartilhar com a galera do meu coworking.', created_at: iso(2 * HOUR) },
  { id: 'pc003', post_id: 'p001', user_id: '50000002-0000-0000-0000-000000000002', body: 'Excelente post! Poderia fazer uma segunda parte?', created_at: iso(3 * HOUR) },
  { id: 'pc004', post_id: 'p002', user_id: '50000001-0000-0000-0000-000000000001', body: 'Já tá salvo! Não vou perder essa live.', created_at: iso(5 * HOUR) },
  { id: 'pc005', post_id: 'p002', user_id: '50000008-0000-0000-0000-000000000008', body: 'Compartilho com meus alunosempreendedores!', created_at: iso(5 * HOUR) },
  { id: 'pc006', post_id: 'p003', user_id: '33333333-3333-3333-3333-333333333333', body: 'Participamos do programa de aceleração no ano passado, recomendo!', created_at: iso(20 * HOUR) },
  { id: 'pc007', post_id: 'p005', user_id: '50000002-0000-0000-0000-000000000002', body: 'Indico de olho fechado pra qualquer mulher que tá começando.', created_at: iso(2 * DAY + 4 * HOUR) },
  { id: 'pc008', post_id: 'p007', user_id: '11111111-1111-1111-1111-111111111111', body: 'Errei no preço do meu produto durante 6 meses, esse vídeo teria me poupado tempo.', created_at: iso(4 * DAY + 5 * HOUR) },
  { id: 'pc009', post_id: 'p009', user_id: '50000008-0000-0000-0000-000000000008', body: 'Inscrição feita! Obrigada, SEBRAE.', created_at: iso(6 * DAY + 6 * HOUR) },
  { id: 'pc010', post_id: 'p011', user_id: '50000004-0000-0000-0000-000000000004', body: 'Inspira demais ver gente da terra crescendo.', created_at: iso(11 * DAY + 7 * HOUR) },
  { id: 'pc011', post_id: 'p010', user_id: '50000002-0000-0000-0000-000000000002', body: 'Eu que não sou contador, vou assistir com calma e tomar notas.', created_at: iso(9 * DAY + 8 * HOUR) },
  { id: 'pc012', post_id: 'p004', user_id: '50000001-0000-0000-0000-000000000001', body: 'Vou indicar pros formandos da minha rede. Conteúdo riquíssimo.', created_at: iso(2 * DAY + 8 * HOUR) },
];

// ===== Checkin reactions =====
export const MOCK_CHECKIN_REACTIONS: Array<{ checkin_id: string; user_id: string }> = [
  { checkin_id: 'ck021', user_id: '22222222-2222-2222-2222-222222222222' },
  { checkin_id: 'ck023', user_id: '33333333-3333-3333-3333-333333333333' },
  { checkin_id: 'ck029', user_id: '11111111-1111-1111-1111-111111111111' },
  { checkin_id: 'ck003', user_id: '50000002-0000-0000-0000-000000000002' },
  { checkin_id: 'ck012', user_id: '50000001-0000-0000-0000-000000000001' },
];

export const MOCK_CHECKIN_COMMENTS: Array<{ id: string; checkin_id: string; user_id: string; body: string; created_at: string }> = [
  { id: 'cc001', checkin_id: 'ck021', user_id: '22222222-2222-2222-2222-222222222222', body: 'Tamo junto!', created_at: iso(2 * DAY) },
  { id: 'cc002', checkin_id: 'ck029', user_id: '11111111-1111-1111-1111-111111111111', body: 'Arrasou Pedro!', created_at: iso(2 * DAY) },
  { id: 'cc003', checkin_id: 'ck003', user_id: '50000002-0000-0000-0000-000000000002', body: 'Valeu pelo share, Rafael!', created_at: iso(1 * HOUR) },
];

// ===== Helpers expostos pra queries =====

export function mockGetTimeline(opts: { network?: Network | 'all'; search?: string } = {}) {
  let posts = MOCK_POSTS.filter((p) => p.is_active).slice().sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
  if (opts.network && opts.network !== 'all') posts = posts.filter((p) => p.network === opts.network);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    posts = posts.filter((p) => p.title.toLowerCase().includes(q));
  }
  return posts;
}

export function mockGetPostById(id: string) {
  return MOCK_POSTS.find((p) => p.id === id && p.is_active) ?? null;
}

export function mockGetPostsEngagementBatch(postIds: string[], userId: string | null) {
  const reactionRows = MOCK_POST_REACTIONS
    .filter((r) => postIds.includes(r.post_id))
    .map((r) => ({ id: r.post_id, reaction: r.reaction }));
  const myReactionRows = userId
    ? MOCK_POST_REACTIONS
        .filter((r) => postIds.includes(r.post_id) && r.user_id === userId)
        .map((r) => ({ id: r.post_id, reaction: r.reaction }))
    : [];
  const commentRows = MOCK_POST_COMMENTS
    .filter((c) => postIds.includes(c.post_id))
    .map((c) => ({ id: c.post_id }));
  return buildEngagementBatch(postIds, reactionRows, myReactionRows, commentRows);
}

export function mockGetPostEngagement(postId: string, userId: string | null) {
  return mockGetPostsEngagementBatch([postId], userId).get(postId)!;
}

export function mockGetPostEngagementWithComments(postId: string, userId: string | null) {
  const batch = mockGetPostsEngagementBatch([postId], userId).get(postId)!;
  const comments = MOCK_POST_COMMENTS
    .filter((c) => c.post_id === postId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((c) => {
      const u = profileById(c.user_id);
      return { id: c.id, body: c.body, created_at: c.created_at, user: { full_name: u.full_name, username: u.username, avatar_url: u.avatar_url } };
    });
  return { ...batch, comments };
}

function buildRankingRows(): RankingRow[] {
  const approved = MOCK_CHECKINS.filter((c) => c.status === 'approved');
  const grouped = new Map<string, { total: number; last: string | null; count: number }>();
  for (const c of approved) {
    const cur = grouped.get(c.user_id) ?? { total: 0, last: null, count: 0 };
    cur.total += c.points;
    cur.count += 1;
    if (c.decided_at) {
      if (!cur.last || new Date(c.decided_at).getTime() > new Date(cur.last).getTime()) cur.last = c.decided_at;
    }
    grouped.set(c.user_id, cur);
  }
  const rows: RankingRow[] = [];
  for (const [user_id, agg] of grouped) {
    const p = profileById(user_id);
    rows.push({
      user_id,
      username: p.username,
      full_name: p.full_name,
      avatar_url: p.avatar_url ?? null,
      total_points: agg.total,
      approved_checkins: agg.count,
      last_approved_at: agg.last,
    });
  }
  rows.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    const at = a.last_approved_at ? new Date(a.last_approved_at).getTime() : 0;
    const bt = b.last_approved_at ? new Date(b.last_approved_at).getTime() : 0;
    if (bt !== at) return bt - at;
    return a.username.localeCompare(b.username);
  });
  return rows;
}

export function mockGetUserRank(userId: string): number {
  const rows = buildRankingRows();
  const idx = rows.findIndex((r) => r.user_id === userId);
  return idx >= 0 ? idx + 1 : 0;
}

export function mockGetRanking(limit = 50) {
  const rows = buildRankingRows();
  const top = rows.slice(0, limit);
  const myPosition = mockGetUserRank(MOCK_USER_ID);
  const me = rows.find((r) => r.user_id === MOCK_USER_ID) ?? null;
  return { top, myPosition, me };
}

export function mockGetMyPoints(userId: string) {
  return MOCK_CHECKINS
    .filter((c) => c.user_id === userId && c.status === 'approved')
    .reduce((acc, c) => acc + c.points, 0);
}

export function mockGetMyWeeklyPoints(userId: string) {
  const sevenDaysAgo = Date.now() - 7 * DAY;
  return MOCK_CHECKINS
    .filter((c) => c.user_id === userId && c.status === 'approved' && c.decided_at && new Date(c.decided_at).getTime() >= sevenDaysAgo)
    .reduce((acc, c) => acc + c.points, 0);
}

export function mockGetMyStreakDays(userId: string) {
  const days = new Set<string>();
  MOCK_CHECKINS
    .filter((c) => c.user_id === userId && c.status === 'approved' && c.decided_at)
    .forEach((c) => days.add(new Date(c.decided_at!).toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function mockGetMyCheckins(limit = 50): CheckinWithPostSummary[] {
  return mockGetMyCheckinsWithPost(MOCK_USER_ID).slice(0, limit);
}

function mockGetMyCheckinsWithPost(userId: string): CheckinWithPostSummary[] {
  return MOCK_CHECKINS
    .filter((c) => c.user_id === userId)
    .sort((a, b) => new Date(b.declared_at).getTime() - new Date(a.declared_at).getTime())
    .map((c) => {
      const post = MOCK_POSTS.find((p) => p.id === c.post_id);
      return {
        id: c.id,
        action: c.action,
        status: c.status,
        points: c.points,
        declared_at: c.declared_at,
        decided_at: c.decided_at,
        post: post
          ? { id: post.id, title: post.title, network: post.network, cover_url: post.cover_url }
          : null,
      };
    });
}

export async function mockGetMyPerformanceDashboard(userId: string): Promise<PerformanceDashboard> {
  const allUserCheckins = MOCK_CHECKINS.filter((c) => c.user_id === userId);
  const totals = allUserCheckins.reduce(
    (acc, c) => {
      if (c.status === 'approved') {
        acc.approved += 1;
        acc.total_points += c.points;
      } else if (c.status === 'pending') acc.pending += 1;
      else if (c.status === 'rejected') acc.rejected += 1;
      return acc;
    },
    { total_points: 0, approved: 0, pending: 0, rejected: 0 }
  );
  const checkins = mockGetMyCheckinsWithPost(userId).slice(0, 50);
  const batched = mockGetCheckinsEngagementBatch(
    checkins.map((it) => it.id),
    userId
  );
  const engagementMap = new Map<string, import('@/lib/queries/checkins').CheckinEngagement>();
  for (const it of checkins) {
    const b = batched.get(it.id);
    engagementMap.set(it.id, {
      reactions: b?.reactions ?? {},
      myReactions: b?.myReactions ?? [],
      commentCount: b?.commentCount ?? 0,
      comments: [],
    });
  }
  return {
    totalPoints: mockGetMyPoints(userId),
    weeklyPoints: mockGetMyWeeklyPoints(userId),
    streakDays: mockGetMyStreakDays(userId),
    totals,
    checkins,
    engagementMap,
  };
}

export function mockGetMyCheckinsForPost(postId: string) {
  return MOCK_CHECKINS
    .filter((c) => c.user_id === MOCK_USER_ID && c.post_id === postId)
    .sort((a, b) => new Date(b.declared_at).getTime() - new Date(a.declared_at).getTime());
}

export function mockGetCheckinEngagement(checkinId: string, userId: string | null) {
  const rxs = MOCK_CHECKIN_REACTIONS.filter((r) => r.checkin_id === checkinId);
  const myRxs = userId ? rxs.filter((r) => r.user_id === userId).map(() => 'clap') : [];
  const counts: Record<string, number> = {};
  rxs.forEach(() => { counts['clap'] = (counts['clap'] ?? 0) + 1; });
  const cc = MOCK_CHECKIN_COMMENTS.filter((c) => c.checkin_id === checkinId).length;
  const comments = MOCK_CHECKIN_COMMENTS
    .filter((c) => c.checkin_id === checkinId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((c) => {
      const u = profileById(c.user_id);
      return { id: c.id, body: c.body, created_at: c.created_at, user: { full_name: u.full_name, username: u.username, avatar_url: u.avatar_url } };
    });
  return { reactions: counts, myReactions: myRxs, commentCount: cc, comments };
}

export function mockGetCheckinsEngagementBatch(checkinIds: string[], userId: string | null) {
  const reactionRows = MOCK_CHECKIN_REACTIONS
    .filter((r) => checkinIds.includes(r.checkin_id))
    .map((r) => ({ id: r.checkin_id, reaction: 'clap' }));
  const myReactionRows = userId
    ? MOCK_CHECKIN_REACTIONS
        .filter((r) => checkinIds.includes(r.checkin_id) && r.user_id === userId)
        .map((r) => ({ id: r.checkin_id, reaction: 'clap' }))
    : [];
  const commentRows = MOCK_CHECKIN_COMMENTS
    .filter((c) => checkinIds.includes(c.checkin_id))
    .map((c) => ({ id: c.checkin_id }));
  return buildEngagementBatch(checkinIds, reactionRows, myReactionRows, commentRows);
}

export function mockGetCurrentProfile(): Profile {
  const p = profileById(MOCK_USER_ID);
  return { ...p, created_at: p.created_at ?? new Date().toISOString() };
}

export function mockGetAuthHeaderContext() {
  const p = profileById(MOCK_USER_ID);
  return {
    user: { id: p.id, email: 'maria.silva@sebrae.com.br' } as unknown as import('@supabase/supabase-js').User,
    fullName: p.full_name,
    username: p.username,
    isAdmin: p.is_admin,
    avatarUrl: p.avatar_url ?? null,
  };
}