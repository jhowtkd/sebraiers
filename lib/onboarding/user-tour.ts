import type { TourStep } from './types';

export const userTourSteps: TourStep[] = [
  {
    selector: '[data-tour="timeline-header"]',
    title: 'Bem-vindo ao SEBRAEIERS',
    body: 'Engajar as redes oficiais vira disputa saudável. Em 30 segundos por dia você soma pontos e sobe no ranking.',
  },
  {
    selector: '[data-tour="timeline-card"]',
    title: 'O feed',
    body: 'Cada card é uma publicação oficial. Curta, comente ou compartilhe na rede original primeiro — depois declare aqui.',
    side: 'bottom',
  },
  {
    selector: '[data-tour="declare-actions"]',
    title: 'Declare sua ação',
    body: 'Toque em Curti, Comentei ou Compartilhei. Sua declaração entra na fila do admin para aprovação.',
    side: 'top',
  },
  {
    selector: '[data-tour="ranking-link"]',
    title: 'Ranking semanal',
    body: 'Dispute posição com o time. Critério de desempate: quem engajou por último fica acima.',
    side: 'bottom',
  },
  {
    selector: '[data-tour="performance-link"]',
    title: 'Seu progresso',
    body: 'Acompanhe pontos, histórico e status (Bronze → Diamante). Configure seus handles em Perfil quando quiser.',
    side: 'bottom',
  },
];
