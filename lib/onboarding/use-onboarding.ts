'use client';

import { createContext, useContext } from 'react';
import type { OnboardingRole, TourStep } from './types';

export interface OnboardingContextValue {
  role: OnboardingRole;
  steps: TourStep[];
  currentStep: number;
  total: number;
  isActive: boolean;
  next: () => void;
  skip: () => void;
}

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within an OnboardingProvider');
  return ctx;
}
