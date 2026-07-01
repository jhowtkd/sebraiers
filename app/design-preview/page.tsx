import Link from 'next/link';
import {
  Sparkles,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  Flame,
  Crown,
  Gem,
  Award,
  Star,
  Trophy,
  CheckCircle2,
  Clock,
  XCircle,
  History,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { TierBadge, TierProgress, tierForPoints } from '@/components/ui/tier-badge';
import { StatPill } from '@/components/ui/stat-pill';
import { Podium } from '@/components/ranking/podium';
import { RankingList } from '@/components/ranking/ranking-list';
import { PostCard } from '@/components/posts/post-card';
import { PostFilters } from '@/components/posts/post-filters';
import { YourStatusCard } from '@/components/ranking/your-status-card';
import { CheckinButtons } from '@/components/posts/checkin-buttons';
import { ReactionBar } from '@/components/social/reaction-bar';
import { Comments } from '@/components/social/comments';
import type { Post, Network } from '@/lib/types';
import type { RankingRow } from '@/lib/ranking';
import { formatPoints } from '@/lib/utils';

export const dynamic = 'force-static';

// ============================================================================
// MOCK DATA — pra demo de diretoria
// ============================================================================

const HOUR = 1000 * 60 * 60;
const now = Date.now();

const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    title: 'Empreendedorismo que transforma o interior de Goiás',
    description:
      'Conheça três histórias de quem fez do pequeno negócio um motor de desenvolvimento regional com apoio do SEBRAE.',
    network: 'instagram',
    original_url: 'https://instagram.com/p/abc',
    cover_url: null,
    published_at: new Date(now - HOUR * 3).toISOString(),
    created_by: 'u1',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: { full_name: 'SEBRAE Goiás', username: 'sebraegoias', avatar_url: null },
  },
  {
    id: 'p2',
    title: 'Como abrir seu MEI em 5 passos práticos',
    description:
      'Guia rápido pra quem tá começando agora e quer tirar a ideia do papel essa semana.',
    network: 'linkedin',
    original_url: 'https://linkedin.com/posts/xyz',
    cover_url: null,
    published_at: new Date(now - HOUR * 26).toISOString(),
    created_by: 'u1',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: { full_name: 'SEBRAE Goiás', username: 'sebraegoias', avatar_url: null },
  },
  {
    id: 'p3',
    title: 'Live: gestão financeira pra pequenos negócios',
    description:
      'Especialista do SEBRAE responde as principais dúvidas sobre fluxo de caixa, precificação e reserva de emergência.',
    network: 'youtube',
    original_url: 'https://youtube.com/watch?v=abc',
    cover_url: null,
    published_at: new Date(now - HOUR * 50).toISOString(),
    created_by: 'u1',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: { full_name: 'SEBRAE Goiás', username: 'sebraegoias', avatar_url: null },
  },
  {
    id: 'p4',
    title: 'TikTok: 3 erros que todo MEI comete no primeiro ano',
    description:
      'Reunimos as dúvidas mais frequentes do nosso atendimento pra você não cair nessas armadilhas.',
    network: 'tiktok',
    original_url: 'https://tiktok.com/@sebraegoias/video/abc',
    cover_url: null,
    published_at: new Date(now - HOUR * 8).toISOString(),
    created_by: 'u1',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: { full_name: 'SEBRAE Goiás', username: 'sebraegoias', avatar_url: null },
  },
  {
    id: 'p5',
    title: 'Edital aberto: inovação em pequenos negócios do agronegócio',
    description:
      'Inscrições até 15/07. Acompanhamento técnico gratuito pra 60 empresas selecionadas.',
    network: 'linkedin',
    original_url: 'https://linkedin.com/posts/edital',
    cover_url: null,
    published_at: new Date(now - HOUR * 72).toISOString(),
    created_by: 'u1',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: { full_name: 'SEBRAE Goiás', username: 'sebraegoias', avatar_url: null },
  },
];

