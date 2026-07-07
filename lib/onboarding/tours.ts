import type { OnboardingRole } from './types';
import { userTourSteps } from './user-tour';
import { adminTourSteps } from './admin-tour';

export type { OnboardingRole, TourStep } from './types';

export function getStepsForRole(role: OnboardingRole) {
  return role === 'user' ? userTourSteps : adminTourSteps;
}
