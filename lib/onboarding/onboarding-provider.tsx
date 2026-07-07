'use client';

import * as React from 'react';
import { OnboardingContext, type OnboardingContextValue } from './use-onboarding';
import { getStepsForRole } from './tours';
import type { OnboardingRole } from './types';
import { markOnboarded } from '@/app/actions/onboarding';

interface OnboardingProviderProps {
  role: OnboardingRole;
  shouldStart: boolean;
  children: React.ReactNode;
}

export function OnboardingProvider({ role, shouldStart, children }: OnboardingProviderProps) {
  const steps = React.useMemo(() => getStepsForRole(role), [role]);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isActive, setIsActive] = React.useState(shouldStart);

  const finish = React.useCallback(async () => {
    setIsActive(false);
    await markOnboarded(role);
  }, [role]);

  const next = React.useCallback(() => {
    setCurrentStep((prev) => {
      const isLast = prev >= steps.length - 1;
      if (isLast) {
        void finish();
        return prev;
      }
      setIsActive(true);
      return prev + 1;
    });
  }, [finish, steps.length]);

  const skip = React.useCallback(() => {
    void finish();
  }, [finish]);

  const value: OnboardingContextValue = {
    role,
    steps,
    currentStep,
    total: steps.length,
    isActive,
    next,
    skip,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}
