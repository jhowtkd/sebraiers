import type { TourStep } from './types';

export const adminTourSteps: TourStep[] = [
  {
    selector: '[data-tour="admin-checkins"]',
    title: 'Fila de aprovações',
    body: 'Tudo que os colaboradores declaram cai aqui. Aprove ou rejeite com nota — a nota aparece para o colaborador.',
    side: 'bottom',
  },
  {
    selector: '[data-tour="admin-posts"]',
    title: 'Publicações',
    body: 'Crie, edite e desative posts do feed. URL original e capa são obrigatórios; rede social é uma das 6 suportadas.',
    side: 'bottom',
  },
  {
    selector: '[data-tour="admin-users"]',
    title: 'Usuários',
    body: 'Busque por nome, username ou email. Ative ou desative contas com cuidado — não é possível desativar o último admin.',
    side: 'bottom',
  },
  {
    selector: '[data-tour="admin-metrics"]',
    title: 'Métricas',
    body: 'Acompanhe aprovações pendentes, ranking agregado e uso por rede. Atualiza ao recarregar.',
    side: 'top',
  },
];
