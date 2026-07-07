'use client';

import * as React from 'react';
import { useOnboarding } from '@/lib/onboarding/use-onboarding';
import '@/lib/onboarding/onboarding-theme.css';

export function OnboardingHost() {
  const { steps, currentStep, isActive, next, skip } = useOnboarding();
  const driverRef = React.useRef<unknown>(null);

  React.useEffect(() => {
    if (!isActive) return;

    let cancelled = false;

    (async () => {
      const { driver } = await import('driver.js');
      if (cancelled) return;

      // Destroy any prior driver.
      const prior = driverRef.current as { destroy?: () => void } | null;
      prior?.destroy?.();

      const step = steps[currentStep];
      if (!step) return;

      const d = driver({
        showProgress: true,
        progressText: '{{current}} de {{total}}',
        animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        allowClose: true,
        onDestroyed: () => {
          // User closed via Esc or overlay click — treat as skip.
          void skip();
        },
        onNextClick: () => {
          void next();
        },
        steps: [
          {
            element: step.selector,
            popover: {
              popoverClass: 'sebraiers-tour',
              title: step.title,
              description: step.body,
              side: step.side ?? 'bottom',
              showButtons: ['next'],
              nextBtnText: currentStep === steps.length - 1 ? 'Concluir' : 'Próximo',
            },
          },
        ],
      });

      // Inject "Pular tour" link in the popover footer.
      setTimeout(() => {
        const popover = document.querySelector('.driver-popover.sebraiers-tour');
        if (!popover) return;
        if (popover.querySelector('[data-sebraiers-skip]')) return;
        const footer = popover.querySelector('.driver-popover-footer');
        if (!footer) return;
        const skipBtn = document.createElement('button');
        skipBtn.setAttribute('data-sebraiers-skip', '');
        skipBtn.type = 'button';
        skipBtn.textContent = 'Pular tour';
        skipBtn.addEventListener('click', () => {
          d.destroy();
        });
        footer.prepend(skipBtn);
      }, 0);

      d.drive();
      driverRef.current = d;
    })();

    return () => {
      cancelled = true;
      const prior = driverRef.current as { destroy?: () => void } | null;
      prior?.destroy?.();
    };
  }, [isActive, currentStep, steps, next, skip]);

  return null;
}
