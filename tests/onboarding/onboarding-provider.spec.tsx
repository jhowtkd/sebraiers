import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

// Mock the server action.
const { mockMarkOnboarded } = vi.hoisted(() => ({
  mockMarkOnboarded: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('@/app/actions/onboarding', () => ({
  markOnboarded: mockMarkOnboarded,
}));

import { OnboardingProvider } from '@/lib/onboarding/onboarding-provider';
import { useOnboarding } from '@/lib/onboarding/use-onboarding';

beforeEach(() => {
  vi.clearAllMocks();
  mockMarkOnboarded.mockResolvedValue({ ok: true });
});

describe('useOnboarding', () => {
  it('throws when used outside a provider', () => {
    expect(() => renderHook(() => useOnboarding())).toThrow(/OnboardingProvider/);
  });
});

describe('OnboardingProvider', () => {
  function ReadProbe() {
    const ctx = useOnboarding();
    return (
      <div>
        <span data-testid="total">{ctx.total}</span>
        <span data-testid="current">{ctx.currentStep}</span>
        <span data-testid="active">{ctx.isActive ? 'yes' : 'no'}</span>
        <button data-testid="next" onClick={ctx.next}>next</button>
        <button data-testid="skip" onClick={ctx.skip}>skip</button>
      </div>
    );
  }

  it('renders 5 user steps and starts inactive when shouldStart=false', () => {
    render(
      <OnboardingProvider role="user" shouldStart={false}>
        <ReadProbe />
      </OnboardingProvider>,
    );
    expect(screen.getByTestId('total')).toHaveTextContent('5');
    expect(screen.getByTestId('current')).toHaveTextContent('0');
    expect(screen.getByTestId('active')).toHaveTextContent('no');
  });

  it('advances current step on next()', () => {
    render(
      <OnboardingProvider role="user" shouldStart={false}>
        <ReadProbe />
      </OnboardingProvider>,
    );
    act(() => screen.getByTestId('next').click());
    expect(screen.getByTestId('current')).toHaveTextContent('1');
    expect(screen.getByTestId('active')).toHaveTextContent('yes');
    expect(mockMarkOnboarded).not.toHaveBeenCalled();
  });

  it('calls markOnboarded and deactivates on skip()', async () => {
    render(
      <OnboardingProvider role="user" shouldStart={false}>
        <ReadProbe />
      </OnboardingProvider>,
    );
    await act(async () => screen.getByTestId('skip').click());
    expect(mockMarkOnboarded).toHaveBeenCalledWith('user');
    expect(screen.getByTestId('active')).toHaveTextContent('no');
  });

  it('calls markOnboarded when next() is invoked on the last step', async () => {
    render(
      <OnboardingProvider role="user" shouldStart={false}>
        <ReadProbe />
      </OnboardingProvider>,
    );
    for (let i = 0; i < 5; i++) {
      await act(async () => screen.getByTestId('next').click());
    }
    expect(mockMarkOnboarded).toHaveBeenCalledWith('user');
    expect(mockMarkOnboarded).toHaveBeenCalledTimes(1);
  });

  it('uses admin tour when role=admin', () => {
    render(
      <OnboardingProvider role="admin" shouldStart={false}>
        <ReadProbe />
      </OnboardingProvider>,
    );
    expect(screen.getByTestId('total')).toHaveTextContent('4');
  });
});
