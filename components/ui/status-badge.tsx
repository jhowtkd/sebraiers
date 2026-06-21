import { Badge } from './badge';
import type { CheckinStatus } from '@/lib/types';

const map: Record<CheckinStatus, { label: string; variant: 'warning' | 'success' | 'error' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  approved: { label: 'Aprovado', variant: 'success' },
  rejected: { label: 'Rejeitado', variant: 'error' },
};

export function StatusBadge({ status }: { status: CheckinStatus }) {
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}