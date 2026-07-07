import { requireAdmin } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { AdminNav } from '@/components/layout/admin-nav';
import { OnboardingProvider } from '@/lib/onboarding/onboarding-provider';
import { OnboardingHost } from '@/components/onboarding/onboarding-host';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();
  const shouldStart = profile.admin_onboarded_at == null;

  return (
    <OnboardingProvider role="admin" shouldStart={shouldStart}>
      <Header />
      <AdminNav />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">{children}</div>
      <OnboardingHost />
    </OnboardingProvider>
  );
}