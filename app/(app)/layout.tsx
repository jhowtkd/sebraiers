import { requireUser } from '@/lib/auth';
import { getCurrentProfile } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { OnboardingProvider } from '@/lib/onboarding/onboarding-provider';
import { OnboardingHost } from '@/components/onboarding/onboarding-host';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const profile = await getCurrentProfile();
  const shouldStart = profile?.onboarded_at == null;

  return (
    <OnboardingProvider role="user" shouldStart={shouldStart}>
      <Header />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">{children}</main>
      <OnboardingHost />
    </OnboardingProvider>
  );
}