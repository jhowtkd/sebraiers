import type { CheckinWithPostSummary } from '@/lib/types';
import type { CheckinEngagement } from '@/lib/queries/checkins';

export type PerformanceTotals = {
  total_points: number;
  approved: number;
  pending: number;
  rejected: number;
};

export type PerformanceDashboard = {
  totalPoints: number;
  weeklyPoints: number;
  streakDays: number;
  totals: PerformanceTotals;
  checkins: CheckinWithPostSummary[];
  engagementMap: Map<string, CheckinEngagement>;
};

export type MyCheckin = CheckinWithPostSummary;