const MOCK_RANKING: RankingRow[] = [
  { user_id: 'a', username: 'marina.souza', full_name: 'Marina Souza', avatar_url: null, total_points: 1840, approved_checkins: 32, last_approved_at: new Date().toISOString() },
  { user_id: 'b', username: 'rafael.lima', full_name: 'Rafael Lima', avatar_url: null, total_points: 1520, approved_checkins: 28, last_approved_at: new Date().toISOString() },
  { user_id: 'c', username: 'beatriz.n', full_name: 'Beatriz Nogueira', avatar_url: null, total_points: 1290, approved_checkins: 24, last_approved_at: new Date().toISOString() },
  { user_id: 'd', username: 'tiago.p', full_name: 'Tiago Pacheco', avatar_url: null, total_points: 980, approved_checkins: 18, last_approved_at: new Date().toISOString() },
  { user_id: 'e', username: 'clara.d', full_name: 'Clara Duarte', avatar_url: null, total_points: 720, approved_checkins: 14, last_approved_at: new Date().toISOString() },
  { user_id: 'f', username: 'pedro.h', full_name: 'Pedro Henrique', avatar_url: null, total_points: 540, approved_checkins: 11, last_approved_at: new Date().toISOString() },
  { user_id: 'g', username: 'jessica.a', full_name: 'Jéssica Almeida', avatar_url: null, total_points: 380, approved_checkins: 8, last_approved_at: new Date().toISOString() },
  { user_id: 'h', username: 'lucas.m', full_name: 'Lucas Mendes', avatar_url: null, total_points: 320, approved_checkins: 7, last_approved_at: new Date().toISOString() },
  { user_id: 'i', username: 'camila.r', full_name: 'Camila Ribeiro', avatar_url: null, total_points: 280, approved_checkins: 6, last_approved_at: new Date().toISOString() },
  { user_id: 'me', username: 'voce', full_name: 'Você', avatar_url: null, total_points: 240, approved_checkins: 6, last_approved_at: new Date().toISOString() },
];

const MOCK_ENGAGEMENT = {
  reactions: { fire: 12, muscle: 8, clap: 5, raised: 3, laugh: 1 },
  myReactions: ['fire'],
  commentCount: 4,
  comments: [
    { id: 'c1', body: 'Esse post ficou excelente! Curti demais a pauta.', created_at: new Date(now - 1000 * 60 * 12).toISOString(), user: { full_name: 'Marina Souza', username: 'marina.souza', avatar_url: null } },
    { id: 'c2', body: 'Compartilhando no meu story agora.', created_at: new Date(now - 1000 * 60 * 45).toISOString(), user: { full_name: 'Rafael Lima', username: 'rafael.lima', avatar_url: null } },
    { id: 'c3', body: 'Conteúdo muito relevante, parabéns à equipe!', created_at: new Date(now - 1000 * 60 * 90).toISOString(), user: { full_name: 'Beatriz Nogueira', username: 'beatriz.n', avatar_url: null } },
  ],
};

// ============================================================================
// PAGE
// ============================================================================

