import { requireUser } from '@/lib/auth';
import { Header } from '@/components/layout/header';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      <Header />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">{children}</div>
    </>
  );
}