const SECTIONS: { id: string; label: string }[] = [
  { id: 'demo-timeline', label: 'Demo · Timeline' },
  { id: 'demo-ranking', label: 'Demo · Ranking' },
  { id: 'tokens', label: 'Cores & tipografia' },
  { id: 'buttons', label: 'Botões' },
  { id: 'badges', label: 'Badges & tiers' },
  { id: 'cards', label: 'Cards' },
  { id: 'checkin', label: 'Check-in' },
  { id: 'podium', label: 'Pódio' },
];

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-surface-canvas">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/85 border-b border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/design-preview" className="inline-flex items-center gap-2 font-extrabold tracking-tighter">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-atlantico-cobalto text-white shadow-sm">
              <span className="text-caption font-black">S</span>
            </span>
            <span className="text-text-primary">
              SEBRAE<span className="bg-gradient-atlantico-cobalto bg-clip-text text-transparent">iers</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-body-sm">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="px-3 py-1.5 rounded-full text-text-secondary hover:bg-surface-sunken hover:text-text-primary transition-colors">
                {s.label}
              </a>
            ))}
          </nav>
          <Badge variant="atlantico">v2 · preview</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-16">
        {/* Hero */}
        <section className="space-y-3 animate-fade-up">
          <p className="text-caption font-bold uppercase tracking-overline text-brand-azul">
            Redesign SEBRAEIERS · preview executivo
          </p>
          <h1 className="text-h1 sm:text-display font-black tracking-tighter leading-[0.95] text-text-primary text-balance">
            Energia de rede social.<br />Raiz institucional.
          </h1>
          <p className="text-body-lg text-text-secondary max-w-2xl">
            Atlântico reinterpretado. Duolingo na vibe. Strava na celebração de progresso. Linear no respiro tipográfico.
          </p>
        </section>

        {/* =====================================================================
            DEMO 1 — TIMELINE (como aparece pra um colaborador)
        ====================================================================== */}
        <Section
          id="demo-timeline"
          title="Timeline"
          subtitle="Hero de boas-vindas + feed editorial + sidebar de status do colaborador."
        >
          <div className="space-y-6">
            {/* Hero */}
            <div className="space-y-2">
              <p className="text-caption font-bold uppercase tracking-overline text-brand-azul">
                O que tá rolando
              </p>
              <h2 className="text-h1 sm:text-display font-black tracking-tighter leading-[0.95] text-text-primary text-balance">
                Curta, comente ou<br />compartilhe pra somar pontos.
              </h2>
              <p className="text-body-lg text-text-secondary max-w-2xl">
                Cada ação aprovada vira pontos e te sobe no ranking da semana.
              </p>
            </div>

            <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
              <div className="space-y-5 min-w-0">
                <PostFilters />
                <ul className="space-y-6 stagger-children">
                  <li><PostCard post={MOCK_POSTS[0]} engagement={MOCK_ENGAGEMENT} /></li>
                  <li><PostCard post={MOCK_POSTS[3]} engagement={MOCK_ENGAGEMENT} /></li>
                </ul>
              </div>
              <aside className="space-y-5 lg:sticky lg:top-20 self-start">
                <YourStatusCard
                  profile={{ full_name: 'Você', username: 'voce.sebrae', avatar_url: null }}
                  totalPoints={240}
                  weeklyPoints={42}
                  position={10}
                  streakDays={5}
                />
                <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-5 shadow-xs">
                  <p className="text-caption font-bold uppercase tracking-overline text-text-muted">
                    Como ganhar pontos
                  </p>
                  <ul className="mt-3 space-y-3 text-body-sm">
                    <li className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-azul-50 text-brand-azul-700 font-bold tabular-nums">1</span>
                      <span className="flex-1">Curtir um post</span>
                      <span className="font-bold tabular-nums text-text-primary">+1 pt</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-azul-50 text-brand-azul-700 font-bold tabular-nums">2</span>
                      <span className="flex-1">Comentar</span>
                      <span className="font-bold tabular-nums text-text-primary">+2 pts</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-azul-50 text-brand-azul-700 font-bold tabular-nums">3</span>
                      <span className="flex-1">Compartilhar</span>
                      <span className="font-bold tabular-nums text-text-primary">+3 pts</span>
                    </li>
                  </ul>
                  <p className="mt-4 text-caption text-text-muted">
                    Aprovação do admin em até 24h.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </Section>

        {/* =====================================================================
            DEMO 2 — RANKING
        ====================================================================== */}
        <Section
          id="demo-ranking"
          title="Ranking"
          subtitle="Pódio em destaque com halo de ouro + lista com sua posição destacada em Atlântico."
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-caption font-bold uppercase tracking-overline text-brand-azul">
                Ranking da semana
              </p>
              <h2 className="text-h1 sm:text-display font-black tracking-tighter leading-[0.95] text-text-primary text-balance">
                Quem tá movendo<br />as redes do SEBRAE.
              </h2>
              <p className="text-body-lg text-text-secondary max-w-2xl">
                Tiers: <strong className="text-tier-bronze">Bronze</strong> 50 pts ·{' '}
                <strong className="text-tier-prata">Prata</strong> 100 ·{' '}
                <strong className="text-tier-ouro">Ouro</strong> 250 ·{' '}
                <strong className="text-tier-platina">Platina</strong> 500 ·{' '}
                <strong className="text-tier-diamante">Diamante</strong> 1000.
              </p>
            </div>

            <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
              <div className="space-y-8 min-w-0">
                <section className="rounded-3xl bg-surface-elevated border border-border-subtle shadow-xs p-6 sm:p-10 overflow-hidden relative">
                  <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-64 rounded-full bg-tier-ouro-soft blur-3xl opacity-50" aria-hidden />
                  <div className="relative">
                    <div className="flex items-center gap-2 text-brand-azul">
                      <Trophy className="h-4 w-4" />
                      <p className="text-caption font-bold uppercase tracking-overline">
                        Pódio
                      </p>
                    </div>
                    <Podium top3={MOCK_RANKING.slice(0, 3)} />
                  </div>
                </section>

                <section>
                  <h3 className="text-h3 font-bold text-text-primary mb-4">
                    Posições seguintes
                  </h3>
                  <RankingList
                    rows={MOCK_RANKING.slice(3)}
                    highlightUserId="me"
                    myPosition={10}
                  />
                </section>
              </div>

              <aside className="space-y-4 lg:sticky lg:top-20 self-start hidden lg:block">
                <div className="rounded-2xl bg-gradient-atlantico-cobalto text-white p-6 shadow-md">
                  <p className="text-caption font-bold uppercase tracking-overline text-white/70">
                    Sua posição
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-points-hero font-black tabular-nums leading-none">
                        10º
                      </p>
                      <p className="text-caption text-white/70 mt-1">no ranking geral</p>
                    </div>
                    <div className="text-right">
                      <p className="text-points font-black tabular-nums leading-none">
                        {formatPoints(240)}
                      </p>
                      <p className="text-caption text-white/70 mt-1">pontos</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-surface-elevated border border-border-subtle shadow-xs p-5">
                  <p className="text-caption font-bold uppercase tracking-overline text-text-muted">
                    Sua jornada
                  </p>
                  <div className="mt-3">
                    <TierProgress points={240} />
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </Section>

        {/* =====================================================================
            TOKENS
        ====================================================================== */}
        <Section id="tokens" title="Cores & tipografia" subtitle="Atlântico energizado como âncora, paleta diversa como coadjuvante.">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-surface-elevated border border-border-subtle p-6 space-y-4">
              <p className="text-caption font-bold uppercase tracking-overline text-text-muted">Identidade</p>
              <div className="grid grid-cols-3 gap-3">
                <Swatch name="brand-azul" cls="bg-brand-azul" hex="#1A2DD9" />
                <Swatch name="brand-atlantico" cls="bg-brand-atlantico" hex="#0B195F" />
                <Swatch name="brand-ceu" cls="bg-brand-ceu" hex="#65B7FB" />
              </div>
            </div>
            <div className="rounded-2xl bg-surface-elevated border border-border-subtle p-6 space-y-4">
              <p className="text-caption font-bold uppercase tracking-overline text-text-muted">Tiers</p>
              <div className="grid grid-cols-5 gap-3">
                <Swatch cls="bg-tier-bronze" name="bronze" hex="#E8915A" small />
                <Swatch cls="bg-tier-prata" name="prata" hex="#B6BBC4" small />
                <Swatch cls="bg-tier-ouro" name="ouro" hex="#F2C94C" small />
                <Swatch cls="bg-tier-platina" name="platina" hex="#E478C5" small />
                <Swatch cls="bg-tier-diamante" name="diamante" hex="#9B5DE5" small />
              </div>
            </div>
          </div>
        </Section>

        {/* =====================================================================
            BUTTONS
        ====================================================================== */}
        <Section id="buttons" title="Botões" subtitle="Pílula como forma padrão. Gradient hero pra CTA principal.">
          <div className="rounded-2xl bg-surface-elevated border border-border-subtle p-6 space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Curtir (+1)</Button>
              <Button variant="hero"><Sparkles className="h-4 w-4" /> ENGAJAR AGORA</Button>
              <Button variant="secondary">Cancelar</Button>
              <Button variant="ghost">Detalhes</Button>
              <Button variant="destructive">Rejeitar</Button>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Button size="sm">Sm</Button>
              <Button size="md">Md</Button>
              <Button size="lg">Lg</Button>
              <Button loading>Salvando</Button>
              <Button disabled>Desabilitado</Button>
            </div>
          </div>
        </Section>

        {/* =====================================================================
            BADGES & TIERS
        ====================================================================== */}
        <Section id="badges" title="Badges & tiers" subtitle="Tiers como personagens, não como troféu. Cada um com seu tom.">
          <div className="rounded-2xl bg-surface-elevated border border-border-subtle p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge>default</Badge>
              <Badge variant="success">success</Badge>
              <Badge variant="warning">warning</Badge>
              <Badge variant="error">error</Badge>
              <Badge variant="info">info</Badge>
              <Badge variant="neutral">neutral</Badge>
              <Badge variant="azul">azul</Badge>
              <Badge variant="atlantico">atlantico</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-caption font-bold uppercase tracking-overline text-text-muted">Tiers</p>
              <div className="flex flex-wrap gap-3 items-center">
                <TierBadge tier="bronze" />
                <TierBadge tier="prata" />
                <TierBadge tier="ouro" />
                <TierBadge tier="platina" />
                <TierBadge tier="diamante" />
              </div>
            </div>
            <div>
              <p className="text-caption font-bold uppercase tracking-overline text-text-muted mb-3">Progressão</p>
              <TierProgress points={240} />
            </div>
          </div>
        </Section>

        {/* =====================================================================
            CARDS
        ====================================================================== */}
        <Section id="cards" title="Cards" subtitle="Borda sutil, sombra que cresce no hover, gradient hero pra status do usuário.">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardBody className="space-y-2">
                <p className="text-caption uppercase tracking-overline font-bold text-text-muted">Card padrão</p>
                <p className="text-h3 font-bold">Título do card</p>
                <p className="text-body text-text-secondary">Conteúdo padrão com borda sutil e sombra leve.</p>
              </CardBody>
            </Card>
            <Card className="bg-brand-azul-50/60 border-brand-azul/20">
              <CardBody className="space-y-2">
                <p className="text-caption uppercase tracking-overline font-bold text-brand-azul-700">Card com tinta</p>
                <p className="text-h3 font-bold text-brand-azul-700">Azul-50 suave</p>
                <p className="text-body text-text-secondary">Para destacar sem gritar.</p>
              </CardBody>
            </Card>
            <Card className="bg-gradient-atlantico-cobalto text-white border-0">
              <CardBody className="space-y-2">
                <p className="text-caption uppercase tracking-overline font-bold text-white/70">Card hero</p>
                <p className="text-h3 font-bold">Gradient hero</p>
                <p className="text-body-sm text-white/80">Reservado pra CTA primário e status do usuário.</p>
              </CardBody>
            </Card>
          </div>
        </Section>

        {/* =====================================================================
            CHECK-IN
        ====================================================================== */}
        <Section id="checkin" title="Check-in" subtitle="Card cheio por botão. Aprovado ganha tinta ouro e pop de check.">
          <div className="rounded-2xl bg-surface-elevated border border-border-subtle p-6 space-y-6">
            <div>
              <p className="text-caption font-bold uppercase tracking-overline text-text-muted mb-3">Disponíveis</p>
              <CheckinButtons postId="p1" existing={[]} />
            </div>
            <div>
              <p className="text-caption font-bold uppercase tracking-overline text-text-muted mb-3">1 aprovado, 1 pendente</p>
              <CheckinButtons
                postId="p1"
                existing={[
                  { action: 'like', status: 'approved' },
                  { action: 'comment', status: 'pending' },
                ]}
              />
            </div>
          </div>
        </Section>

        {/* =====================================================================
            PODIUM isolado
        ====================================================================== */}
        <Section id="podium" title="Pódio" subtitle="Top 3 com barras laterais. Glow de ouro atrás do 1º lugar.">
          <div className="rounded-3xl bg-surface-elevated border border-border-subtle shadow-xs p-6 sm:p-10 overflow-hidden relative">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-64 rounded-full bg-tier-ouro-soft blur-3xl opacity-50" aria-hidden />
            <div className="relative">
              <Podium top3={MOCK_RANKING.slice(0, 3)} />
            </div>
          </div>
        </Section>
      </main>

      <footer className="mx-auto max-w-7xl px-4 sm:px-6 py-10 text-caption text-text-muted text-center">
        SEBRAEIERS · design preview · dados fictícios pra demonstração
      </footer>
    </div>
  );
}

function Section({ id, title, subtitle, children }: { id: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-6 scroll-mt-20">
      <header className="space-y-1">
        <h2 className="text-h2 font-black tracking-tight text-text-primary">{title}</h2>
        <p className="text-body text-text-secondary">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

function Swatch({ cls, name, hex, small }: { cls: string; name: string; hex: string; small?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className={`${cls} ${small ? 'h-10' : 'h-16'} w-full rounded-xl ring-1 ring-border-subtle`} />
      <p className="text-caption font-semibold text-text-primary leading-none">{name}</p>
      <p className="text-caption text-text-muted tabular-nums leading-none">{hex}</p>
    </div>
  );
}